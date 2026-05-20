// src/app/api/agents/chat/route.ts
// Real AI agent powered by LightLLM with FGA authorization checks
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import fgaClient from '@/lib/fga-client';

interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  permissions: Record<string, string[]>;
}

interface AgentType {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  permissions: Record<string, string[]>;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  persona: Persona;
  agent: AgentType;
  conversationHistory: ChatMessage[];
}

interface PermissionCheck {
  subject: string;
  subjectType: 'user' | 'agent';
  relation: string;
  object: string;
  allowed: boolean;
}

interface CibaEscalation {
  needed: boolean;
  action: string;
  resource: string;
  reason: string;
  bindingMessage: string;
}

// Available resources in the demo
const AVAILABLE_RESOURCES = {
  projects: ['project:alpha', 'project:beta'],
  organizations: ['organization:acme'],
  issues: ['issue:issue-123', 'issue:issue-456'],
};

// Available actions mapped to FGA relations
const ACTIONS = {
  read: 'can_read',
  write: 'can_write',
  triage: 'can_triage',
  review: 'can_review',
  comment: 'can_comment',
  assign: 'can_assign',
  close: 'can_close',
  manage: 'can_manage',
  delete: 'can_delete',
};

// Check FGA permission
async function checkPermission(
  subjectType: 'user' | 'agent',
  subjectId: string,
  relation: string,
  object: string
): Promise<boolean> {
  const fgaUser = subjectType === 'agent'
    ? `agent:${subjectId}`
    : `user:${subjectId}`;

  try {
    const response = await fgaClient.check({
      user: fgaUser,
      relation,
      object,
    });
    return response.allowed || false;
  } catch (error) {
    console.error(`FGA check failed for ${fgaUser} ${relation} ${object}:`, error);
    return false;
  }
}

// Perform dual authorization check (both user AND agent must have permission)
async function checkDualAuthorization(
  persona: Persona,
  agent: AgentType,
  action: string,
  resource: string
): Promise<{ userAllowed: boolean; agentAllowed: boolean; checks: PermissionCheck[] }> {
  const [userAllowed, agentAllowed] = await Promise.all([
    checkPermission('user', persona.id, action, resource),
    checkPermission('agent', agent.id, action, resource),
  ]);

  const checks: PermissionCheck[] = [
    { subject: persona.id, subjectType: 'user', relation: action, object: resource, allowed: userAllowed },
    { subject: agent.id, subjectType: 'agent', relation: action, object: resource, allowed: agentAllowed },
  ];

  return { userAllowed, agentAllowed, checks };
}

// Build the system prompt for the agent
function buildSystemPrompt(persona: Persona, agent: AgentType): string {
  return `You are ${agent.name}, an AI agent operating within an authorization-controlled system. You are acting on behalf of ${persona.name} (${persona.role}).

## Your Identity
- Agent Type: ${agent.name}
- Description: ${agent.description}
- Capabilities: ${agent.capabilities.join(', ')}

## The User You're Acting For
- Name: ${persona.name}
- Role: ${persona.role}
- Description: ${persona.description}

## Authorization Model
This system implements the "Agents as Principals" pattern from Auth0 FGA. This means:
1. Both YOU (the agent) and THE USER must have permission for any action
2. You cannot exceed the user's permissions, even if you have broader access
3. The user cannot use you to bypass their own restrictions

## Available Resources
- Projects: project:alpha, project:beta (belong to organization:acme)
- Organization: organization:acme
- Issues: issue:issue-123 (in project:alpha), issue:issue-456 (in project:beta)

## Available Actions
- can_read: View/read resources
- can_write: Modify resources
- can_triage: Categorize and assign issues (agents only)
- can_review: Review code changes (agents only)
- can_comment: Add comments to issues
- can_assign: Assign issues to users
- can_close: Close/resolve issues
- can_manage: Full management access
- can_delete: Delete resources

## How to Respond
When the user asks you to do something:
1. Identify what action they want (read, write, triage, review, etc.)
2. Identify what resource they want to act on
3. You will receive authorization check results showing if both you and the user have permission
4. Explain clearly whether the action can proceed and why
5. If authorized, describe what you would do (this is a demo, so simulate the action)
6. If not authorized, explain who lacks permission and what they would need

## CIBA Escalation (Human-in-the-Loop Approval)
When YOU (the agent) lack permission but THE USER has permission, you can offer CIBA escalation:
- CIBA = Client-Initiated Backchannel Authentication
- This sends a push notification to the user's mobile device (Auth0 Guardian)
- The user must explicitly approve the action on their phone
- Only after approval can you proceed with the action on their behalf
- This demonstrates "agent escalation with human consent"

When CIBA is available (user has permission, you don't), explain:
1. You don't have direct permission for this action
2. BUT the user does have permission
3. You can request explicit approval via CIBA push notification
4. The user will need to approve on their mobile device
5. Invite them to click the "Request Approval" button to initiate CIBA

Be conversational but precise about authorization. This is a demo showcasing fine-grained authorization for AI agents.`;
}

