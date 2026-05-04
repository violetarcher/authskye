'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Info,
} from 'lucide-react';

interface ConnectionDomainsProps {
  orgId: string;
}

interface DomainData {
  domains: string[];
  connection: {
    id: string;
    name: string;
    strategy: string;
  } | null;
  message?: string;
}

export function ConnectionDomains({ orgId }: ConnectionDomainsProps) {
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');

  const fetchDomains = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/organizations/${orgId}/connection/domains`);
      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }

      const data = await response.json();
      setDomainData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [orgId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newDomain.trim()) {
      setError('Please enter a domain');
      return;
    }

    setIsAdding(true);

    try {
      const response = await fetch(`/api/organizations/${orgId}/connection/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to add domain');
      }

      setSuccess(data.message || 'Domain added successfully!');
      setNewDomain('');
      await fetchDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    setError(null);
    setSuccess(null);
    setIsDeleting(domain);

    try {
      const response = await fetch(`/api/organizations/${orgId}/connection/domains`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove domain');
      }

      setSuccess('Domain removed successfully');
      await fetchDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to remove domain');
    } finally {
      setIsDeleting(null);
    }
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
          <Globe className="h-5 w-5" />
          Home Realm Discovery Domains
        </CardTitle>
        <CardDescription>
          Add email domains for automatic SSO redirection. Users with these email domains will skip the password screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* No SSO Connection Warning */}
        {!domainData?.connection && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>SSO Required:</strong> Please configure your SSO connection in the SSO Configuration tab before adding domains.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Info */}
        {domainData?.connection && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SSO Connection</p>
                <p className="text-sm text-muted-foreground">{domainData.connection.name}</p>
              </div>
              <Badge variant="outline">
                {domainData.connection.strategy.toUpperCase()}
              </Badge>
            </div>
          </div>
        )}

        {/* Add Domain Form */}
        {domainData?.connection && (
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Add Domain</Label>
              <div className="flex gap-2">
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  disabled={isAdding}
                  className="flex-1"
                />
                <Button type="submit" disabled={isAdding || !newDomain.trim()}>
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your company's email domain (e.g., contoso.com)
              </p>
            </div>
          </form>
        )}

        {/* Domain List */}
        {domainData?.domains && domainData.domains.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Configured Domains ({domainData.domains.length})</h3>
            <div className="space-y-2">
              {domainData.domains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center justify-between rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-mono text-sm">{domain}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDomain(domain)}
                    disabled={isDeleting === domain}
                  >
                    {isDeleting === domain ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {domainData?.domains && domainData.domains.length === 0 && domainData.connection && (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No domains configured yet</p>
            <p className="text-xs mt-1">Add your first domain above to enable home realm discovery</p>
          </div>
        )}

        {/* Info Section */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> When users enter an email address with a configured domain,
            they'll be automatically redirected to your SSO provider without seeing a password prompt.
            This creates a seamless login experience for your organization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
