import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/firebase-admin';

/**
 * GET /api/claims/list
 *
 * Lists all claims for the current user.
 *
 * Returns:
 * {
 *   success: true,
 *   claims: Claim[]
 * }
 */
export const GET = withApiAuthRequired(async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    console.log('📋 Claims list - Session check:', {
      hasSession: !!session,
      hasUser: !!user,
      hasSub: !!user?.sub,
      hasOrgId: !!user?.org_id,
    });

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    const orgId = user.org_id || 'default-org';

    console.log('📋 Fetching claims for user:', user.sub);

    // Query claims for this user (simplified to avoid composite index requirement)
    const claimsSnapshot = await db
      .collection('claims')
      .where('userId', '==', user.sub)
      .limit(50)
      .get();

    // Filter by org and sort in memory
    const claims = claimsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((claim: any) => claim.organizationId === orgId)
      .sort((a: any, b: any) => {
        // Sort by submittedAt descending
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });

    console.log('✅ Found claims:', claims.length);

    return NextResponse.json({
      success: true,
      claims,
      count: claims.length,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch claims:', error);

    // If index doesn't exist yet, return empty array
    if (error.message && error.message.includes('index')) {
      console.log('⚠️ Firestore index not created yet, returning empty array');
      return NextResponse.json({
        success: true,
        claims: [],
        count: 0,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch claims',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
