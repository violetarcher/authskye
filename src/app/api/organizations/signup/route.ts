import { NextRequest, NextResponse } from 'next/server';
import { ManagementClient } from 'auth0';
import { organizationSignupSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';

/**
 * Public Organization Signup API
 *
 * Creates a new Auth0 organization and invites the admin user.
 * This is a PUBLIC endpoint - no authentication required.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = organizationSignupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { organizationName, adminEmail } = validation.data;

    // Create Management API client with custom domain header
    const customDomain = process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '');
    const customDomainClient = new ManagementClient({
      domain: process.env.AUTH0_MGMT_DOMAIN!,
      clientId: process.env.AUTH0_MGMT_CLIENT_ID!,
      clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET!,
      headers: {
        'auth0-custom-domain': customDomain,
      },
    });

    // Check if organization with same name already exists (optional safety check)
    // Note: Auth0 will handle uniqueness, but we can provide better error message
    console.log('🏢 Creating organization:', organizationName);

    // Create the Auth0 organization
    const organization = await customDomainClient.organizations.create({
      name: organizationName.toLowerCase().replace(/[^a-z0-9-]/g, '-'), // Normalize name for Auth0
      display_name: organizationName,
      metadata: {
        created_by: 'self-signup',
        admin_email: adminEmail,
      },
    });

    const orgId = organization.data.id!;
    console.log('✅ Organization created:', orgId);

    // Get the Username-Password-Authentication connection
    const connections = await customDomainClient.connections.getAll({
      strategy: ['auth0'] as any,
    });

    const databaseConnection = connections.data.find(
      (conn) => conn.name === 'Username-Password-Authentication'
    );

    if (!databaseConnection) {
      // Cleanup: delete the organization
      await customDomainClient.organizations.delete({ id: orgId });
      return NextResponse.json(
        { error: 'Database connection not found' },
        { status: 500 }
      );
    }

    // Enable the database connection for this organization
    await customDomainClient.organizations.addEnabledConnection(
      { id: orgId },
      {
        connection_id: databaseConnection.id!,
        assign_membership_on_login: true,
        is_signup_enabled: true,
      }
    );

    console.log('✅ Database connection enabled for organization');

    // Get the Admin role ID
    const roles = await customDomainClient.roles.getAll();
    const adminRole = roles.data.find((role) => role.name === 'Admin');

    if (!adminRole) {
      console.warn('⚠️ Admin role not found, invitation will be created without role');
    }

    // Create invitation for admin user
    const invitationPayload: any = {
      invitee: { email: adminEmail },
      inviter: { name: 'Meridian Energy Portal' },
      client_id: process.env.AUTH0_CLIENT_ID!,
      connection_id: databaseConnection.id!,
      send_invitation_email: true,
    };

    // Add Admin role if found
    if (adminRole) {
      invitationPayload.roles = [adminRole.id!];
    }

    console.log('📧 Creating invitation for admin:', adminEmail);

    const invitation = await customDomainClient.organizations.createInvitation(
      { id: orgId },
      invitationPayload
    );

    console.log('✅ Invitation created:', invitation.data.id);

    // Log to Firestore audit trail
    try {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('audit_logs')
        .add({
          action: 'organization_created',
          method: 'self-signup',
          adminEmail,
          organizationName,
          timestamp: new Date().toISOString(),
        });
    } catch (firestoreError) {
      console.error('⚠️ Failed to log to Firestore:', firestoreError);
      // Don't fail the signup if Firestore logging fails
    }

    // Return success with invitation ticket
    return NextResponse.json(
      {
        success: true,
        organizationId: orgId,
        organizationName,
        invitationId: invitation.data.id,
        invitationTicket: invitation.data.ticket_id,
        message: 'Organization created successfully. Check your email for the invitation.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Organization signup failed:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
    });

    // Handle specific error cases
    if (error.statusCode === 409) {
      return NextResponse.json(
        {
          error: 'Organization already exists',
          message: 'An organization with this name already exists. Please choose a different name.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create organization',
        message: error.message || 'An unexpected error occurred',
        details: error.data,
      },
      { status: error.statusCode || 500 }
    );
  }
}
