import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { getClaimKey } from '@/lib/auth-utils';

/**
 * GET /api/organizations/[orgId]/sso/status
 *
 * Check SSO connection status for an organization.
 * Admin-only endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const roles = user?.[getClaimKey('roles')] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user belongs to this organization
    if (user.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only view SSO status for your own organization' },
        { status: 403 }
      );
    }

    console.log('🔍 Checking SSO status for organization:', orgId);

    // Fetch enabled connections for this organization
    const connections = await managementClient.organizations.getEnabledConnections({
      id: orgId,
    });

    // Filter for enterprise SSO connections (SAML and OIDC)
    const ssoConnections = connections.data.filter((conn) => {
      const strategy = conn.connection?.strategy;
      return strategy === 'samlp' || strategy === 'oidc' || strategy === 'okta';
    });

    if (ssoConnections.length === 0) {
      return NextResponse.json({
        status: 'not_configured',
        connections: [],
        message: 'No SSO connection configured',
      });
    }

    // Map connections to a cleaner format
    const connectionsData = ssoConnections.map((conn) => ({
      id: conn.connection_id,
      name: conn.connection?.name,
      strategy: conn.connection?.strategy,
      enabled: true,
      assignMembershipOnLogin: conn.assign_membership_on_login,
      displayName: conn.connection?.display_name,
    }));

    return NextResponse.json({
      status: 'configured',
      connections: connectionsData,
      message: `${ssoConnections.length} SSO connection(s) configured`,
    });
  } catch (error: any) {
    console.error('Failed to fetch SSO status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}
