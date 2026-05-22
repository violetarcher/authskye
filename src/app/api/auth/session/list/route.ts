import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getClaimKey } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
import { Auth0SessionManager } from '@/lib/auth0-session-manager';
import { managementClient } from '@/lib/auth0-mgmt-client';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = session;
    const roles = user[getClaimKey('roles')] || [];

    // Check if user is admin
    if (!roles.includes('Admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get organization ID
    const orgId = user[getClaimKey('org_id')];
    if (!orgId) {
      return Response.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Get current session ID from the user's token
    const currentSessionId = user[getClaimKey('session_id')];

    // Get all organization members
    const membersResponse = await managementClient.organizations.getMembers({ id: orgId });
    const members = membersResponse.data;

    // Get sessions for each member
    const allSessionsData = await Promise.allSettled(
      members.map(async (member) => {
        try {
          const userSessions = await Auth0SessionManager.getUserSessions(member.user_id);
          return {
            userId: member.user_id,
            userEmail: member.email,
            userName: member.name || member.email,
            sessions: userSessions
          };
        } catch (error: any) {
          console.error(`Failed to get sessions for user ${member.user_id}:`, error);
          return {
            userId: member.user_id,
            userEmail: member.email,
            userName: member.name || member.email,
            sessions: [],
            error: error.message
          };
        }
      })
    );

    // Process results and flatten sessions
    const organizationSessions: any[] = [];
    let totalActiveSessions = 0;
    let currentUserSessions = 0;

    allSessionsData.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.sessions.length > 0) {
        result.value.sessions.forEach((session) => {
          const isCurrentUser = result.value.userId === user.sub;
          const isCurrentSession = session.id === currentSessionId;
          
          if (isCurrentUser) {
            currentUserSessions++;
          }

          organizationSessions.push({
            id: session.id,
            userId: result.value.userId,
            userEmail: result.value.userEmail,
            userName: result.value.userName,
            createdAt: session.created_at,
            lastActivity: session.updated_at,
            lastInteracted: session.last_interacted_at,
            expiresAt: session.expires_at,
            idleExpiresAt: session.idle_expires_at,
            device: {
              userAgent: session.device?.last_user_agent || session.device?.initial_user_agent,
              ipAddress: session.device?.last_ip || session.device?.initial_ip,
              asn: session.device?.last_asn || session.device?.initial_asn
            },
            clients: session.clients || [],
            authentication: session.authentication || { methods: [] },
            isCurrentUser,
            isCurrentSession
          });
          totalActiveSessions++;
        });
      }
    });

    // Sort sessions by last activity (most recent first)
    organizationSessions.sort((a, b) => 
      new Date(b.lastInteracted).getTime() - new Date(a.lastInteracted).getTime()
    );

    // Count unique users with active sessions
    const uniqueUsers = new Set(organizationSessions.map(s => s.userId)).size;

    return Response.json({
      success: true,
      sessions: organizationSessions,
      stats: {
        totalSessions: totalActiveSessions,
        uniqueUsers,
        currentUserSessions,
        organizationMembers: members.length
      },
      organizationId: orgId,
      currentSessionId,
      userId: user.sub
    });
    
  } catch (error: any) {
    console.error('Organization session list error:', error);
    return Response.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}