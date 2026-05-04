// src/app/api/users/lookup/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { managementClient } from '@/lib/auth0-mgmt-client';

// Lookup users by email

/**
 * GET /api/users/lookup?email=user@example.com
 * Look up a user by email address
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

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Get Auth0 Management API client
    const auth0 = managementClient;

    let foundUser: any;

    if (user.org_id) {
      // Organization user: search within organization
      const orgMembers = await auth0.organizations.getMembers({
        id: user.org_id,
      });

      if (!orgMembers.data || orgMembers.data.length === 0) {
        return NextResponse.json(
          { error: 'No users found in your organization' },
          { status: 404 }
        );
      }

      foundUser = orgMembers.data.find((member: any) =>
        member.email?.toLowerCase() === email.toLowerCase()
      );

      if (!foundUser) {
        return NextResponse.json(
          { error: 'User not found in your organization' },
          { status: 404 }
        );
      }
    } else {
      // Non-org user: search all users by email
      const users = await auth0.users.getAll({
        q: `email:"${email}"`,
        search_engine: 'v3'
      });

      if (!users.data || users.data.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      foundUser = users.data[0];
    }

    return NextResponse.json({
      user_id: foundUser.user_id,
      email: foundUser.email,
      name: foundUser.name,
    });
  } catch (error: any) {
    console.error('Error looking up user:', error);
    return NextResponse.json(
      { error: 'Failed to lookup user', message: error.message },
      { status: 500 }
    );
  }
});
