'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings as SettingsIcon,
  AlertTriangle,
} from 'lucide-react';

interface SSOConnection {
  id: string;
  name: string;
  strategy: string;
  enabled: boolean;
  displayName?: string;
}

interface SSOStatus {
  status: 'not_configured' | 'configured';
  connections: SSOConnection[];
  message: string;
}

interface SSOConfigurationProps {
  orgId: string;
  domainVerified?: boolean;
}

export function SSOConfiguration({ orgId, domainVerified = false }: SSOConfigurationProps) {
  const [ssoStatus, setSsoStatus] = useState<SSOStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSSOStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizations/${orgId}/sso/status`);

      if (!response.ok) {
        throw new Error('Failed to fetch SSO status');
      }

      const data = await response.json();
      setSsoStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load SSO status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSSOStatus();
  }, [orgId]);

  const handleConfigureSSO = async () => {
    setError(null);
    setIsGeneratingTicket(true);

    try {
      const response = await fetch(`/api/organizations/${orgId}/sso/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to generate SSO ticket');
      }

      const data = await response.json();

      // Redirect to Auth0 self-service SSO configuration UI
      window.location.href = data.configUrl;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsGeneratingTicket(false);
    }
  };

  const getStrategyBadge = (strategy: string) => {
    const strategyMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      samlp: { label: 'SAML', variant: 'default' },
      oidc: { label: 'OIDC', variant: 'secondary' },
      okta: { label: 'Okta', variant: 'outline' },
    };

    const config = strategyMap[strategy] || { label: strategy.toUpperCase(), variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          SSO Configuration
        </CardTitle>
        <CardDescription>
          Configure Single Sign-On (SAML or OIDC) for your organization using Auth0's self-service setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Domain Verification Warning */}
        {!domainVerified && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Optional:</strong> Domain verification is recommended for enhanced security. SSO will work
              without it, but verifying your domain improves security posture.
            </AlertDescription>
          </Alert>
        )}

        {/* SSO Status Display */}
        {ssoStatus?.status === 'not_configured' ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No SSO Connection Configured</h3>
            <p className="text-muted-foreground mb-6">
              Set up SAML or OIDC authentication for your organization
            </p>
            <Button onClick={handleConfigureSSO} disabled={isGeneratingTicket} size="lg">
              {isGeneratingTicket ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Ticket...
                </>
              ) : (
                <>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Configure SSO
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold">SSO Configured</span>
            </div>

            {/* Connection List */}
            <div className="space-y-3">
              {ssoStatus?.connections.map((conn) => (
                <div
                  key={conn.id}
                  className="border rounded-lg p-4 bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{conn.displayName || conn.name}</span>
                        {getStrategyBadge(conn.strategy)}
                      </div>
                      <p className="text-sm text-muted-foreground">Connection ID: {conn.id}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Enabled
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Reconfigure Button */}
            <div className="pt-4 border-t">
              <Button onClick={handleConfigureSSO} disabled={isGeneratingTicket} variant="outline" size="sm">
                {isGeneratingTicket ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Ticket...
                  </>
                ) : (
                  <>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Reconfigure SSO
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Generate a new configuration ticket to modify your SSO settings or add additional connections.
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> The SSO configuration is managed through Auth0's self-service interface.
            You'll be redirected to configure your identity provider details (SAML metadata or OIDC endpoints).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
