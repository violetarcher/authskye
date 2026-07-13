'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

// Module-level flag — survives React StrictMode remount unlike useRef
let exchangeInProgress = false;

function McpCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchange() {
      if (!searchParams) return;

      // If already in progress (StrictMode second run), wait for token then redirect
      if (exchangeInProgress) {
        const poll = setInterval(() => {
          if (sessionStorage.getItem('mcp_access_token')) {
            clearInterval(poll);
            router.push('/mcp');
          }
        }, 50);
        setTimeout(() => clearInterval(poll), 5000);
        return;
      }
      exchangeInProgress = true;

      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription ?? errorParam);
        exchangeInProgress = false;
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        exchangeInProgress = false;
        return;
      }

      const verifier = sessionStorage.getItem('mcp_pkce_verifier');
      const clientId = sessionStorage.getItem('mcp_client_id');

      if (!verifier || !clientId) {
        setStatus('error');
        setError('PKCE verifier not found — please reconnect');
        exchangeInProgress = false;
        return;
      }

      const redirectUri = `${window.location.origin}/mcp/callback`;

      let domain: string;
      try {
        const cfg = await fetch('/api/mcp/config').then(r => r.json());
        domain = cfg.auth0Domain;
      } catch {
        setStatus('error');
        setError('Failed to load MCP config');
        exchangeInProgress = false;
        return;
      }

      try {
        const res = await fetch(`https://${domain}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
          }),
        });
        const data = await res.json();

        if (data.error) {
          setStatus('error');
          setError(`${data.error}: ${data.error_description ?? ''}`);
          exchangeInProgress = false;
          return;
        }

        sessionStorage.setItem('mcp_access_token', data.access_token);
        sessionStorage.removeItem('mcp_pkce_verifier');
        if (data.expires_in) {
          sessionStorage.setItem('mcp_token_expires_at', String(Date.now() + data.expires_in * 1000));
        }
        setStatus('success');
        setTimeout(() => {
          exchangeInProgress = false;
          router.push('/mcp');
        }, 800);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Token exchange failed');
        exchangeInProgress = false;
      }
    }

    exchange();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        {status === 'exchanging' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Exchanging authorization code...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
            <p className="text-sm">Connected! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-8 w-8 mx-auto text-red-500" />
            <p className="text-sm font-medium">Authentication failed</p>
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
            <button
              className="text-xs text-primary underline"
              onClick={() => router.push('/mcp')}
            >
              Back to MCP Server
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function McpCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <McpCallbackInner />
    </Suspense>
  );
}
