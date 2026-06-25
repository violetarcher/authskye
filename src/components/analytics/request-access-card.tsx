'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, AlertCircle } from 'lucide-react';

export function RequestAccessCard() {
  const [pending, setPending] = useState(false);

  const handleRequestAccess = async () => {
    try {
      const response = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'read:analytics',
          reason: 'Request access to view analytics dashboard and reporting data'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.next_step === 'logout_and_login') {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = '/api/auth/login?access_request=true&prompt=none&returnTo=' + encodeURIComponent('/analytics');
          iframe.onload = () => window.location.reload();
          iframe.onerror = () => {
            window.location.href = '/api/auth/login?access_request=true&returnTo=' + encodeURIComponent('/analytics');
          };
          document.body.appendChild(iframe);
        } else {
          setPending(true);
        }
      } else {
        const error = await response.json();
        alert('Failed to submit access request: ' + (error.message || 'Unknown error'));
      }
    } catch {
      alert('Failed to submit access request. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need the "read:analytics" scope to access this page.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>Access reporting analytics and data insights</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {pending ? (
              <>
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your access request is pending review.
                  </AlertDescription>
                </Alert>
                <p className="text-muted-foreground mb-6">
                  Your administrator has been notified. You'll receive updated permissions once approved.
                </p>
                <Button disabled size="lg">
                  Request Pending
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">
                  Request access from your administrator to gain analytics permissions.
                </p>
                <Button onClick={handleRequestAccess} size="lg">
                  Request Access
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
