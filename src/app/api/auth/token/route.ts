import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getSession } from '@auth0/nextjs-auth0';

export const dynamic = 'force-dynamic';

/**
 * Access Token Endpoint
 *
 * This endpoint returns the Auth0 access token and ID token for the current user.
 * Used by the frontend to make authenticated requests to Kong Gateway and for profile display.
 */

export async function GET(request: NextRequest) {
  try {
    // Get the access token from the session
    const { accessToken } = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }

    // Get the session to retrieve the ID token
    const session = await getSession();
    const idToken = session?.idToken;

    return NextResponse.json({
      accessToken,
      idToken: idToken || undefined,
      domain: process.env.AUTH0_ISSUER_BASE_URL,
      expiresIn: 3600 // Auth0 tokens typically expire in 1 hour
    });

  } catch (error: any) {
    console.error('Failed to get access token:', error);

    // Handle specific error cases
    if (error.code === 'ERR_EXPIRED_ACCESS_TOKEN') {
      return NextResponse.json(
        { error: 'Access token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve access token', message: error.message },
      { status: 500 }
    );
  }
}
