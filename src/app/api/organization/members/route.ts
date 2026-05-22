import { NextRequest } from 'next/server';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { ManagementClient } from 'auth0';
import { inviteMemberSchema } from '@/lib/validations';
import { z } from 'zod';
import { getClaimKey } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const roles = user?.[getClaimKey('roles')] || [];

    if (!roles.includes('Admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user?.org_id;
    if (!orgId) {
      return Response.json(
        { error: 'Organization not found in session.' },
        { status: 400 }
      );
    }

    const members = await managementClient.organizations.getMembers({ id: orgId });
    return Response.json(members.data);
  } catch (error: any) {
    console.error('Failed to fetch organization members:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const roles = user?.[getClaimKey('roles')] || [];

    if (!roles.includes('Admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user?.org_id;
    if (!orgId) {
      return Response.json(
        { error: 'Organization not found in session.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = inviteMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { email, roles: inviteRoles, app_metadata } = validationResult.data;

    // Get the organization's enabled connections
    const connections = await managementClient.organizations.getEnabledConnections({ id: orgId });

    // Find a database connection that supports signup
    const signupConnection = connections.data.find(conn =>
      conn.connection?.strategy === 'auth0' && conn.is_signup_enabled
    );

    if (!signupConnection) {
      return Response.json(
        { error: 'No signup-enabled database connection found for this organization' },
        { status: 400 }
      );
    }


    const invitationPayload: any = {
      invitee: { email },
      inviter: { name: user?.name || user?.email || 'Administrator' },
      client_id: process.env.AUTH0_CLIENT_ID!,
      connection_id: signupConnection.connection_id,
      send_invitation_email: true,
    };

    // Add roles if provided
    if (inviteRoles && inviteRoles.length > 0) {
      invitationPayload.roles = inviteRoles;
    }

    // Add app_metadata if provided
    if (app_metadata && Object.keys(app_metadata).length > 0) {
      invitationPayload.app_metadata = app_metadata;
      console.log('📝 Creating invitation with app_metadata:', app_metadata);
    }

    console.log('📧 Invitation payload:', JSON.stringify(invitationPayload, null, 2));

    // Extract custom domain from AUTH0_ISSUER_BASE_URL (remove https://)
    const customDomain = process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '');
    console.log('🌐 Using custom domain:', customDomain);

    // Create a Management Client instance with the auth0-custom-domain header
    // This is required for Multiple Custom Domains support
    const customDomainClient = new ManagementClient({
      domain: process.env.AUTH0_MGMT_DOMAIN!,
      clientId: process.env.AUTH0_MGMT_CLIENT_ID!,
      clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET!,
      headers: {
        'auth0-custom-domain': customDomain
      }
    });

    // Create invitation using the client with custom domain header
    const invitation = await customDomainClient.organizations.createInvitation(
      { id: orgId },
      invitationPayload
    );

    return Response.json(invitation.data, { status: 201 });
  } catch (error: any) {
    console.error('❌ Failed to invite member:', error);
    console.error('❌ Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
      originalError: error.originalError,
    });

    // Extract detailed error message for custom domain conflicts
    const errorMessage = error.message || 'Internal server error';
    const errorDetails = error.data?.message || error.data || '';

    return Response.json(
      {
        error: errorMessage,
        details: errorDetails,
        statusCode: error.statusCode
      },
      { status: error.statusCode || 500 }
    );
  }
}