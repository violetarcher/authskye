// MCP Server — JSON-RPC 2.0 over HTTP
// Auth: Bearer token validated via Auth0 JWKS
// Authorization: FGA gates tool discovery (tools/list) and tool execution (tools/call)
import { validateMcpToken, tokenHasScope, TOOL_SCOPES } from '@/lib/mcp-token-validator';
import { checkPermission, listObjects, formatUserId, formatToolId } from '@/lib/fga-service';
import fgaClient, { isFgaAvailable } from '@/lib/fga-client';

const SERVER_INFO = {
  name: 'rxnational-mcp-server',
  version: '1.0.0',
};

const ALL_TOOLS = [
  {
    name: 'list_projects',
    description: 'List projects you have access to',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_issue',
    description: 'Get details of a specific issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'string',
          description: 'Issue ID (e.g. "issue-123")',
          enum: ['issue-123', 'issue-456'],
        },
      },
      required: ['issue_id'],
    },
  },
  {
    name: 'comment_on_issue',
    description: 'Add a comment to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'string',
          description: 'Issue ID (e.g. "issue-123")',
          enum: ['issue-123', 'issue-456'],
        },
        comment: {
          type: 'string',
          description: 'Comment text to add',
        },
      },
      required: ['issue_id', 'comment'],
    },
  },
];

// Simulated data store
const ISSUE_DATA: Record<string, object> = {
  'issue-123': { id: 'issue-123', title: 'Login page crashes on mobile', project: 'project:alpha', status: 'open', priority: 'high' },
  'issue-456': { id: 'issue-456', title: 'Add dark mode support', project: 'project:beta', status: 'open', priority: 'medium' },
};

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function rpcSuccess(id: JsonRpcRequest['id'], result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result });
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string, data?: unknown) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message, data } });
}

