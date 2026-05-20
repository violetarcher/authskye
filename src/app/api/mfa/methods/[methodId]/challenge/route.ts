import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

/**
 * POST /api/mfa/methods/[methodId]/challenge
 *
 * Sends an OOB (Out-of-Band) challenge to the user for phone/email verification.
 * This triggers Auth0 to send an OTP code to the user's phone (SMS/voice) or email.
 *
 * For phone enrollment, after creating the enrollment, you MUST call this endpoint
 * to trigger the actual OTP delivery before the user can verify.
 *
 * Request Body:
 * {
 *   auth_session: string   // Session ID from enrollment response
 * }
 *
 * Returns:
 * - 200: Challenge sent successfully
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { methodId: string } }
) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available', message: 'Please get My Account API token first' },
        { status: 401 }
      );
    }

    const { methodId } = params;
    const body = await request.json();
    const { auth_session } = body;

    if (!auth_session) {
      return NextResponse.json(
        { error: 'Validation error', message: 'auth_session is required' },
        { status: 400 }
      );
    }

    console.log('📲 Sending OOB challenge for method:', methodId, 'for user:', user.sub);

    // Construct My Account API challenge endpoint
    const myAccountBaseUrl = process.env.AUTH0_ISSUER_BASE_URL!;
    const challengeUrl = `${myAccountBaseUrl}/me/v1/authentication-methods/${encodeURIComponent(methodId)}/challenge`;

    console.log('📤 Calling challenge endpoint:', challengeUrl);

    // Call My Account API challenge endpoint
    const response = await fetch(challengeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_session: auth_session,
      }),
    });

    console.log('📥 Challenge response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Challenge failed:', response.status, errorData);

      return NextResponse.json(
        {
          error: 'Failed to send challenge',
          message: errorData.message || errorData.error || errorData.detail || 'Could not send verification code',
          details: errorData,
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    const result = await response.json().catch(() => ({}));
    console.log('✅ Challenge sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      ...result,
    });

  } catch (error: any) {
    console.error('❌ Failed to send challenge:', error);

    return NextResponse.json(
      {
        error: 'Failed to send challenge',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
