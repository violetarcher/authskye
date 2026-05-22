// src/app/api/groups/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { createGroupSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import { getClaimKey } from '@/lib/auth-utils';

/**
 * GET /api/groups
 * List all groups in the organization
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

    // Fetch all groups for the organization
    const groupsSnapshot = await db
      .collection('groups')
      .get();

    const groups = groupsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/groups
 * Create a new group
 */
export const POST = withApiAuthRequired(async function POST(request: NextRequest) {
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
    const roles = user[getClaimKey('roles')] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json(
        { error: 'Only admins can create groups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Create group in Firestore
    const groupData = {
      name,
      description: description || '',
      organizationId: user.org_id || null,
      createdBy: user.sub,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupRef = await db.collection('groups').add(groupData);

    return NextResponse.json({
      group: {
        id: groupRef.id,
        ...groupData,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
