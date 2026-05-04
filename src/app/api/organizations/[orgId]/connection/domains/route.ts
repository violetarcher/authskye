import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { z } from 'zod';

const addDomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required').regex(
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/,
    'Invalid domain format'
  ),
});

/**
 * POST /api/organizations/[orgId]/connection/domains
 *
 * Add a domain to the organization's SSO connection for home realm discovery.
 * No DNS verification required - admin authorization is sufficient.
 *
 * This follows the Auth0 B2B SaaS Starter pattern:
 * https://github.com/auth0-developer-hub/auth0-b2b-saas-starter#connections
 */
export async function POST(
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
    const roles = user?.['https://agency-inc-demo.com/roles'] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user belongs to this organization
    if (user.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only manage domains for your own organization' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = addDomainSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { domain } = validation.data;

    console.log('🌐 Adding domain to SSO connection:', domain, 'for org:', orgId);

    // Find the organization's SSO connection
    const connections = await managementClient.organizations.getEnabledConnections({
      id: orgId,
    });

    // Filter for enterprise SSO connections (exclude auth0, google-oauth2, etc.)
    const ssoStrategies = ['samlp', 'oidc', 'okta', 'waad', 'adfs'];
    const ssoConnection = connections.data.find((conn) =>
      conn.connection?.strategy && ssoStrategies.includes(conn.connection.strategy)
    );

    if (!ssoConnection?.connection_id) {
      return NextResponse.json(
        {
          error: 'No SSO connection found',
          message: 'Please configure SSO before adding domains. Go to the SSO Configuration tab to set up your SSO connection.',
        },
        { status: 404 }
      );
    }

    console.log('✅ Found SSO connection:', ssoConnection.connection_id, 'strategy:', ssoConnection.connection?.strategy);

    // Get the full connection details
    const connectionDetails = await managementClient.connections.get({
      id: ssoConnection.connection_id,
    });

    // Get existing domain_aliases
    const existingDomains = connectionDetails.data.options?.domain_aliases || [];

    // Check if domain already exists
    if (existingDomains.includes(domain)) {
      return NextResponse.json(
        {
          success: true,
          domain,
          domains: existingDomains,
          message: 'Domain already configured for home realm discovery',
        },
        { status: 200 }
      );
    }

    // Add the new domain
    const updatedDomains = [...existingDomains, domain];

    console.log('📤 Updating connection domain_aliases:', updatedDomains);

    // Update connection with new domain_aliases
    await managementClient.connections.update(
      { id: ssoConnection.connection_id },
      {
        options: {
          ...connectionDetails.data.options,
          domain_aliases: updatedDomains,
        },
      }
    );

    console.log('✅ Domain added to SSO connection for home realm discovery');

    return NextResponse.json({
      success: true,
      domain,
      domains: updatedDomains,
      connection: {
        id: ssoConnection.connection_id,
        name: ssoConnection.connection?.name,
        strategy: ssoConnection.connection?.strategy,
      },
      message: 'Domain added successfully! Users with this email domain will now be automatically redirected to your SSO provider.',
    });
  } catch (error: any) {
    console.error('❌ Failed to add domain to connection:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/[orgId]/connection/domains
 *
 * List all domains configured for home realm discovery on the organization's SSO connection.
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

    // Verify user belongs to this organization
    if (user.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only view domains for your own organization' },
        { status: 403 }
      );
    }

    console.log('🔍 Getting domains for organization:', orgId);

    // Find the organization's SSO connection
    const connections = await managementClient.organizations.getEnabledConnections({
      id: orgId,
    });

    // Filter for enterprise SSO connections
    const ssoStrategies = ['samlp', 'oidc', 'okta', 'waad', 'adfs'];
    const ssoConnection = connections.data.find((conn) =>
      conn.connection?.strategy && ssoStrategies.includes(conn.connection.strategy)
    );

    if (!ssoConnection?.connection_id) {
      return NextResponse.json({
        domains: [],
        connection: null,
        message: 'No SSO connection configured',
      });
    }

    // Get the full connection details
    const connectionDetails = await managementClient.connections.get({
      id: ssoConnection.connection_id,
    });

    const domains = connectionDetails.data.options?.domain_aliases || [];

    console.log('✅ Found', domains.length, 'domains:', domains);

    return NextResponse.json({
      domains,
      connection: {
        id: ssoConnection.connection_id,
        name: ssoConnection.connection?.name,
        strategy: ssoConnection.connection?.strategy,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to get domains:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[orgId]/connection/domains
 *
 * Remove a domain from the organization's SSO connection.
 */
export async function DELETE(
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
    const roles = user?.['https://agency-inc-demo.com/roles'] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user belongs to this organization
    if (user.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only manage domains for your own organization' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = addDomainSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { domain } = validation.data;

    console.log('🗑️ Removing domain from SSO connection:', domain, 'for org:', orgId);

    // Find the organization's SSO connection
    const connections = await managementClient.organizations.getEnabledConnections({
      id: orgId,
    });

    const ssoStrategies = ['samlp', 'oidc', 'okta', 'waad', 'adfs'];
    const ssoConnection = connections.data.find((conn) =>
      conn.connection?.strategy && ssoStrategies.includes(conn.connection.strategy)
    );

    if (!ssoConnection?.connection_id) {
      return NextResponse.json(
        { error: 'No SSO connection found' },
        { status: 404 }
      );
    }

    // Get the full connection details
    const connectionDetails = await managementClient.connections.get({
      id: ssoConnection.connection_id,
    });

    // Get existing domain_aliases
    const existingDomains = connectionDetails.data.options?.domain_aliases || [];

    // Remove the domain
    const updatedDomains = existingDomains.filter((d: string) => d !== domain);

    if (updatedDomains.length === existingDomains.length) {
      return NextResponse.json(
        { error: 'Domain not found in connection' },
        { status: 404 }
      );
    }

    console.log('📤 Updating connection domain_aliases:', updatedDomains);

    // Update connection
    await managementClient.connections.update(
      { id: ssoConnection.connection_id },
      {
        options: {
          ...connectionDetails.data.options,
          domain_aliases: updatedDomains,
        },
      }
    );

    console.log('✅ Domain removed from SSO connection');

    return NextResponse.json({
      success: true,
      domain,
      domains: updatedDomains,
      message: 'Domain removed successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to remove domain:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
