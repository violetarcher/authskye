'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Send,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Info,
  AlertTriangle,
  Smartphone,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

// Demo personas - these are just identifiers, permissions come from FGA
const PERSONAS = [
  {
    id: 'alice-pm',
    name: 'Alice',
    role: 'Project Manager',
    description: 'Owner of Project Alpha',
  },
  {
    id: 'bob-dev',
    name: 'Bob',
    role: 'Developer',
    description: 'Editor on Project Alpha',
  },
  {
    id: 'carol-support',
    name: 'Carol',
    role: 'Support Agent',
    description: 'Reporter on issue-123',
  },
  {
    id: 'dan-admin',
    name: 'Dan',
    role: 'Organization Admin',
    description: 'Admin of organization:acme',
  },
];

// Agent types - these are just identifiers, permissions come from FGA
const AGENT_TYPES = [
  {
    id: 'triage-bot',
    name: 'Triage Bot',
    description: 'Categorizes and assigns issues',
    capabilities: ['Triage issues', 'Assign issues', 'Read projects'],
  },
  {
    id: 'reporting-bot',
    name: 'Reporting Bot',
    description: 'Generates reports across organization',
    capabilities: ['Read org data', 'Generate reports'],
  },
  {
    id: 'support-agent',
    name: 'Support Agent',
    description: 'Handles support tickets',
    capabilities: ['Comment on issues', 'Read issues'],
  },
  {
    id: 'code-review-bot',
    name: 'Code Review Bot',
    description: 'Reviews code changes',
    capabilities: ['Review code', 'Read projects'],
  },
];

interface CibaEscalation {
  needed: boolean;
  action: string;
  resource: string;
  reason: string;
  bindingMessage: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  permissionChecks?: PermissionCheck[];
  cibaEscalation?: CibaEscalation | null;
}

interface PermissionCheck {
  subject: string;
  subjectType: 'user' | 'agent';
  relation: string;
  object: string;
  allowed: boolean;
}

