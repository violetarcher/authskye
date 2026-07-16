import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired } from '@auth0/nextjs-auth0';

/**
 * POST /api/ciba/poll
 *
 * Polls for the status of a CIBA authentication request.
 * The client should call this endpoint repeatedly until receiving approved/denied/expired.
 *
 * CIBA Polling Documentation:
 * https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow/mobile-push-notifications-with-ciba
 *
 * Request Body:
 * {
 *   auth_req_id: string  // The auth_req_id from initiate endpoint
 * }
 *
 * Returns:
 * {
 *   status: 'pending' | 'approved' | 'denied' | 'expired',
 *   access_token?: string,  // Only if approved
 *   id_token?: string       // Only if approved
 * }
 */
export const POST = withApiAuthRequired(async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { auth_req_id } = body;

    if (!auth_req_id) {
      return NextResponse.json(
        { error: 'Missing auth_req_id', message: 'auth_req_id is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Polling CIBA status for auth_req_id:', auth_req_id);

    // Poll Auth0 token endpoint with CIBA grant type
    const tokenParams = new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID!,
      client_secret: process.env.AUTH0_CLIENT_SECRET!,
      grant_type: 'urn:openid:params:grant-type:ciba',
      auth_req_id,
    });

    const tokenUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    console.log('📥 Auth0 token response:', {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      error: tokenData.error,
      hasAccessToken: !!tokenData.access_token,
    });

    // Handle different response scenarios
    if (tokenResponse.ok && tokenData.access_token) {
      // User approved - we got tokens!
      console.log('✅ CIBA approved - received tokens');
      return NextResponse.json({
        status: 'approved',
        access_token: tokenData.access_token,
        id_token: tokenData.id_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        authorization_details: tokenData.authorization_details ?? null,
      });
    } else if (tokenData.error === 'authorization_pending') {
      // Still waiting for user approval
      console.log('⏳ CIBA pending - waiting for user approval');
      return NextResponse.json({
        status: 'pending',
        message: 'Waiting for user approval',
      });
    } else if (tokenData.error === 'slow_down') {
      // Auth0 wants us to slow down polling
      console.log('🐌 CIBA slow_down - Auth0 requests slower polling');
      return NextResponse.json({
        status: 'pending',
        message: 'Slow down polling',
      });
    } else if (tokenData.error === 'access_denied') {
      // User denied the request
      console.log('❌ CIBA denied - user rejected');
      return NextResponse.json({
        status: 'denied',
        message: 'User denied the authentication request',
      });
    } else if (tokenData.error === 'expired_token') {
      // Request expired
      console.log('⏰ CIBA expired - request timed out');
      return NextResponse.json({
        status: 'expired',
        message: 'Authentication request expired',
      });
    } else {
      // Unknown error - treat as pending to keep polling
      console.warn('⚠️ Unknown CIBA poll response:', {
        status: tokenResponse.status,
        error: tokenData.error,
        error_description: tokenData.error_description,
      });
      return NextResponse.json({
        status: 'pending',
        message: tokenData.error_description || 'Waiting for approval',
      });
    }
  } catch (error: any) {
    console.error('❌ CIBA poll error:', error);

    return NextResponse.json(
      {
        status: 'expired',
        error: 'Poll failed',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
