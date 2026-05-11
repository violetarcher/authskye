import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mfa/auth
 *
 * Checks if user has My Account API token.
 * If not, returns redirect URL for re-authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // For now, always redirect to get fresh My Account API token
    // This will use prompt=none for silent auth if user has active session
    const returnTo = '/profile?tab=security';
    const redirectUrl = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}&myaccount=true`;

    return NextResponse.json({
      requiresAuth: true,
      redirectUrl
    });
  } catch (error: any) {
    console.error('❌ Failed to check MFA auth:', error);

    return NextResponse.json(
      {
        error: 'Failed to check MFA authentication',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
