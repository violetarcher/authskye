'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plug,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Code,
  Key,
  LogOut,
  RefreshCw,
  Play,
  FileJson,
  Bot,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface ToolDef {
  name: string;
  description: string;
  agent_allowed?: boolean;
  inputSchema: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

const MCP_AGENTS = [
  { id: 'reporting-bot', name: 'Reporting Bot', note: 'Read only' },
  { id: 'triage-bot', name: 'Triage Bot', note: 'No commenting' },
  { id: 'support-agent', name: 'Support Agent', note: 'No project listing' },
];

// One-click prompts for the OBO chat demo — same vendors/amounts as the
// billing-form.tsx PO demo data, for consistency.
const SUGGESTED_PO_PROMPTS = [
  'Submit a PO for Acme Supply Co for $4250',
  'Submit a PO for TechDist Inc for $15800',
  'Submit a PO for Vendor Co for $620',
];

interface ToolResult {
  toolName: string;
  request: object;
  response: object;
  fgaDenied: boolean;
  durationMs: number;
}

// Generate PKCE code_verifier and code_challenge using Web Crypto API
async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}

export default function McpDemoPage() {
  const [mcpConfig, setMcpConfig] = useState<{ auth0Domain: string; audience: string; baseUrl: string } | null>(null);
  const [cimdUrl, setCimdUrl] = useState<string>('');
  const [cimdDoc, setCimdDoc] = useState<object | null>(null);
  const [isLoadingCimd, setIsLoadingCimd] = useState(false);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenSub, setTokenSub] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [tokenClaims, setTokenClaims] = useState<Record<string, unknown> | null>(null);

  const [tools, setTools] = useState<ToolDef[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [selectedAgent, setSelectedAgent] = useState<string>(MCP_AGENTS[0].id);
  const [isInvoking, setIsInvoking] = useState(false);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);

  // Dedicated OBO simulation — separate from the generic tool console above.
  // The acting agent is NOT chosen here; it's determined by Auth0 (Agents as
  // Principal) based on which client performs the token exchange, and shows
  // up as the act.sub claim on the exchanged token — see the Exchange Log.
  const [isSimulatingObo, setIsSimulatingObo] = useState(false);
  const [oboResult, setOboResult] = useState<{ response: Record<string, unknown>; durationMs: number } | null>(null);
  const [oboChatInput, setOboChatInput] = useState('');
  const [oboChatMessages, setOboChatMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: 'Hi, I\'m the Procurement Agent. Ask me to submit a purchase order — e.g. "Submit a PO for Acme Supply Co for $1500" — and I\'ll handle it on your behalf.' },
  ]);
  const oboChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    oboChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [oboChatMessages, isSimulatingObo]);

  // Load CIMD doc, config, and restore token from sessionStorage on mount
  useEffect(() => {
    fetch('/api/mcp/config')
      .then(r => r.json())
      .then(cfg => setMcpConfig(cfg))
      .catch(() => {});

    const origin = window.location.origin;
    const url = `${origin}/api/mcp-client-metadata`;
    setCimdUrl(url);

    setIsLoadingCimd(true);
    fetch(url)
      .then(r => r.json())
      .then(doc => setCimdDoc(doc))
      .catch(() => {})
      .finally(() => setIsLoadingCimd(false));

    const stored = sessionStorage.getItem('mcp_access_token');
    const expiresAt = sessionStorage.getItem('mcp_token_expires_at');
    if (stored) {
      setAccessToken(stored);
      if (expiresAt) setTokenExpiresAt(Number(expiresAt));

      // Decode JWT payload client-side (no verification needed for display)
      try {
        const payload = JSON.parse(atob(stored.split('.')[1]));
        setTokenSub(payload.sub ?? null);
        setTokenClaims(payload);
      } catch {}
    }
  }, []);

  // When token is set, fetch tools
  const fetchTools = useCallback(async (token: string, agentId?: string) => {
    setIsLoadingTools(true);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: agentId ? { _agent_id: agentId } : {} }),
      });
      const data = await res.json();
      if (data.result?.tools) {
        setTools(data.result.tools);
        if (data.result.tools.length > 0) {
          setSelectedTool(data.result.tools[0].name);
        }
      }
    } catch (err) {
      toast.error('Failed to fetch tools');
    } finally {
      setIsLoadingTools(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) fetchTools(accessToken, selectedAgent);
  }, [accessToken, selectedAgent, fetchTools]);

  const handleConnect = async () => {
    if (!mcpConfig) {
      toast.error('MCP config not loaded yet');
      return;
    }

    const { verifier, challenge } = await generatePkce();

    sessionStorage.setItem('mcp_pkce_verifier', verifier);
    sessionStorage.setItem('mcp_client_id', cimdUrl);

    const domain = mcpConfig.auth0Domain;
    const audience = mcpConfig.audience;
    const redirectUri = `${window.location.origin}/mcp/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cimdUrl,
      redirect_uri: redirectUri,
      scope: 'openid profile email mcp:list_projects mcp:get_issue mcp:comment_on_issue',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'consent',
      ...(audience ? { audience } : {}),
    });

    const authorizeUrl = `https://${domain}/authorize?${params}`;
    console.log('[MCP] Authorize URL:', authorizeUrl);
    window.location.href = authorizeUrl;
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('mcp_access_token');
    sessionStorage.removeItem('mcp_token_expires_at');
    sessionStorage.removeItem('mcp_client_id');
    setAccessToken(null);
    setTokenSub(null);
    setTokenExpiresAt(null);
    setTools([]);
    setLastResult(null);
  };

  const handleInvokeTool = async () => {
    if (!selectedTool || !accessToken) return;
    setIsInvoking(true);

    const request = {
      jsonrpc: '2.0' as const,
      id: Date.now(),
      method: 'tools/call',
      params: { name: selectedTool, arguments: toolArgs, _agent_id: selectedAgent || undefined },
    };

    const start = Date.now();
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });
      const response = await res.json();
      const durationMs = Date.now() - start;
      const fgaDenied = !!response.error && (
        response.error.code === -32003 ||
        String(response.error.message ?? '').includes('Permission denied')
      );

      setLastResult({ toolName: selectedTool, request, response, fgaDenied, durationMs });
    } catch (err) {
      toast.error('Tool invocation failed');
    } finally {
      setIsInvoking(false);
    }
  };

  // Very deliberately NOT an LLM call — this is a small rule-based parser
  // just to pull vendor/amount out of a chat-style request. The point of this
  // demo is the OBO exchange, not conversational NLU; a real integration
  // would replace this with an actual agent/LLM turning the request into a
  // tool call.
  function parsePurchaseOrderRequest(message: string): { vendor: string; amount: string } | null {
    const match = message.match(
      /(?:purchase order|po|payment|order|transaction)\s+(?:for|to)\s+([A-Za-z0-9&.,'\- ]+?)\s+(?:for|of|at)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i
    );
    if (!match) return null;
    return { vendor: match[1].trim(), amount: match[2].replace(/,/g, '') };
  }

  // Calls submit_purchase_order using the *current* MCP access token — which
  // intentionally does not carry transaction:pay — so the MCP server has to
  // perform an on-behalf-of exchange to reach the downstream billing API.
  // This never appears in the generic tool console above. Returns a plain-
  // language summary for the chat, and separately stores the full response
  // for the Exchange Log panel.
  const handleSimulateObo = async (vendor: string, amount: string): Promise<string> => {
    if (!accessToken) return "I'm not connected to the MCP server yet — connect first (Panel 1).";
    setIsSimulatingObo(true);

    const request = {
      jsonrpc: '2.0' as const,
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'submit_purchase_order',
        arguments: { vendor, amount },
      },
    };

    const start = Date.now();
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });
      const response = await res.json();
      setOboResult({ response, durationMs: Date.now() - start });

      if (response?.result) {
        try {
          const content = (response.result as { content: { text: string }[] })?.content?.[0]?.text;
          const parsed = content ? JSON.parse(content) : {};
          const oboLog = parsed._obo ?? [];
          const agentId = oboLog.find((e: { step: string }) => e.step === 'exchange_success')?.acting_agent_id;
          return `Done — submitted the PO to ${vendor} for $${amount}. Confirmation: ${parsed.claimId ?? 'n/a'}.${agentId ? ` Acting agent: ${agentId}.` : ''} See the Exchange Log on the right for the full delegation chain.`;
        } catch {
          return `Done — submitted the PO to ${vendor} for $${amount}. See the Exchange Log on the right for details.`;
        }
      }

      const errMsg = (response?.error as { message?: string })?.message ?? 'an unknown error';
      return `That didn't go through: ${errMsg}. Check the Exchange Log on the right for details.`;
    } catch (err) {
      return 'Something went wrong reaching the MCP server.';
    } finally {
      setIsSimulatingObo(false);
    }
  };

  const handleChatSend = async (explicitMessage?: string) => {
    const message = (explicitMessage ?? oboChatInput).trim();
    if (!message || isSimulatingObo) return;
    setOboChatInput('');
    setOboChatMessages(prev => [...prev, { role: 'user', text: message }]);

    const parsed = parsePurchaseOrderRequest(message);
    if (!parsed) {
      setOboChatMessages(prev => [...prev, {
        role: 'agent',
        text: 'I couldn\'t catch the vendor and amount — try something like "Submit a PO for Acme Supply Co for $1500".',
      }]);
      return;
    }

    setOboChatMessages(prev => [...prev, {
      role: 'agent',
      text: `Got it — a purchase order to ${parsed.vendor} for $${parsed.amount}. My token doesn't have transaction:pay, so I need to exchange it on your behalf first (on-behalf-of, RFC 8693)...`,
    }]);

    const summary = await handleSimulateObo(parsed.vendor, parsed.amount);
    setOboChatMessages(prev => [...prev, { role: 'agent', text: summary }]);
  };

  const selectedToolDef = tools.find(t => t.name === selectedTool);
  const isTokenExpired = tokenExpiresAt ? Date.now() > tokenExpiresAt : false;
  const isConnected = !!accessToken && !isTokenExpired;

  return (
    <div className="space-y-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="h-6 w-6" />
          Auth for MCP
        </h1>
        <p className="text-sm text-muted-foreground">
          Auth for MCP — CIMD client registration + FGA-gated tool access
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: Auth Flow */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              1. Client Registration (CIMD)
            </CardTitle>
            <CardDescription className="text-xs">
              Auth0 fetches this URL to identify the MCP client — no pre-registration needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {/* CIMD URL */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">CIMD URL (acts as client_id)</Label>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">{cimdUrl || '...'}</code>
              </div>
            </div>

            {/* CIMD doc preview */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FileJson className="h-3 w-3" />
                Metadata document
              </Label>
              {isLoadingCimd ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : cimdDoc ? (
                <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-40 leading-relaxed">
                  {JSON.stringify(cimdDoc, null, 2)}
                </pre>
              ) : null}
            </div>

            <Separator />

            {/* Connect / disconnect */}
            {!isConnected ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Click Connect to start the PKCE flow. Auth0 will fetch the CIMD doc above to register the client, then show a consent screen.
                </p>
                <Button
                  className="w-full"
                  onClick={handleConnect}
                  disabled={!cimdUrl}
                >
                  <Plug className="h-4 w-4 mr-2" />
                  Connect MCP Client
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">Token subject:</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{tokenSub}</code>
                </div>
                {tokenExpiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(tokenExpiresAt).toLocaleTimeString()}
                  </p>
                )}
                {tokenClaims && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Token claims:</p>
                    <div className="text-[10px] font-mono space-y-0.5">
                      <div>
                        <span className="text-muted-foreground">scope: </span>
                        {typeof tokenClaims.scope === 'string' && tokenClaims.scope
                          ? <span className="text-green-600">{tokenClaims.scope}</span>
                          : <span className="text-red-500">(none)</span>}
                      </div>
                      <div><span className="text-muted-foreground">aud: </span>{JSON.stringify(tokenClaims.aud)}</div>
                      <div><span className="text-muted-foreground">azp: </span>{String(tokenClaims.azp ?? '—')}</div>
                    </div>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={handleDisconnect}>
                  <LogOut className="h-3 w-3 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Available Tools */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              2. FGA Tool Authorization
            </CardTitle>
            <CardDescription className="text-xs">
              tools/list returns only tools the token subject has can_call permission for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {!isConnected ? (
              <p className="text-xs text-muted-foreground">Connect first to see available tools.</p>
            ) : isLoadingTools ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Fetching tools via tools/list...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {['list_projects', 'get_issue', 'comment_on_issue'].map(toolName => {
                    const toolDef = tools.find(t => t.name === toolName);
                    const userHasAccess = !!toolDef;
                    const agentHasAccess = toolDef?.agent_allowed ?? false;
                    const scopeName = `mcp:${toolName}`;
                    let hasScope = false;
                    try {
                      const stored = sessionStorage.getItem('mcp_access_token');
                      if (stored) {
                        const payload = JSON.parse(atob(stored.split('.')[1]));
                        const perms: string[] = payload.permissions ?? [];
                        const scopes: string[] = (payload.scope ?? '').split(' ');
                        hasScope = perms.includes(scopeName) || scopes.includes(scopeName);
                      }
                    } catch {}

                    return (
                      <div key={toolName} className="py-1.5 border-b last:border-0 space-y-1">
                        <code className="text-xs font-mono">{toolName}</code>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className={`text-[10px] ${hasScope ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {hasScope ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <XCircle className="h-2.5 w-2.5 mr-1" />}
                            {scopeName}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] ${userHasAccess ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {userHasAccess ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <XCircle className="h-2.5 w-2.5 mr-1" />}
                            user can_call
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] ${agentHasAccess ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {agentHasAccess ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <XCircle className="h-2.5 w-2.5 mr-1" />}
                            agent can_call
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => accessToken && fetchTools(accessToken)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <div className="bg-muted/50 rounded p-2 text-[10px] text-muted-foreground font-mono">
                  tools/list → scope check → FGA can_call
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: Tool Invocation */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="h-4 w-4" />
              3. Invoke Tool
            </CardTitle>
            <CardDescription className="text-xs">
              FGA checks can_call + resource-level permissions on each call
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-3 min-h-0">
            {!isConnected || tools.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {!isConnected ? 'Connect first.' : 'No accessible tools — check FGA tuples.'}
              </p>
            ) : (
              <>
                {/* Controls — compact, fixed height */}
                <div className="space-y-2 flex-shrink-0">
                  <div className="space-y-1">
                    <Label className="text-xs">Acting Agent</Label>
                    <Select value={selectedAgent} onValueChange={val => { setSelectedAgent(val); setLastResult(null); if (accessToken) fetchTools(accessToken, val); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MCP_AGENTS.map(a => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            <span>{a.name}</span>
                            <span className="ml-2 text-muted-foreground text-[10px]">({a.note})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tool</Label>
                    <Select value={selectedTool} onValueChange={val => { setSelectedTool(val); setToolArgs({}); setLastResult(null); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* submit_purchase_order is deliberately not offered here — it's simulated
                            via the dedicated OBO section below, not the generic tool console */}
                        {tools.filter(t => t.name !== 'submit_purchase_order').map(t => (
                          <SelectItem key={t.name} value={t.name} className="text-xs">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedToolDef && Object.entries(selectedToolDef.inputSchema.properties).map(([argName, argDef]) => (
                    <div key={argName} className="space-y-1">
                      <Label className="text-xs">{argName}</Label>
                      {argDef.enum ? (
                        <Select
                          value={toolArgs[argName] ?? ''}
                          onValueChange={val => setToolArgs(prev => ({ ...prev, [argName]: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={`Select ${argName}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {argDef.enum.map(v => (
                              <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-8 text-xs"
                          placeholder={argDef.description}
                          value={toolArgs[argName] ?? ''}
                          onChange={e => setToolArgs(prev => ({ ...prev, [argName]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}

                  <Button className="w-full" size="sm" onClick={handleInvokeTool} disabled={isInvoking}>
                    {isInvoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    tools/call
                  </Button>
                </div>

                {/* Result — fills remaining space */}
                <div className="flex-1 flex flex-col min-h-0">
                  {isInvoking ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : lastResult ? (() => {
                    // Parse _fga checks from result or error data
                    type FgaCheck = { subject: string; relation: string; object: string; allowed: boolean };
                    let fgaChecks: FgaCheck[] = [];
                    let displayResponse: unknown = lastResult.response;

                    const resp = lastResult.response as Record<string, unknown>;
                    if (!lastResult.fgaDenied && resp?.result) {
                      try {
                        const content = (resp.result as { content: { text: string }[] })?.content?.[0]?.text;
                        if (content) {
                          const parsed = JSON.parse(content);
                          fgaChecks = parsed._fga ?? [];
                          const { _fga, ...rest } = parsed;
                          displayResponse = { ...resp, result: { content: [{ type: 'text', text: JSON.stringify(rest, null, 2) }] } };
                        }
                      } catch {}
                    } else if (lastResult.fgaDenied && resp?.error) {
                      fgaChecks = ((resp.error as { data?: { _fga?: FgaCheck[] } })?.data?._fga) ?? [];
                    }

                    return (
                      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden min-h-0">
                        {/* FGA checks section */}
                        {fgaChecks.length > 0 && (
                          <div className="flex-shrink-0 border-b bg-muted/20 px-3 py-2 space-y-1 overflow-y-auto max-h-32">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">FGA Checks</p>
                            {fgaChecks.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                                {c.allowed
                                  ? <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  : <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                                <span className="text-muted-foreground">{c.subject}</span>
                                <span className="font-semibold">{c.relation}</span>
                                <span className="text-muted-foreground">{c.object}</span>
                                <span className={`ml-auto font-semibold ${c.allowed ? 'text-green-600' : 'text-red-600'}`}>
                                  {c.allowed ? 'ALLOW' : 'DENY'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Denial banner */}
                        {lastResult.fgaDenied && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white flex-shrink-0">
                            <XCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs font-semibold">Permission Denied</span>
                            <span className="ml-auto text-[10px] opacity-75">{lastResult.durationMs}ms</span>
                          </div>
                        )}
                        {/* Response body — neutral */}
                        <pre className="flex-1 text-[10px] font-mono p-3 overflow-auto leading-relaxed bg-background text-foreground">
                          {JSON.stringify(displayResponse, null, 2)}
                        </pre>
                      </div>
                    );
                  })() : (
                    <div className="flex-1 flex items-center justify-center border rounded-lg border-dashed">
                      <p className="text-xs text-muted-foreground">Response will appear here</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel 4: OBO Token Exchange — full width, deliberately separate from the
          generic tool console above. This represents a request that would
          realistically come from an agent, not a manual tool invocation. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            4. On-Behalf-Of (OBO) Token Exchange
          </CardTitle>
          <CardDescription className="text-xs">
            Triggers a request that needs a downstream scope (<code className="text-[10px]">transaction:pay</code> on <code className="text-[10px]">https://transactions.demo.com</code>) that the current MCP-scoped token does not carry. Auth0 exchanges it on your behalf (RFC 8693) using a registered Agent identity (Agents as Principal) — watch <code className="text-[10px]">act.sub</code> below — then calls the real <code className="text-[10px]">/api/billing/submit</code> endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-xs text-muted-foreground">Connect first (Panel 1) to simulate an agent OBO request.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: chat with the simulated agent */}
              <div className="space-y-3">
                <div className="bg-muted/50 rounded p-3 text-xs space-y-1">
                  <p className="font-medium">Current MCP token scope:</p>
                  <code className="text-[10px] block break-all text-muted-foreground">
                    {typeof tokenClaims?.scope === 'string' && tokenClaims.scope ? tokenClaims.scope : '(none)'}
                  </code>
                  <p className="text-muted-foreground pt-1">
                    No <code className="text-[10px]">transaction:pay</code> here — that scope only ever appears on the exchanged token, never on this one.
                  </p>
                </div>

                <div className="border rounded-lg flex flex-col h-72">
                  <div className="flex-shrink-0 border-b px-3 py-2 bg-muted/30">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5" />
                      Procurement Agent
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {oboChatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg px-3 py-1.5 text-xs max-w-[85%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isSimulatingObo && (
                      <div className="flex justify-start">
                        <div className="rounded-lg px-3 py-1.5 text-xs bg-muted flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> working on it...
                        </div>
                      </div>
                    )}
                    <div ref={oboChatEndRef} />
                  </div>
                  <div className="flex-shrink-0 border-t px-2 pt-2 pb-1.5 flex flex-wrap gap-1.5">
                    {SUGGESTED_PO_PROMPTS.map(prompt => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 rounded-full"
                        disabled={isSimulatingObo}
                        onClick={() => handleChatSend(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                  <div className="flex-shrink-0 px-2 pb-2 flex gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder='e.g. "Submit a PO for Acme Supply Co for $1500"'
                      value={oboChatInput}
                      onChange={e => setOboChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !isSimulatingObo) handleChatSend(); }}
                      disabled={isSimulatingObo}
                    />
                    <Button size="sm" className="h-8 px-2.5" onClick={() => handleChatSend()} disabled={isSimulatingObo || !oboChatInput.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: exchange log + downstream result */}
              <div className="border rounded-lg overflow-hidden min-h-[220px] flex flex-col">
                {isSimulatingObo ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : oboResult ? (() => {
                  type OboEntry = { step: string; status: 'info' | 'success' | 'error'; [key: string]: unknown };
                  let oboLog: OboEntry[] = [];
                  let displayResult: unknown = null;
                  const resp = oboResult.response;
                  if (resp?.result) {
                    try {
                      const content = (resp.result as { content: { text: string }[] })?.content?.[0]?.text;
                      if (content) {
                        const parsed = JSON.parse(content);
                        oboLog = parsed._obo ?? [];
                        const { _obo, ...rest } = parsed;
                        displayResult = rest;
                      }
                    } catch {}
                  } else if (resp?.error) {
                    oboLog = ((resp.error as { data?: { _obo?: OboEntry[] } })?.data?._obo) ?? [];
                    displayResult = { error: (resp.error as { message?: string }).message };
                  }

                  const actingAgentId = (oboLog.find(e => e.step === 'exchange_success')?.acting_agent_id as string | undefined) ?? null;

                  return (
                    <>
                      {actingAgentId && (
                        <div className="flex-shrink-0 border-b bg-purple-50 px-3 py-2">
                          <p className="text-[10px] text-purple-700 font-medium uppercase tracking-wide">Acting Agent (act.sub — Agents as Principal)</p>
                          <code className="text-xs font-mono text-purple-900 break-all">{actingAgentId}</code>
                        </div>
                      )}
                      <div className="flex-shrink-0 border-b bg-muted/20 px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Exchange Log</p>
                        {oboLog.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No log entries returned.</p>
                        ) : oboLog.map((entry, i) => {
                          const { step, status, ...details } = entry;
                          return (
                            <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                              {status === 'success'
                                ? <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                                : status === 'error'
                                ? <XCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                                : <RefreshCw className="h-3 w-3 text-blue-500 flex-shrink-0 mt-0.5" />}
                              <span className="font-semibold flex-shrink-0">{step}</span>
                              <span className="text-muted-foreground break-all">{JSON.stringify(details)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <pre className="flex-1 text-[10px] font-mono p-3 overflow-auto leading-relaxed bg-background text-foreground">
                        {JSON.stringify(displayResult, null, 2)}
                      </pre>
                    </>
                  );
                })() : (
                  <div className="flex-1 flex items-center justify-center border-dashed">
                    <p className="text-xs text-muted-foreground">Exchange log will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
