import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationProfile } from '@/components/admin/organization-profile';
import { SSOConfiguration } from '@/components/admin/sso-configuration';
import { ConnectionDomains } from '@/components/admin/connection-domains';
import { Building2, Shield, Globe } from 'lucide-react';

export const metadata = {
  title: 'Organization Settings | SecureHealth Portal',
  description: 'Manage your organization profile and SSO configuration',
};

export default async function OrganizationManagementPage() {
  const session = await getSession();
  const user = session?.user;

  // Require authentication
  if (!user) {
    redirect('/api/auth/login?returnTo=/organization-management');
  }

  // Check for Admin role
  const roles = user?.['https://agency-inc-demo.com/roles'] || [];
  if (!roles.includes('Admin')) {
    redirect('/?error=forbidden');
  }

  // Require organization membership
  const orgId = user?.org_id;
  if (!orgId) {
    redirect('/?error=no-organization');
  }

  const orgName = user?.['https://agency-inc-demo.com/org_name'] || 'Your Organization';

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage {orgName}'s profile, SSO configuration, and domain verification
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="sso" className="gap-2">
            <Shield className="h-4 w-4" />
            SSO
          </TabsTrigger>
          <TabsTrigger value="domain" className="gap-2">
            <Globe className="h-4 w-4" />
            Domain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <OrganizationProfile orgId={orgId} />
        </TabsContent>

        <TabsContent value="sso" className="space-y-6">
          <SSOConfiguration orgId={orgId} domainVerified={false} />
        </TabsContent>

        <TabsContent value="domain" className="space-y-6">
          <ConnectionDomains orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
