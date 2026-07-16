import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

/**
 * POST /api/ciba/initiate
 *
 * Initiates a CIBA (Client-Initiated Backchannel Authentication) request.
 * This sends a push notification to the user's Auth0 Guardian app.
 *
 * CIBA Flow Documentation:
 * https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow
 *
 * Request Body:
 * {
 *   scope: string,              // OAuth scopes (e.g., "openid profile email")
 *   binding_message?: string    // Message shown to user (e.g., "Approve $500 claim")
 * }
 *
 * Returns:
 * {
 *   auth_req_id: string,  // ID to use for polling
 *   expires_in: number,   // Seconds until request expires
 *   interval: number      // Recommended polling interval
 * }
 */
export const POST = withApiAuthRequired(async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { scope = 'openid profile email', binding_message, authorization_details } = body;

    console.log('🔐 Initiating CIBA request for user:', user.sub);
    console.log('   Scope:', scope);
    console.log('   Binding message:', binding_message);

    // Construct CIBA backchannel authorization request
    // login_hint: Auth0 requires format "iss_sub" with issuer URL
    // IMPORTANT: iss must have trailing slash!
    const loginHintPayload = JSON.stringify({
      format: 'iss_sub',
      iss: `https://${process.env.AUTH0_MGMT_DOMAIN}/`,  // Trailing slash required!
      sub: user.sub
    });

    const cibaParams = new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID!,
      client_secret: process.env.AUTH0_CLIENT_SECRET!,
      scope,
      audience: process.env.CIBA_AUDIENCE!,
      login_hint: loginHintPayload,
      requested_expiry: '300',  // 300 seconds or lower triggers push notifications
    });

    if (binding_message) {
      cibaParams.append('binding_message', binding_message);
    }

    if (authorization_details) {
      cibaParams.append('authorization_details', JSON.stringify(authorization_details));
    }

    // Call Auth0 backchannel authorization endpoint
    const cibaUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/bc-authorize`;
    console.log('📤 Calling CIBA endpoint:', cibaUrl);

    const cibaResponse = await fetch(cibaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: cibaParams.toString(),
    });

    const cibaData = await cibaResponse.json();

    if (!cibaResponse.ok) {
      console.error('❌ CIBA initiation failed:', cibaData);
      return NextResponse.json(
        {
          error: 'CIBA initiation failed',
          message: cibaData.error_description || cibaData.error || 'Failed to initiate CIBA',
          details: cibaData,
        },
        { status: cibaResponse.status }
      );
    }

    console.log('✅ CIBA initiated successfully:', {
      auth_req_id: cibaData.auth_req_id,
      expires_in: cibaData.expires_in,
    });

    return NextResponse.json({
      auth_req_id: cibaData.auth_req_id,
      expires_in: cibaData.expires_in || 300, // Default 5 minutes
      interval: cibaData.interval || 5, // Default 5 seconds between polls
    });
  } catch (error: any) {
    console.error('❌ CIBA initiation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to initiate CIBA',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
