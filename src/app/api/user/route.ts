import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { managementClient } from '@/lib/auth0-mgmt-client';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch fresh user data from Auth0
    const user = await managementClient.users.get({ id: session.user.sub! });

    return NextResponse.json({
      success: true,
      user: user.data
    });
  } catch (error: unknown) {
    console.error('Error fetching user data:', error);
    
    const errorObj = error as { statusCode?: number };
    if (errorObj.statusCode === 401) {
      return NextResponse.json(
        { error: 'Unauthorized: Check Management API credentials' }, 
        { status: 401 }
      );
    } else if (errorObj.statusCode === 403) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient scopes for user read' }, 
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
