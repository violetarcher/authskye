import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';

/**
 * GET /api/guardian/check-enrollment
 *
 * Checks if the current user has Guardian push notification enrolled.
 * Used before CIBA flow to ensure the user can receive push notifications.
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

    // Get user's MFA enrollments via Management API
    const enrollments = await managementClient.users.getEnrollments({
      id: user.sub
    });

    // Check for Guardian/push-notification enrollment
    const guardianEnrollment = enrollments.data.find(
      (e: any) => e.auth_method === 'guardian' ||
                  e.auth_method === 'push-notification' ||
                  e.type === 'push-notification'
    );

    const enrolled = !!guardianEnrollment;
    console.log('✅ Guardian enrolled:', enrolled);

    return NextResponse.json({
      enrolled,
      enrollment: guardianEnrollment || null,
    });
  } catch (error: any) {
    console.error('❌ Failed to check Guardian enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to check enrollment', message: error.message },
      { status: 500 }
    );
  }
});
