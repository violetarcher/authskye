'use client';

import { useState, useEffect, useCallback } from 'react';
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
                        <span className="text-muted-foreground">permissions: </span>
                        {Array.isArray(tokenClaims.permissions) && tokenClaims.permissions.length > 0 ? (
                          <span className="text-green-600">{(tokenClaims.permissions as string[]).join(', ')}</span>
                        ) : (
                          <span className="text-red-500">(none)</span>
                        )}
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
                        {tools.map(t => (
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

    </div>
  );
}
