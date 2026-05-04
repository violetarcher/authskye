import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';


/**
 * POST /api/mfa/methods/[methodId]/verify
 *
 * Verifies and completes enrollment of an authentication method.
 *
 * Request Body (OTP-based - SMS, Email, TOTP):
 * {
 *   code: string,          // 6-digit verification code
 *   auth_session: string   // Session ID from enrollment response
 * }
 *
 * Request Body (WebAuthn - Biometric):
 * {
 *   credential: object,    // PublicKeyCredential from navigator.credentials.create()
 *   auth_session: string   // Session ID from enrollment response
 * }
 *
 * Returns:
 * - 200: Method verified and enrollment completed
 * - 400: Invalid code/credential or verification failed
 * - 401: Unauthorized
 * - 500: Server error
 */
export const POST = withApiAuthRequired(async function POST(
  request: NextRequest,
  context: { params: { methodId: string } }
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

    const { methodId } = context.params;
    const body = await request.json();
    const { code, credential, authn_response, auth_session } = body;

    if (!auth_session) {
      return NextResponse.json(
        { error: 'Validation error', message: 'auth_session is required' },
        { status: 400 }
      );
    }

    // Note: push-notification doesn't require code/credential - Guardian handles approval
    // Only OTP, WebAuthn, and passkey need additional verification data

    console.log('✅ Verifying MFA method:', methodId, 'for user:', user.sub);

    // Construct My Account API verification endpoint
    const myAccountBaseUrl = process.env.AUTH0_ISSUER_BASE_URL!;
    const verifyUrl = `${myAccountBaseUrl}/me/v1/authentication-methods/${encodeURIComponent(methodId)}/verify`;

    console.log('📤 Calling verification endpoint:', verifyUrl);

    // Build verification request based on type
    let verifyRequest: any = {
      auth_session: auth_session
    };

    if (code) {
      // OTP-based verification (SMS, email, TOTP)
      verifyRequest.otp_code = code;
    } else if (authn_response) {
      // Passkey verification - Auth0 expects 'authn_response'
      verifyRequest.authn_response = authn_response;
    } else if (credential) {
      // WebAuthn credential verification
      verifyRequest.credential = credential;
    }

    console.log('📦 Verification request:', {
      ...verifyRequest,
      credential: credential ? '[CREDENTIAL DATA]' : undefined,
      authn_response: authn_response ? '[AUTHN RESPONSE DATA]' : undefined
    });

    // Call My Account API verification endpoint
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyRequest),
    });

    console.log('📥 Verification response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Verification failed:', response.status, errorData);

      return NextResponse.json(
        {
          error: 'Verification failed',
          message: errorData.message || errorData.error || errorData.detail || 'Invalid verification code',
          details: errorData,
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Verification successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Authentication method verified successfully',
      method: result,
    });

  } catch (error: any) {
    console.error('❌ Failed to verify MFA method:', error);

    return NextResponse.json(
      {
        error: 'Failed to verify MFA method',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
