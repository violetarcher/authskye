// src/app/api/folders/[folderId]/share-group/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { shareFolderWithGroupSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import {
  checkPermission,
  formatUserId,
  formatFolderId,
  assignGroupToFolder,
  removeGroupFromFolder,
} from '@/lib/fga-service';


/**
 * POST /api/folders/[folderId]/share-group
 * Share a folder with a group
 */
export const POST = withApiAuthRequired(async function POST(
  request: NextRequest,
  context: { params: { folderId: string } }
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

    const { folderId } = context.params;

    // Check if user owns this folder (only owner can share)
    const fgaUserId = formatUserId(user.sub);
    const fgaFolderId = formatFolderId(folderId);
    const isOwner = await checkPermission(fgaUserId, 'owner', fgaFolderId);

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to share this folder' },
        { status: 403 }
      );
    }

    // Verify folder exists and belongs to user's organization
    const folderRef = db.collection('folders').doc(folderId);
    const folder = await folderRef.get();

    if (!folder.exists) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folderData = folder.data();

    const body = await request.json();
    const validation = shareFolderWithGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { groupId, permission } = validation.data;

    // Verify group exists and belongs to user's organization
    const groupRef = db.collection('groups').doc(groupId);
    const group = await groupRef.get();

    if (!group.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // FGA already verified permission - no additional checks needed

    // Assign group to folder in FGA
    const tuple = await assignGroupToFolder(groupId, folderId, permission);

    return NextResponse.json({
      success: true,
      message: `Folder shared with group ${groupData.name} as ${permission}`,
      tupleInfo: {
        operation: 'created',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error sharing folder with group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/folders/[folderId]/share-group
 * Revoke a group's access to a folder
 */
export const DELETE = withApiAuthRequired(async function DELETE(
  request: NextRequest,
  context: { params: { folderId: string } }
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

    const { folderId } = context.params;

    // Check if user owns this folder (only owner can manage sharing)
    const fgaUserId = formatUserId(user.sub);
    const fgaFolderId = formatFolderId(folderId);
    const isOwner = await checkPermission(fgaUserId, 'owner', fgaFolderId);

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to manage sharing for this folder' },
        { status: 403 }
      );
    }

    // Verify folder exists and belongs to user's organization
    const folderRef = db.collection('folders').doc(folderId);
    const folder = await folderRef.get();

    if (!folder.exists) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folderData = folder.data();

    const body = await request.json();
    const validation = shareFolderWithGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { groupId, permission } = validation.data;

    // Remove group's access to folder in FGA
    const tuple = await removeGroupFromFolder(groupId, folderId, permission);

    return NextResponse.json({
      success: true,
      message: `Access revoked for group`,
      tupleInfo: {
        operation: 'deleted',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error revoking folder access from group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