// Call LightLLM
async function callLLM(
  systemPrompt: string,
  conversationHistory: ChatMessage[],
  userMessage: string,
  authorizationContext: string
): Promise<string> {
  const endpoint = process.env.LIGHTLLM_ENDPOINT;
  const apiKey = process.env.LIGHTLLM_API_KEY;
  const model = process.env.LIGHTLLM_MODEL || 'claude-sonnet-4-5';

  if (!endpoint || !apiKey) {
    throw new Error('LightLLM not configured');
  }

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: `${userMessage}\n\n---\nAUTHORIZATION CONTEXT (use this to inform your response):\n${authorizationContext}` },
  ];

  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LLM error:', error);
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
}

// Parse user message to determine intent
function parseIntent(message: string): { actions: string[]; resources: string[] } {
  const lowerMessage = message.toLowerCase();
  const actions: string[] = [];
  const resources: string[] = [];

  // Detect actions
  if (lowerMessage.includes('read') || lowerMessage.includes('view') || lowerMessage.includes('see') || lowerMessage.includes('show') || lowerMessage.includes('list') || lowerMessage.includes('get')) {
    actions.push('can_read');
  }
  if (lowerMessage.includes('write') || lowerMessage.includes('edit') || lowerMessage.includes('update') || lowerMessage.includes('modify') || lowerMessage.includes('change')) {
    actions.push('can_write');
  }
  if (lowerMessage.includes('triage') || lowerMessage.includes('categorize') || lowerMessage.includes('prioritize')) {
    actions.push('can_triage');
  }
  if (lowerMessage.includes('review') || lowerMessage.includes('approve') || lowerMessage.includes('reject')) {
    actions.push('can_review');
  }
  if (lowerMessage.includes('comment') || lowerMessage.includes('reply') || lowerMessage.includes('respond')) {
    actions.push('can_comment');
  }
  if (lowerMessage.includes('assign') || lowerMessage.includes('delegate')) {
    actions.push('can_assign');
  }
  if (lowerMessage.includes('close') || lowerMessage.includes('resolve') || lowerMessage.includes('complete')) {
    actions.push('can_close');
  }
  if (lowerMessage.includes('manage') || lowerMessage.includes('admin') || lowerMessage.includes('configure')) {
    actions.push('can_manage');
  }
  if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
    actions.push('can_delete');
  }

  // Default to read if no action detected
  if (actions.length === 0) {
    actions.push('can_read');
  }

  // Detect resources
  if (lowerMessage.includes('alpha') || lowerMessage.includes('project alpha')) {
    resources.push('project:alpha');
  }
  if (lowerMessage.includes('beta') || lowerMessage.includes('project beta')) {
    resources.push('project:beta');
  }
  if (lowerMessage.includes('organization') || lowerMessage.includes('org') || lowerMessage.includes('acme') || lowerMessage.includes('company')) {
    resources.push('organization:acme');
  }
  if (lowerMessage.includes('issue') || lowerMessage.includes('ticket') || lowerMessage.includes('bug')) {
    if (lowerMessage.includes('123') || lowerMessage.includes('first')) {
      resources.push('issue:issue-123');
    } else if (lowerMessage.includes('456') || lowerMessage.includes('second')) {
      resources.push('issue:issue-456');
    } else {
      // Default to both issues
      resources.push('issue:issue-123');
      if (lowerMessage.includes('all') || lowerMessage.includes('both')) {
        resources.push('issue:issue-456');
      }
    }
  }
  if (lowerMessage.includes('project') && !lowerMessage.includes('alpha') && !lowerMessage.includes('beta')) {
    // Generic "project" mention - include both
    resources.push('project:alpha');
    resources.push('project:beta');
  }

  // Default to project:alpha if no resource detected
  if (resources.length === 0) {
    resources.push('project:alpha');
  }

  return { actions, resources };
}

