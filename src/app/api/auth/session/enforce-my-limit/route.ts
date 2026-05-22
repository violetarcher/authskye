import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { Auth0SessionManager } from '@/lib/auth0-session-manager';
import { getClaimKey } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const { user } = session;
    const currentSessionId = session.user[getClaimKey('session_id')];
    
    console.log(`🔥 Session enforcement started for user: ${user.sub}, currentSession: ${currentSessionId}`);

    // Enforce single session limit for current user only
    const result = await Auth0SessionManager.enforceSingleSession(
      user.sub, 
      currentSessionId
    );
    
    console.log(`🔥 Session enforcement result:`, {
      terminatedCount: result.terminatedCount,
      remainingSession: result.remainingSession?.id
    });

    return Response.json({
      success: true,
      terminatedCount: result.terminatedCount,
      remainingSession: result.remainingSession?.id,
      message: result.terminatedCount > 0 
        ? `Terminated ${result.terminatedCount} other session(s)`
        : 'No other sessions found'
    });
  } catch (error: any) {
    console.error('Session limit enforcement error:', error);
    return Response.json(
      { 
        error: 'Internal server error', 
        details: error?.message 
      },
      { status: 500 }
    );
  }
}