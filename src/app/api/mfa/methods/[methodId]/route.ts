import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';


/**
 * DELETE /api/mfa/methods/[methodId]
 *
 * Removes a specific enrolled MFA method via My Account API.
 *
 * Returns:
 * - 200: Method deleted successfully
 * - 401: Unauthorized
 * - 404: Method not found
 * - 500: Server error
 */
export async function DELETE(
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

    // Get access token from Authorization header (sent by frontend)
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available', message: 'Please get My Account API token first' },
        { status: 401 }
      );
    }

    const { methodId } = params;

    console.log('🗑️ Deleting MFA method via My Account API:', methodId, 'for user:', user.sub);

    // Construct My Account API endpoint URL - use CUSTOM domain (must match token audience)
    // Token audience is https://login.authskye.org/me/, so API calls must use same domain
    const myAccountBaseUrl = process.env.AUTH0_ISSUER_BASE_URL!;
    const myAccountUrl = `${myAccountBaseUrl}/me/v1/authentication-methods/${methodId}`;

    // Call My Account API
    const response = await fetch(myAccountUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ My Account API error:', response.status, errorData);

      return NextResponse.json(
        {
          error: 'Failed to delete MFA method',
          message: errorData.message || errorData.error || 'An unexpected error occurred',
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFA method deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to delete MFA method:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete MFA method',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
