import { withPageAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { RequestAccessCard } from '@/components/analytics/request-access-card';

export default withPageAuthRequired(async function AnalyticsPage() {
  const session = await getSession();
  const scopes = session?.accessTokenScope?.split(' ') || [];
  const hasAnalyticsAccess = scopes.includes('read:analytics');

  if (!hasAnalyticsAccess) {
    return (
      <div className="container mx-auto py-8">
        <RequestAccessCard />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
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
    </div>
  );
}, { returnTo: '/analytics' });