// GET — MCP server discovery / WWW-Authenticate hint
export function GET() {
  const baseUrl = process.env.AUTH0_BASE_URL;
  const domain = process.env.AUTH0_MGMT_DOMAIN;

  return new Response(null, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Bearer realm="${baseUrl}/api/mcp", as_uri="https://${domain}"`,
    },
  });
}

export async function POST(request: Request) {
  // Validate bearer token
  let userId: string;
  let tokenPayload: Awaited<ReturnType<typeof validateMcpToken>>;
  try {
    tokenPayload = await validateMcpToken(request.headers.get('Authorization'));
    userId = tokenPayload.sub;
  } catch (err) {
    const baseUrl = process.env.AUTH0_BASE_URL;
    const domain = process.env.AUTH0_MGMT_DOMAIN;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="${baseUrl}/api/mcp", as_uri="https://${domain}"`,
      },
    });
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }

  const { id, method, params = {} } = body;

  if (method === 'initialize') {
    return rpcSuccess(id, {
      protocolVersion: '2024-11-05',
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
    });
  }

  if (method === 'notifications/initialized') {
    return rpcSuccess(id, {});
  }

  if (method === 'tools/list') {
    const agentId = params._agent_id as string | undefined;

    // Layer 1: filter by OAuth scope (client-level)
    const scopeFiltered = ALL_TOOLS.filter(t => {
      const required = TOOL_SCOPES[t.name];
      return !required || tokenHasScope(tokenPayload, required);
    });

    if (!isFgaAvailable()) {
      return rpcSuccess(id, { tools: scopeFiltered });
    }

    // Layer 2: user FGA can_call
    const accessibleObjects = await listObjects(formatUserId(userId), 'can_call', 'mcp_tool');
    const userToolNames = new Set(accessibleObjects.map(o => o.replace('mcp_tool:', '')));
    const userTools = scopeFiltered.filter(t => userToolNames.has(t.name));

    // Layer 3: annotate with agent access if agent specified
    if (agentId) {
      const agentObjects = await listObjects(`agent:${agentId}`, 'can_call', 'mcp_tool');
      const agentToolNames = new Set(agentObjects.map(o => o.replace('mcp_tool:', '')));
      const annotated = userTools.map(t => ({ ...t, agent_allowed: agentToolNames.has(t.name) }));
      return rpcSuccess(id, { tools: annotated });
    }

    return rpcSuccess(id, { tools: userTools });
  }

  if (method === 'tools/call') {
    const toolName = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, string>;
    const agentId = params._agent_id as string | undefined;

    if (!toolName) {
      return rpcError(id, -32602, 'Missing tool name');
    }

    const toolDef = ALL_TOOLS.find(t => t.name === toolName);
    if (!toolDef) {
      return rpcError(id, -32602, `Unknown tool: ${toolName}`);
    }

    // Layer 1: OAuth scope check
    const requiredScope = TOOL_SCOPES[toolName];
    if (requiredScope && !tokenHasScope(tokenPayload, requiredScope)) {
      return rpcError(id, -32003, `Insufficient scope: ${requiredScope} required`, {
        scope_check: { required: requiredScope, granted: tokenPayload.scope ?? '', allowed: false },
      });
    }

    const fgaChecks: FgaCheckResult[] = [];

    if (isFgaAvailable()) {
      // Layer 2: user FGA can_call
      const userAllowed = await checkPermission(formatUserId(userId), 'can_call', formatToolId(toolName));
      fgaChecks.push({ subject: formatUserId(userId), relation: 'can_call', object: formatToolId(toolName), allowed: userAllowed });

      // Layer 3: agent FGA can_call (dual authorization)
      if (agentId) {
        const agentAllowed = await checkPermission(`agent:${agentId}`, 'can_call', formatToolId(toolName));
        fgaChecks.push({ subject: `agent:${agentId}`, relation: 'can_call', object: formatToolId(toolName), allowed: agentAllowed });

        if (!userAllowed || !agentAllowed) {
          const denier = !userAllowed ? formatUserId(userId) : `agent:${agentId}`;
          return rpcError(id, -32003, `Permission denied: ${denier} does not have can_call on ${formatToolId(toolName)}`, { _fga: fgaChecks });
        }
      } else if (!userAllowed) {
        return rpcError(id, -32003, `Permission denied: ${formatUserId(userId)} does not have can_call on ${formatToolId(toolName)}`, { _fga: fgaChecks });
      }
    }

    // Execute tool
    try {
      const result = await executeTool(toolName, args, userId) as Record<string, unknown>;
      const _fga = [...fgaChecks, ...((result._fga as object[]) ?? [])];
      const { _fga: _dropped, ...data } = result;
      return rpcSuccess(id, { content: [{ type: 'text', text: JSON.stringify({ ...data, _fga }, null, 2) }] });
    } catch (err) {
      if (err instanceof FgaError) {
        return rpcError(id, -32003, err.message, { _fga: [...fgaChecks, err.check] });
      }
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      return rpcError(id, -32603, message);
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}

interface FgaCheckResult {
  subject: string;
  relation: string;
  object: string;
  allowed: boolean;
}

class FgaError extends Error {
  check: FgaCheckResult;
  constructor(message: string, check: FgaCheckResult) {
    super(message);
    this.check = check;
  }
}

async function executeTool(name: string, args: Record<string, string>, userId: string): Promise<Record<string, unknown>> {
  const subject = formatUserId(userId);

  if (name === 'list_projects') {
    const projects = ['project:alpha', 'project:beta'];
    if (!isFgaAvailable()) {
      return { projects };
    }
    const checks: FgaCheckResult[] = [];
    const accessible: string[] = [];
    for (const project of projects) {
      const allowed = await checkPermission(subject, 'can_read', project);
      checks.push({ subject, relation: 'can_read', object: project, allowed });
      if (allowed) accessible.push(project);
    }
    return { projects: accessible, _fga: checks };
  }

  if (name === 'get_issue') {
    const issueId = args.issue_id;
    if (!issueId) throw new Error('issue_id is required');
    const fgaObject = `issue:${issueId}`;
    if (isFgaAvailable()) {
      const allowed = await checkPermission(subject, 'can_read', fgaObject);
      if (!allowed) throw new FgaError(`Permission denied: cannot read ${fgaObject}`, { subject, relation: 'can_read', object: fgaObject, allowed: false });
      const issue = ISSUE_DATA[issueId];
      if (!issue) throw new Error(`Issue not found: ${issueId}`);
      return { ...issue as object, _fga: [{ subject, relation: 'can_read', object: fgaObject, allowed: true }] };
    }
    const issue = ISSUE_DATA[issueId];
    if (!issue) throw new Error(`Issue not found: ${issueId}`);
    return issue as Record<string, unknown>;
  }

  if (name === 'comment_on_issue') {
    const issueId = args.issue_id;
    const comment = args.comment;
    if (!issueId || !comment) throw new Error('issue_id and comment are required');
    const fgaObject = `issue:${issueId}`;
    if (isFgaAvailable()) {
      const allowed = await checkPermission(subject, 'can_comment', fgaObject);
      if (!allowed) throw new FgaError(`Permission denied: cannot comment on ${fgaObject}`, { subject, relation: 'can_comment', object: fgaObject, allowed: false });
    }
    return {
      success: true,
      issue_id: issueId,
      comment,
      posted_by: userId,
      posted_at: new Date().toISOString(),
      _fga: [{ subject, relation: 'can_comment', object: fgaObject, allowed: true }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
