import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

/**
 * On-Demand My Account API Token Exchange
 *
 * This endpoint performs token exchange to get a token specifically for My Account API.
 * Called only when the user visits the Security tab.
 *
 * Token Exchange Pattern (from a0-passkeyforms-demo):
 * - Requests a new token with audience: https://{domain}/me/
 * - Uses grant_type: urn:ietf:params:oauth:grant-type:token-exchange
 * - Requires a Custom Token Exchange (CTE) Action to be configured in Auth0
 *
 * Prerequisites:
 * 1. CTE Action deployed and linked to Token Exchange Profile
 * 2. Environment variables configured: CTE_CLIENT_ID, CTE_CLIENT_SECRET
 */

export const POST = withApiAuthRequired(async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for required environment variables
    const cteClientId = process.env.CTE_CLIENT_ID;
    const cteClientSecret = process.env.CTE_CLIENT_SECRET;
    const myAccountAudience = `${process.env.AUTH0_ISSUER_BASE_URL}/me/`;

    if (!cteClientId || !cteClientSecret) {
      console.error('❌ Missing CTE credentials in environment variables');
      return NextResponse.json(
        {
          error: 'Token exchange not configured',
          message: 'Custom Token Exchange (CTE) client credentials are missing. Please configure CTE_CLIENT_ID and CTE_CLIENT_SECRET environment variables.',
          docs: 'https://github.com/awhitmana0/a0-passkeyforms-demo/blob/main/README.md'
        },
        { status: 500 }
      );
    }

    console.log('🔄 Performing on-demand token exchange for My Account API...', {
      userId: user.sub,
      audience: myAccountAudience,
    });

    // Perform token exchange
    const tokenExchangePayload = {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: cteClientId,
      client_secret: cteClientSecret,
      audience: myAccountAudience,
      scope: 'read:me:authentication_methods create:me:authentication_methods update:me:authentication_methods delete:me:authentication_methods',
      subject_token: user.sub,
      subject_token_type: 'urn:myaccount:cte', // Custom token type - validated by CTE Action (URN format per RFC 8693)
    };

    const tokenResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenExchangePayload).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Token exchange failed:', {
        status: tokenResponse.status,
        error: errorData,
      });

      // My Account API Default Policy: step-up MFA required after 15 min
      const requiresStepUp =
        errorData.error === 'unmet_authentication_requirements' ||
        errorData.error_description?.includes('unmet_authentication_requirements') ||
        tokenResponse.status === 403;

      return NextResponse.json(
        {
          error: 'Token exchange failed',
          message: errorData.error_description || errorData.error,
          requiresStepUp,
          details: errorData,
        },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    console.log('✅ Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    // Return the My Account API token
    return NextResponse.json({
      success: true,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      audience: myAccountAudience,
      exchangedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ On-demand token exchange error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
});
