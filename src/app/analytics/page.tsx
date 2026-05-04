'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { user, isLoading: userLoading } = useUser();

  const roles = user?.['https://agency-inc-demo.com/roles'] as string[] || [];
  const hasAnalyticsAccess = roles.includes('Data Analyst');
  
  // Check for pending access request in user metadata - try different possible locations
  const pendingAccessRequest = user?.['https://agency-inc-demo.com/app_metadata']?.pending_access_request || 
                               user?.app_metadata?.pending_access_request ||
                               user?.['https://agency-inc-demo.com/pending_access_request'];
  
  // Debug: Log user object to see what metadata is available
  console.log('User object:', user);
  console.log('Pending access request:', pendingAccessRequest);
  

  const handleRequestAccess = async () => {
    try {
      // First, submit the access request via API to set user metadata
      const response = await fetch('/api/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'Data Analyst',
          reason: 'Request access to view analytics dashboard and reporting data'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If successful, trigger silent re-authentication to fire Auth0 Action
        if (data.next_step === 'logout_and_login') {
          // Use hidden iframe for silent authentication to trigger Auth0 Action
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = '/api/auth/login?access_request=true&prompt=none&returnTo=' + encodeURIComponent('/analytics');
          
          iframe.onload = () => {
            // After silent auth completes, refresh the current page to get updated permissions
            window.location.reload();
          };
          
          iframe.onerror = () => {
            // If silent auth fails, fallback to manual login
            window.location.href = '/api/auth/login?access_request=true&returnTo=' + encodeURIComponent('/analytics');
          };
          
          document.body.appendChild(iframe);
        }
      } else {
        const error = await response.json();
        console.error('Access request failed:', error);
        alert('Failed to submit access request: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Access request error:', error);
      alert('Failed to submit access request. Please try again.');
    }
  };

  // Renders the full dashboard for authorized users
  const renderDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          View comprehensive reporting analytics and insights
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generation</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450 GWh</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">77</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Factor</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4.5B</div>
            <p className="text-xs text-muted-foreground">+8.2% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generation Analytics</CardTitle>
            <CardDescription>Detailed analytics for power generation and efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Advanced analytics charts and data visualizations would go here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Grid Performance</CardTitle>
            <CardDescription>Insights into grid reliability and dispatch patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Grid performance analytics would be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  // Renders the "request access" UI for unauthorized users
  const renderRequestAccess = () => (
     <div className="flex items-center justify-center h-full">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need the "Data Analyst" role to access this page.
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
              {pendingAccessRequest ? (
                <>
                  <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your access request for "{pendingAccessRequest.role}" is pending review.
                      <br />
                      Submitted: {new Date(pendingAccessRequest.requested_at).toLocaleDateString()}
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
                    Request access from your administrator to gain Data Analyst permissions.
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
  
  // Main return statement
  return (
    <div className="container mx-auto py-8">
      {userLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : !user ? (
        <div className="text-center">
          <p>Please log in to access analytics.</p>
          <Button asChild>
            <Link href="/api/auth/login?returnTo=/analytics">Login</Link>
          </Button>
        </div>
      ) : hasAnalyticsAccess ? (
        renderDashboard()
      ) : (
        renderRequestAccess()
      )}
    </div>
  );
}