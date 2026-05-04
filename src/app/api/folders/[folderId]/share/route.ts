// src/app/api/folders/[folderId]/share/route.ts
import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { shareDocumentSchema } from '@/lib/validations';
import {
  checkPermission,
  writeTuple,
  deleteTuple,
  formatUserId,
  formatFolderId,
} from '@/lib/fga-service';


/**
 * POST /api/folders/[folderId]/share
 * Share a folder with a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { folderId: string } }
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

    const { folderId } = params;

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

    const body = await request.json();
    const validation = shareDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId, permission } = validation.data;

    // For folders, we support 'viewer' and 'owner' permissions
    // Map 'viewer' to 'viewer' relation on folder
    const folderRelation = permission === 'viewer' ? 'viewer' : 'owner';

    // Write tuple to FGA
    const targetUserId = formatUserId(userId);
    const tuple = await writeTuple({
      user: targetUserId,
      relation: folderRelation,
      object: fgaFolderId,
    });

    return NextResponse.json({
      success: true,
      message: `Folder shared with user ${userId} as ${folderRelation}`,
      tupleInfo: {
        operation: 'created',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error sharing folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[folderId]/share
 * Revoke access to a folder
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { folderId: string } }
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

    const { folderId } = params;

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

    const body = await request.json();
    const validation = shareDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId, permission } = validation.data;

    // Map permission to folder relation
    const folderRelation = permission === 'viewer' ? 'viewer' : 'owner';

    // Delete tuple from FGA
    const targetUserId = formatUserId(userId);
    const tuple = await deleteTuple({
      user: targetUserId,
      relation: folderRelation,
      object: fgaFolderId,
    });

    return NextResponse.json({
      success: true,
      message: `Access revoked for user ${userId}`,
      tupleInfo: {
        operation: 'deleted',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error revoking folder access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
