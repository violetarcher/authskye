import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export const dynamic = 'force-dynamic';
import { managementClient } from '@/lib/auth0-mgmt-client';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = session;
    const userId = user.sub;

    console.log('🔍 Fetching organizations for user:', userId);

    // Get all organizations for the user
    // Note: The method name in auth0 SDK is getUserOrganizations, not getOrganizations
    const orgsResponse = await managementClient.users.getUserOrganizations({ id: userId });
    const organizations = orgsResponse.data || [];

    console.log('✅ Found organizations:', organizations.length);

    // Get the current organization from user claims
    const currentOrgId = user['https://agency-inc-demo.com/org_id'];
    const currentOrgName = user['https://agency-inc-demo.com/org_name'];
    const currentOrgLogo = user['https://agency-inc-demo.com/org_logo'];

    // Enhance organization data with metadata
    const enrichedOrgs = organizations.map(org => ({
      id: org.id || '',
      name: org.name || '',
      display_name: org.display_name || org.name || '',
      logo_url: org.metadata?.logo_url || '',
      isCurrent: org.id === currentOrgId
    }));

    // Get current org's fresh logo from API data (session token logo may be stale)
    const currentOrgFromApi = enrichedOrgs.find(org => org.id === currentOrgId);
    const freshLogo = currentOrgFromApi?.logo_url || currentOrgLogo;

    return Response.json({
      success: true,
      organizations: enrichedOrgs,
      currentOrganization: {
        id: currentOrgId,
        name: currentOrgName,
        logo: freshLogo
      }
    });
  } catch (error: any) {
    console.error('User organizations error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch organizations',
        details: error.message
      },
      { status: 500 }
    );
  }
}