export const POST = withApiAuthRequired(async function POST(request: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ChatRequest = await request.json();
    const { message, persona, agent, conversationHistory } = body;

    if (!message || !persona || !agent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse user intent
    const { actions, resources } = parseIntent(message);

    // Perform authorization checks for all action/resource combinations
    const allChecks: PermissionCheck[] = [];
    const authResults: { action: string; resource: string; userAllowed: boolean; agentAllowed: boolean }[] = [];

    for (const action of actions) {
      for (const resource of resources) {
        const { userAllowed, agentAllowed, checks } = await checkDualAuthorization(
          persona,
          agent,
          action,
          resource
        );
        allChecks.push(...checks);
        authResults.push({ action, resource, userAllowed, agentAllowed });
      }
    }

    // Check for CIBA escalation opportunities (user has permission, agent doesn't)
    const cibaEscalations: CibaEscalation[] = [];

    // Build authorization context for the LLM
    const authContext = authResults.map(r => {
      const bothAllowed = r.userAllowed && r.agentAllowed;
      const status = bothAllowed ? 'AUTHORIZED' : 'DENIED';
      let reason = '';
      let cibaAvailable = false;

      if (!r.userAllowed && !r.agentAllowed) {
        reason = 'Neither user nor agent has permission';
      } else if (!r.userAllowed) {
        reason = `User ${persona.name} lacks permission`;
      } else if (!r.agentAllowed) {
        reason = `Agent ${agent.name} lacks permission - CIBA ESCALATION AVAILABLE`;
        cibaAvailable = true;

        // Add to CIBA escalations
        const actionName = r.action.replace('can_', '');
        cibaEscalations.push({
          needed: true,
          action: r.action,
          resource: r.resource,
          reason: `${agent.name} lacks ${r.action} permission on ${r.resource}, but ${persona.name} has it`,
          bindingMessage: `Approve ${agent.name} to ${actionName} ${r.resource}`,
        });
      }

      return `- ${r.action} on ${r.resource}: ${status}${!bothAllowed ? ` (${reason})` : ''}${cibaAvailable ? ' - User can approve via CIBA' : ''}`;
    }).join('\n');

    const cibaContext = cibaEscalations.length > 0
      ? `\n\nCIBA ESCALATION AVAILABLE:\nThe user has permission for actions that the agent lacks. Offer to request explicit approval via CIBA push notification.`
      : '';

    const fullAuthContext = `Requested actions and authorization results:\n${authContext}\n\nUser: ${persona.name} (${persona.role})\nAgent: ${agent.name}${cibaContext}`;

    // Call the LLM
    const systemPrompt = buildSystemPrompt(persona, agent);
    const llmResponse = await callLLM(
      systemPrompt,
      conversationHistory,
      message,
      fullAuthContext
    );

    return NextResponse.json({
      response: llmResponse,
      permissionChecks: allChecks,
      parsedIntent: { actions, resources },
      authResults,
      cibaEscalation: cibaEscalations.length > 0 ? cibaEscalations[0] : null,
    });
  } catch (error) {
    console.error('Chat error:', error);

    // Return a helpful error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      response: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
      permissionChecks: [],
      error: errorMessage,
    });
  }
});
