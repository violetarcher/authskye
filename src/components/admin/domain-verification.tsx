'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Globe, Copy, Check } from 'lucide-react';

interface DomainVerificationProps {
  orgId: string;
}

export function DomainVerification({ orgId }: DomainVerificationProps) {
  const [domain, setDomain] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  const handleClaimDomain = async () => {
    setError(null);
    setVerificationResult(null);
    setIsClaiming(true);

    try {
      const response = await fetch(`/api/organizations/${orgId}/domain/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to claim domain');
      }

      setClaimData(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleVerifyDomain = async () => {
    setError(null);
    setIsVerifying(true);

    try {
      const response = await fetch(`/api/organizations/${orgId}/domain/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (!response.ok && response.status !== 200) {
        throw new Error(data.message || data.error || 'Failed to verify domain');
      }

      setVerificationResult(data);

      if (data.verified) {
        // Clear claim data on successful verification
        setTimeout(() => {
          setClaimData(null);
          setDomain('');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'host' | 'value') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'host') {
        setCopiedHost(true);
        setTimeout(() => setCopiedHost(false), 2000);
      } else {
        setCopiedValue(true);
        setTimeout(() => setCopiedValue(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Domain Verification
        </CardTitle>
        <CardDescription>
          Verify domain ownership to enhance security (optional).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {verificationResult?.verified && (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Domain verified successfully!</strong> Your domain {domain} has been verified.
            </AlertDescription>
          </Alert>
        )}

        {verificationResult && !verificationResult.verified && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{verificationResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Domain Input */}
        {!claimData && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isClaiming}
              />
              <p className="text-xs text-muted-foreground">
                Enter your organization's domain (without www or https)
              </p>
            </div>

            <Button onClick={handleClaimDomain} disabled={!domain || isClaiming}>
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming Domain...
                </>
              ) : (
                'Claim Domain'
              )}
            </Button>
          </div>
        )}

        {/* DNS Instructions */}
        {claimData && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">Step 1</Badge>
                <span className="font-medium">Add DNS TXT Record</span>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Host / Name</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white p-2 rounded border text-sm font-mono">
                      {claimData.txtRecord.host}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(claimData.txtRecord.host, 'host')}
                    >
                      {copiedHost ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Value / Content</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white p-2 rounded border text-sm font-mono break-all">
                      {claimData.txtRecord.value}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(claimData.txtRecord.value, 'value')}
                    >
                      {copiedValue ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">TTL</Label>
                  <div className="mt-1">
                    <code className="bg-white p-2 rounded border text-sm font-mono">3600</code>
                    <span className="text-xs text-muted-foreground ml-2">(or default)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-100">Step 2</Badge>
                <span className="font-medium text-sm">Wait for DNS Propagation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                DNS changes can take 5-30 minutes to propagate. Once the TXT record is added, click "Verify Domain" below.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVerifyDomain} disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Domain
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={() => setClaimData(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
