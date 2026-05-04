import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { ssoTicketSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';

/**
 * POST /api/organizations/[orgId]/sso/ticket
 *
 * Generate Auth0 Self-Service SSO configuration ticket.
 * Follows Auth0 docs: https://auth0.com/docs/authenticate/enterprise-connections/self-service-enterprise-configuration
 *
 * Flow:
 * 1. Get or create a Self-Service Profile for this organization
 * 2. Generate an SSO access ticket for that profile
 * 3. Return ticket URL for user to complete SSO configuration
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
        { error: 'Forbidden', message: 'You can only configure SSO for your own organization' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = ssoTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { returnUrl } = validation.data;
    const baseUrl = process.env.AUTH0_BASE_URL || 'http://localhost:4020';
    const finalReturnUrl = returnUrl || `${baseUrl}/organization-management?sso=configured`;

    console.log('🎫 Starting SSO configuration for organization:', orgId);

    // Get organization name
    const orgName = user['https://agency-inc-demo.com/org_name'] || 'Your Organization';

    // Get Management API access token
    const tokenResponse = await fetch(
      `https://${process.env.AUTH0_MGMT_DOMAIN}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: process.env.AUTH0_MGMT_CLIENT_ID!,
          client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET!,
          audience: `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/`,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      console.error('❌ Failed to get Management API token:', tokenError);
      throw new Error('Failed to get Management API token');
    }

    const { access_token } = await tokenResponse.json();

    // Step 1: Check if profile already exists in org metadata
    console.log('📋 Checking for existing profile...');

    let profileId: string | undefined;

    const orgResponse = await fetch(
      `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/organizations/${orgId}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      profileId = orgData.metadata?.self_service_profile_id;

      if (profileId) {
        console.log('✅ Found existing profile:', profileId);
      }
    }

    // Step 2: Create profile if needed
    if (!profileId) {
      console.log('🆕 Creating self-service profile...');

      const profilePayload = {
        name: `${orgName} SSO Profile`,
        description: `Self-service SSO configuration for ${orgName}`,
        allowed_strategies: ['oidc', 'samlp', 'okta', 'waad', 'adfs'],
        user_attributes: [
          {
            name: 'email',
            description: 'Email address',
            is_optional: false
          },
          {
            name: 'name',
            description: 'Full name',
            is_optional: true
          }
        ],
        branding: {
          logo_url: process.env.AUTH0_BASE_URL ? `${process.env.AUTH0_BASE_URL}/logo.png` : undefined,
          colors: {
            primary: '#00639E'
          }
        }
      };

      console.log('📤 Profile payload:', JSON.stringify(profilePayload, null, 2));

      const createProfileResponse = await fetch(
        `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/self-service-profiles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profilePayload),
        }
      );

      console.log('📥 Profile response status:', createProfileResponse.status);

      if (!createProfileResponse.ok) {
        const profileError = await createProfileResponse.json();
        console.error('❌ Failed to create profile:', {
          status: createProfileResponse.status,
          statusText: createProfileResponse.statusText,
          error: profileError
        });
        throw new Error(`Failed to create profile: ${profileError.message || profileError.error || createProfileResponse.statusText}`);
      }

      const newProfile = await createProfileResponse.json();
      profileId = newProfile.id;
      console.log('✅ Profile created successfully:', {
        id: profileId,
        name: newProfile.name,
        fullResponse: JSON.stringify(newProfile, null, 2)
      });

      // Save profile ID to org metadata
      console.log('💾 Saving profile ID to org metadata...');
      const updateOrgResponse = await fetch(
        `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/organizations/${orgId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metadata: {
              self_service_profile_id: profileId
            }
          }),
        }
      );

      if (!updateOrgResponse.ok) {
        console.warn('⚠️ Failed to save profile ID to org metadata (non-critical)');
      } else {
        console.log('✅ Profile ID saved to org metadata');
      }
    }

    // Verify profile exists before creating ticket
    console.log('🔍 Verifying profile exists:', profileId);
    const verifyProfileResponse = await fetch(
      `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/self-service-profiles/${profileId}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyProfileResponse.ok) {
      const verifyError = await verifyProfileResponse.json();
      console.warn('⚠️ Stored profile does not exist:', {
        status: verifyProfileResponse.status,
        error: verifyError,
        profileId
      });
      console.log('🔄 Profile was deleted or invalid - creating new profile...');

      // Clear stale metadata and create new profile
      profileId = undefined;

      const profilePayload = {
        name: `${orgName} SSO Profile`,
        description: `Self-service SSO configuration for ${orgName}`,
        allowed_strategies: ['oidc', 'samlp', 'okta', 'waad', 'adfs'],
        user_attributes: [
          {
            name: 'email',
            description: 'Email address',
            is_optional: false
          },
          {
            name: 'name',
            description: 'Full name',
            is_optional: true
          }
        ],
        branding: {
          logo_url: process.env.AUTH0_BASE_URL ? `${process.env.AUTH0_BASE_URL}/logo.png` : undefined,
          colors: {
            primary: '#00639E'
          }
        }
      };

      console.log('📤 Creating new profile...');

      const createProfileResponse = await fetch(
        `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/self-service-profiles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profilePayload),
        }
      );

      if (!createProfileResponse.ok) {
        const profileError = await createProfileResponse.json();
        console.error('❌ Failed to create new profile:', {
          status: createProfileResponse.status,
          error: profileError
        });
        throw new Error(`Failed to create profile: ${profileError.message || profileError.error || createProfileResponse.statusText}`);
      }

      const newProfile = await createProfileResponse.json();
      profileId = newProfile.id;
      console.log('✅ New profile created:', profileId);

      // Save new profile ID to org metadata
      console.log('💾 Updating org metadata with new profile ID...');
      await fetch(
        `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/organizations/${orgId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metadata: {
              self_service_profile_id: profileId
            }
          }),
        }
      );
      console.log('✅ Org metadata updated with new profile ID');
    } else {
      const profileData = await verifyProfileResponse.json();
      console.log('✅ Profile verified:', {
        id: profileData.id,
        name: profileData.name
      });
    }

    // Step 3: Generate SSO access ticket
    console.log('🎟️ Generating SSO ticket with profile ID:', profileId);

    const ticketPayload = {
      connection_config: {
        name: `${orgName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-sso`,
        display_name: `${orgName} SSO`,
        show_as_button: true
      },
      enabled_organizations: [
        {
          organization_id: orgId,
          assign_membership_on_login: true,
          show_as_button: true
        }
      ],
      enabled_clients: [process.env.AUTH0_CLIENT_ID!],
      ttl_sec: 432000 // 5 days
    };

    console.log('📤 Ticket payload:', JSON.stringify(ticketPayload, null, 2));
    console.log('📍 Ticket endpoint:', `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/self-service-profiles/${profileId}/sso-ticket`);

    const ticketResponse = await fetch(
      `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/self-service-profiles/${profileId}/sso-ticket`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketPayload),
      }
    );

    console.log('📥 Ticket response status:', ticketResponse.status);

    if (!ticketResponse.ok) {
      const ticketError = await ticketResponse.json();
      console.error('❌ Failed to create ticket:', {
        status: ticketResponse.status,
        statusText: ticketResponse.statusText,
        error: ticketError,
        profileId,
        endpoint: `https://${process.env.AUTH0_MGMT_DOMAIN}/api/v2/self-service-profiles/${profileId}/sso-ticket`
      });
      throw new Error(`Failed to create ticket: ${ticketError.message || ticketError.error || ticketResponse.statusText}`);
    }

    const ticketData = await ticketResponse.json();
    console.log('✅ Ticket created successfully:', {
      ticket: ticketData.ticket,
      fullResponse: JSON.stringify(ticketData, null, 2)
    });

    // The ticket URL is returned directly in the response
    const configUrl = ticketData.ticket;

    console.log('🔗 Config URL:', configUrl);

    // Log to Firestore
    try {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('audit_logs')
        .add({
          action: 'sso_ticket_generated',
          initiatedBy: user.sub,
          profileId,
          timestamp: new Date().toISOString(),
        });
    } catch (firestoreError) {
      console.error('⚠️ Failed to log to Firestore:', firestoreError);
    }

    return NextResponse.json({
      success: true,
      ticket: ticketData.ticket,
      configUrl,
      profileId,
      returnUrl: finalReturnUrl,
    });
  } catch (error: any) {
    console.error('❌ SSO ticket generation failed:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
