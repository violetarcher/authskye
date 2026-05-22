import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';

/**
 * GET /api/guardian/check-enrollment
 *
 * Checks if the current user has Guardian push notification enrolled.
 * Used before CIBA flow to ensure the user can receive push notifications.
 *
 * Checks multiple Auth0 API endpoints because Guardian enrollments may be stored separately:
 * 1. /api/v2/users/{id}/enrollments - Standard MFA enrollments (SMS, TOTP, etc.)
 * 2. /api/v2/guardian/enrollments - Guardian-specific enrollments (push notifications)
 */
export const GET = withApiAuthRequired(async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔍 Checking Guardian enrollment for user:', user.sub);

    // Get Management API token
    const domain = process.env.AUTH0_MGMT_DOMAIN;
    const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_MGMT_CLIENT_ID,
        client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
        audience: `https://${domain}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });
    const { access_token } = await tokenResponse.json();

    // 1. Get user's standard MFA enrollments
    const userEnrollmentsResponse = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(user.sub)}/enrollments`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const userEnrollments = await userEnrollmentsResponse.json();
    console.log('📋 User MFA enrollments:', JSON.stringify(userEnrollments, null, 2));

    // 2. Get ALL Guardian enrollments and filter by user
    // This is the Guardian-specific endpoint that stores push notification enrollments
    const guardianEnrollmentsResponse = await fetch(
      `https://${domain}/api/v2/guardian/enrollments`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const allGuardianEnrollments = await guardianEnrollmentsResponse.json();
    console.log('📋 All Guardian enrollments count:', Array.isArray(allGuardianEnrollments) ? allGuardianEnrollments.length : 'not an array');

    // Filter Guardian enrollments for this user
    const userGuardianEnrollments = Array.isArray(allGuardianEnrollments)
      ? allGuardianEnrollments.filter((e: any) => e.user_id === user.sub)
      : [];
    console.log('📋 User Guardian enrollments:', JSON.stringify(userGuardianEnrollments, null, 2));

    // 3. Also try the user's authentication methods endpoint
    const authMethodsResponse = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(user.sub)}/authentication-methods`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    let authMethods: any[] = [];
    if (authMethodsResponse.ok) {
      const authMethodsData = await authMethodsResponse.json();
      authMethods = Array.isArray(authMethodsData) ? authMethodsData : (authMethodsData.authenticators || []);
      console.log('📋 User authentication methods:', JSON.stringify(authMethods, null, 2));
    } else {
      console.log('⚠️ Authentication methods endpoint returned:', authMethodsResponse.status);
    }

    // Combine all sources
    const allEnrollments = [
      ...(Array.isArray(userEnrollments) ? userEnrollments : []),
      ...userGuardianEnrollments,
      ...authMethods,
    ];

    // Check for Guardian/push-notification enrollment
    // Guardian push can appear with various field names depending on the endpoint
    const guardianEnrollment = allEnrollments.find(
      (e: any) =>
        // From /api/v2/guardian/enrollments
        e.status === 'confirmed' ||
        // From /api/v2/users/{id}/enrollments
        e.auth_method === 'guardian' ||
        e.auth_method === 'push-notification' ||
        e.type === 'push-notification' ||
        e.type === 'guardian' ||
        e.name === 'guardian' ||
        // OOB (out-of-band) authentication
        e.authenticator_type === 'oob' ||
        (e.oob_channel === 'auth0' || e.oob_channel === 'guardian') ||
        // From authentication-methods
        e.type === 'push'
    );

    const enrolled = !!guardianEnrollment;
    console.log('✅ Guardian enrolled:', enrolled);
    if (guardianEnrollment) {
      console.log('✅ Found enrollment:', JSON.stringify(guardianEnrollment));
    }

    return NextResponse.json({
      enrolled,
      enrollment: guardianEnrollment || null,
      allEnrollments: allEnrollments,
      sources: {
        userEnrollments: Array.isArray(userEnrollments) ? userEnrollments.length : 0,
        guardianEnrollments: userGuardianEnrollments.length,
        authMethods: authMethods.length,
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to check Guardian enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to check enrollment', message: error.message },
      { status: 500 }
    );
  }
});
