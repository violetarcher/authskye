import { NextRequest } from 'next/server';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { Auth0SessionManager } from '@/lib/auth0-session-manager';
import { sessionIdSchema } from '@/lib/validations';
import { getClaimKey } from '@/lib/auth-utils';

export const DELETE = withApiAuthRequired(async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const { user } = session;
    const roles = user[getClaimKey('roles')] || [];

    // Check if user is admin
    if (!roles.includes('Admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = sessionIdSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        {
          error: 'Invalid input',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { sessionId } = validationResult.data;
    const currentSessionId = session.user[getClaimKey('session_id')];
    
    // Warn if user is trying to terminate their own session
    if (sessionId === currentSessionId) {
      console.log(`⚠️ Admin ${user.sub} is terminating their own session ${sessionId}`);
    }

    // Delete the session from Auth0 (also adds to local revoked list automatically)
    await Auth0SessionManager.deleteSession(sessionId);

    return Response.json({
      success: true,
      message: `Session ${sessionId} terminated successfully`,
      sessionId,
      wasOwnSession: sessionId === currentSessionId
    });
  } catch (error: any) {
    console.error('Session termination error:', error);
    return Response.json(
      { 
        error: 'Internal server error', 
        details: error?.message 
      },
      { status: 500 }
    );
  }
});