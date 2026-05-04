// src/app/api/groups/[groupId]/route.ts
import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { updateGroupSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import { readTuples, deleteTuples, formatGroupId, type FGATuple } from '@/lib/fga-service';


/**
 * GET /api/groups/[groupId]
 * Get a specific group
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

    // Fetch group from Firestore
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = group.data();

    return NextResponse.json({
      group: {
        id: group.id,
        ...groupData,
      },
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/groups/[groupId]
 * Update a group
 */
export async function PUT(
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
        { error: 'Only admins can update groups' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    const body = await request.json();
    const validation = updateGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updates = {
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };

    // Update group in Firestore
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = group.data();

    await groupRef.update(updates);

    // Fetch updated group
    const updatedGroup = await groupRef.get();

    return NextResponse.json({
      group: {
        id: updatedGroup.id,
        ...updatedGroup.data(),
      },
    });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[groupId]
 * Delete a group
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
        { error: 'Only admins can delete groups' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    // Delete group from Firestore
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = group.data();

    await groupRef.delete();

    // Delete all tuples related to this group from FGA
    const fgaGroupId = formatGroupId(groupId);
    const tuples = await readTuples(fgaGroupId);
    let deletedTuples: FGATuple[] = [];
    if (tuples.length > 0) {
      deletedTuples = await deleteTuples(tuples);
    }

    return NextResponse.json({
      success: true,
      tupleInfo: deletedTuples.map(tuple => ({
        operation: 'deleted' as const,
        tuple,
      })),
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