export default function AgentsPage() {
  const { user, isLoading: userLoading } = useUser();
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [selectedAgent, setSelectedAgent] = useState(AGENT_TYPES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Real FGA data
  const [personaPermissions, setPersonaPermissions] = useState<Record<string, string[]>>({});
  const [agentPermissions, setAgentPermissions] = useState<Record<string, string[]>>({});
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // CIBA escalation state
  const [pendingCiba, setPendingCiba] = useState<{
    escalation: CibaEscalation;
    authReqId?: string;
    status: 'idle' | 'requesting' | 'polling' | 'approved' | 'denied' | 'expired';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cibaPollingRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch permissions from FGA for a subject
  const fetchPermissions = useCallback(async (type: 'user' | 'agent', id: string): Promise<{ permissions: Record<string, string[]>; rateLimited: boolean }> => {
    try {
      const response = await fetch(`/api/agents/permissions?type=${type}&id=${id}`);
      if (response.ok) {
        const data = await response.json();
        return {
          permissions: data.permissions || {},
          rateLimited: data.rateLimited || false
        };
      }
    } catch (error) {
      console.error(`Failed to fetch permissions for ${type}:${id}`, error);
    }
    return { permissions: {}, rateLimited: false };
  }, []);


  // Load permissions when persona or agent changes
  useEffect(() => {
    if (!user) return;

    const loadPermissions = async () => {
      setIsLoadingPermissions(true);
      try {
        // Load sequentially to reduce rate limit pressure
        const personaResult = await fetchPermissions('user', selectedPersona.id);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
        const agentResult = await fetchPermissions('agent', selectedAgent.id);

        setPersonaPermissions(personaResult.permissions);
        setAgentPermissions(agentResult.permissions);

        // Show toast if rate limited
        if (personaResult.rateLimited || agentResult.rateLimited) {
          toast.warning('FGA Rate Limited', {
            description: 'Some permissions may be incomplete. Results are cached - try again in a moment.',
            icon: <AlertTriangle className="h-4 w-4" />,
          });
        }
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    loadPermissions();
  }, [user, selectedPersona.id, selectedAgent.id, fetchPermissions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'system',
          content: `Welcome to the Agents Demo! This demonstrates the "Agents as Principals" pattern from Auth0 FGA.

Select a persona and agent type to see their real permissions from FGA. Then ask the agent to perform actions - it will check FGA for both user AND agent authorization.

Try:
• "Can you triage issue 123?"
• "Review the code in project alpha"
• "Read the organization data"`,
          timestamp: new Date(),
        }
      ]);
    }
  }, [messages.length]);

  const handlePersonaChange = async (personaId: string) => {
    const persona = PERSONAS.find(p => p.id === personaId);
    if (persona) {
      setSelectedPersona(persona);
      setMessages(prev => [...prev, {
        id: `persona-${Date.now()}`,
        role: 'system',
        content: `Switched to persona: ${persona.name} (${persona.role})`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleAgentChange = async (agentId: string) => {
    const agent = AGENT_TYPES.find(a => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setMessages(prev => [...prev, {
        id: `agent-${Date.now()}`,
        role: 'system',
        content: `Agent changed to: ${agent.name}`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          persona: selectedPersona,
          agent: selectedAgent,
          conversationHistory: messages.filter(m => m.role !== 'system').slice(-10),
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        permissionChecks: data.permissionChecks,
        cibaEscalation: data.cibaEscalation,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If CIBA escalation is available, store it for the UI
      if (data.cibaEscalation) {
        setPendingCiba({ escalation: data.cibaEscalation, status: 'idle' });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Error communicating with the agent. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      role: 'system',
      content: `Chat cleared. Ready to chat with ${selectedAgent.name} as ${selectedPersona.name}.`,
      timestamp: new Date(),
    }]);
    setPendingCiba(null);
    if (cibaPollingRef.current) {
      clearInterval(cibaPollingRef.current);
      cibaPollingRef.current = null;
    }
  };

  // CIBA Escalation handlers
  const initiateCibaApproval = async (escalation: CibaEscalation) => {
    setPendingCiba({ escalation, status: 'requesting' });

    try {
      const response = await fetch('/api/ciba/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'openid profile email',
          binding_message: escalation.bindingMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate CIBA');
      }

      const data = await response.json();
      setPendingCiba({ escalation, authReqId: data.auth_req_id, status: 'polling' });

      setMessages(prev => [...prev, {
        id: `ciba-initiated-${Date.now()}`,
        role: 'system',
        content: `🔔 Push notification sent! Please approve "${escalation.bindingMessage}" on your mobile device (Auth0 Guardian).`,
        timestamp: new Date(),
      }]);

      // Start polling for approval
      startCibaPolling(data.auth_req_id, escalation);
    } catch (error) {
      console.error('CIBA initiation error:', error);
      setPendingCiba(null);
      toast.error('Failed to send approval request');
    }
  };

  const startCibaPolling = (authReqId: string, escalation: CibaEscalation) => {
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes at 5-second intervals

    cibaPollingRef.current = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        clearInterval(cibaPollingRef.current!);
        cibaPollingRef.current = null;
        setPendingCiba(prev => prev ? { ...prev, status: 'expired' } : null);
        setMessages(prev => [...prev, {
          id: `ciba-expired-${Date.now()}`,
          role: 'system',
          content: '⏰ Approval request expired. Please try again.',
          timestamp: new Date(),
        }]);
        return;
      }

      try {
        const response = await fetch('/api/ciba/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_req_id: authReqId }),
        });

        const data = await response.json();

        if (data.status === 'approved' || data.access_token) {
          clearInterval(cibaPollingRef.current!);
          cibaPollingRef.current = null;
          setPendingCiba(prev => prev ? { ...prev, status: 'approved' } : null);

          setMessages(prev => [...prev, {
            id: `ciba-approved-${Date.now()}`,
            role: 'system',
            content: `✅ Approval received! ${selectedAgent.name} is now authorized to ${escalation.action.replace('can_', '')} ${escalation.resource} on behalf of ${selectedPersona.name}.`,
            timestamp: new Date(),
          }]);

          // Add agent confirmation message
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: `agent-execute-${Date.now()}`,
              role: 'assistant',
              content: `Thank you for the approval! I've now executed the action: **${escalation.action.replace('can_', '')}** on **${escalation.resource}**.\n\nThis demonstrates the "Agent Escalation with Human Consent" pattern - I couldn't do this on my own, but with your explicit CIBA approval, I was able to act on your behalf.`,
              timestamp: new Date(),
            }]);
            setPendingCiba(null);
          }, 500);

        } else if (data.status === 'denied' || data.error === 'access_denied') {
          clearInterval(cibaPollingRef.current!);
          cibaPollingRef.current = null;
          setPendingCiba(prev => prev ? { ...prev, status: 'denied' } : null);

          setMessages(prev => [...prev, {
            id: `ciba-denied-${Date.now()}`,
            role: 'system',
            content: '❌ Approval denied. The action will not be performed.',
            timestamp: new Date(),
          }]);

          setTimeout(() => setPendingCiba(null), 2000);
        }
        // If still pending, continue polling
      } catch (error) {
        console.error('CIBA polling error:', error);
        // Continue polling on network errors
      }
    }, 5000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (cibaPollingRef.current) {
        clearInterval(cibaPollingRef.current);
      }
    };
  }, []);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <header className="mb-4">
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Please log in to access the Agents demo.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <header className="mb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Chat with Agents
        </h1>
        <p className="text-sm text-muted-foreground">
          AI agents with fine-grained authorization via Auth0 FGA
        </p>
      </header>

      {/* Main Content: Permissions + Chat side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* FGA Permissions */}
        <Card className="lg:col-span-1 flex flex-col min-h-0">
          <CardHeader className="pb-2 pt-3 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              FGA Permissions
              {isLoadingPermissions && <Loader2 className="h-3 w-3 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 flex-1 overflow-y-auto">
            {/* Persona Permissions */}
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1 text-blue-600">
                <User className="h-3 w-3" />
                user:{selectedPersona.id}
              </p>
              {Object.keys(personaPermissions).length === 0 ? (
                <p className="text-xs text-muted-foreground">No permissions</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(personaPermissions).map(([resource, relations]) => (
                    <div key={resource} className="text-xs">
                      <span className="font-mono text-muted-foreground text-[10px]">{resource}</span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {relations.map((rel) => (
                          <Badge key={rel} variant="secondary" className="text-[10px] px-1 py-0">
                            {rel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Agent Permissions */}
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1 text-purple-600">
                <Bot className="h-3 w-3" />
                agent:{selectedAgent.id}
              </p>
              {Object.keys(agentPermissions).length === 0 ? (
                <p className="text-xs text-muted-foreground">No permissions</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(agentPermissions).map(([resource, relations]) => (
                    <div key={resource} className="text-xs">
                      <span className="font-mono text-muted-foreground text-[10px]">{resource}</span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {relations.map((rel) => (
                          <Badge key={rel} variant="secondary" className="text-[10px] px-1 py-0">
                            {rel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="lg:col-span-2 min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Chat with {selectedAgent.name}</CardTitle>
                  <CardDescription>
                    Acting on behalf of {selectedPersona.name} - FGA checks both permissions
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearChat}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : message.role === 'system'
                              ? 'bg-muted text-muted-foreground border'
                              : 'bg-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.role === 'user' && <User className="h-4 w-4" />}
                            {message.role === 'assistant' && <Bot className="h-4 w-4" />}
                            {message.role === 'system' && <Info className="h-4 w-4" />}
                            <span className="text-xs opacity-70">
                              {message.role === 'user'
                                ? selectedPersona.name
                                : message.role === 'assistant'
                                ? selectedAgent.name
                                : 'System'}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>

                      {/* Permission Checks Display */}
                      {message.permissionChecks && message.permissionChecks.length > 0 && (
                        <div className="flex justify-start ml-4">
                          <div className="bg-muted/50 rounded-lg p-2 text-xs max-w-[80%] border">
                            <p className="font-medium mb-1 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              FGA Authorization Checks:
                            </p>
                            <div className="space-y-1 font-mono">
                              {message.permissionChecks.map((check, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  {check.allowed ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                  )}
                                  <span className={check.allowed ? 'text-green-700' : 'text-red-700'}>
                                    {check.subjectType}:{check.subject} {check.relation} {check.object}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CIBA Escalation Button */}
                      {message.cibaEscalation && pendingCiba?.status === 'idle' && (
                        <div className="flex justify-start ml-4">
                          <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 max-w-[80%] border border-amber-200 dark:border-amber-800">
                            <p className="font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                              <Smartphone className="h-4 w-4" />
                              CIBA Approval Available
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                              {message.cibaEscalation.reason}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => initiateCibaApproval(message.cibaEscalation!)}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              Request Approval via Guardian
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* CIBA Polling Status */}
                      {message.cibaEscalation && pendingCiba?.status === 'polling' && (
                        <div className="flex justify-start ml-4">
                          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 max-w-[80%] border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm font-medium">Waiting for approval...</span>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Check your Auth0 Guardian app
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            {selectedAgent.name} is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask the agent to perform an action..."
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Configuration */}
      <Card className="px-5 py-3 mt-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-6">
          {/* Persona Selector */}
          <div className="flex items-center gap-3">
            <Label htmlFor="persona" className="text-sm flex items-center gap-1.5 whitespace-nowrap">
              <User className="h-4 w-4" />
              Persona:
            </Label>
            <Select
              value={selectedPersona.id}
              onValueChange={handlePersonaChange}
            >
              <SelectTrigger id="persona" className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSONAS.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      <span>{persona.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {persona.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Type Selector */}
          <div className="flex items-center gap-3">
            <Label htmlFor="agent" className="text-sm flex items-center gap-1.5 whitespace-nowrap">
              <Bot className="h-4 w-4" />
              Agent:
            </Label>
            <Select
              value={selectedAgent.id}
              onValueChange={handleAgentChange}
            >
              <SelectTrigger id="agent" className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <span>{agent.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-muted-foreground hidden md:inline ml-2">
            {selectedPersona.name} → {selectedAgent.name}
          </span>
        </div>
      </Card>
    </div>
  );
}
