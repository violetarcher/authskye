// src/app/api/groups/[groupId]/members/route.ts
import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { addGroupMemberSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import { addUserToGroup, removeUserFromGroup, getGroupMembers } from '@/lib/fga-service';
import { managementClient } from '@/lib/auth0-mgmt-client';

/**
 * GET /api/groups/[groupId]/members
 * Get all members of a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { groupId } = params;

    // Verify group exists and belongs to user's organization
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = group.data();

    // Get member user IDs from FGA
    const memberUserIds = await getGroupMembers(groupId);

    // Fetch user details from Auth0
    const auth0 = managementClient;
    const members = [];

    for (const userId of memberUserIds) {
      try {
        const userDetails = await auth0.users.get({ id: userId });
        members.push({
          userId: userDetails.data.user_id,
          email: userDetails.data.email,
          name: userDetails.data.name,
          addedAt: new Date().toISOString(), // We don't track this in FGA, but could be added
        });
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        // Continue even if one user fails
      }
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[groupId]/members
 * Add a member to a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const roles = user['https://agency-inc-demo.com/roles'] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json(
        { error: 'Only admins can add group members' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    // Verify group exists and belongs to user's organization
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = group.data();

    const body = await request.json();
    const validation = addGroupMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Verify user exists in the organization
    const auth0 = managementClient;
    const orgMembers = await auth0.organizations.getMembers({
      id: user.org_id,
    });

    const memberExists = orgMembers.data.some((member: any) => member.user_id === userId);
    if (!memberExists) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 404 }
      );
    }

    // Add user to group in FGA
    const tuple = await addUserToGroup(userId, groupId);

    return NextResponse.json({
      success: true,
      message: `User ${userId} added to group`,
      tupleInfo: {
        operation: 'created',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error adding group member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[groupId]/members
 * Remove a member from a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const roles = user['https://agency-inc-demo.com/roles'] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json(
        { error: 'Only admins can remove group members' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    // Verify group exists and belongs to user's organization
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = group.data();

    const body = await request.json();
    const validation = addGroupMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Remove user from group in FGA
    const tuple = await removeUserFromGroup(userId, groupId);

    return NextResponse.json({
      success: true,
      message: `User ${userId} removed from group`,
      tupleInfo: {
        operation: 'deleted',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
