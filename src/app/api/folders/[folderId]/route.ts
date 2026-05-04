// src/app/api/folders/[folderId]/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { updateFolderSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import {
  checkPermission,
  deleteTuple,
  readTuples,
  formatUserId,
  formatFolderId,
} from '@/lib/fga-service';

interface RouteParams {
  params: {
    folderId: string;
  };
}

/**
 * GET /api/folders/[folderId]
 * Get a specific folder
 */
export const GET = withApiAuthRequired(async function GET(
  request: NextRequest,
  { params }: RouteParams
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

    // Check if user can view this folder
    const fgaUserId = formatUserId(user.sub);
    const fgaFolderId = formatFolderId(folderId);
    const canView = await checkPermission(fgaUserId, 'viewer', fgaFolderId);

    if (!canView) {
      return NextResponse.json(
        { error: 'You do not have permission to view this folder' },
        { status: 403 }
      );
    }

    // Fetch folder from Firestore
    const folderRef = db.collection('folders').doc(folderId);
    const folder = await folderRef.get();

    if (!folder.exists) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folderData = folder.data();

    // Check user's permissions
    const canCreateFile = await checkPermission(fgaUserId, 'can_create_file', fgaFolderId);

    return NextResponse.json({
      folder: {
        id: folder.id,
        ...folderData,
        canView: true,
        canCreateFile,
      },
    });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/folders/[folderId]
 * Update a folder
 */
export const PUT = withApiAuthRequired(async function PUT(
  request: NextRequest,
  { params }: RouteParams
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

    // Check if user owns this folder (only owner can update)
    const fgaUserId = formatUserId(user.sub);
    const fgaFolderId = formatFolderId(folderId);
    const isOwner = await checkPermission(fgaUserId, 'owner', fgaFolderId);

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this folder' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updates = {
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };

    // Update folder in Firestore
    const folderRef = db.collection('folders').doc(folderId);
    const folder = await folderRef.get();

    if (!folder.exists) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folderData = folder.data();

    // Check if folder belongs to user's organization
    }

    await folderRef.update(updates);

    // Fetch updated folder
    const updatedFolder = await folderRef.get();

    return NextResponse.json({
      folder: {
        id: updatedFolder.id,
        ...updatedFolder.data(),
      },
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/folders/[folderId]
 * Delete a folder
 */
export const DELETE = withApiAuthRequired(async function DELETE(
  request: NextRequest,
  { params }: RouteParams
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

    // Check if user owns this folder (only owner can delete)
    const fgaUserId = formatUserId(user.sub);
    const fgaFolderId = formatFolderId(folderId);
    const isOwner = await checkPermission(fgaUserId, 'owner', fgaFolderId);

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this folder' },
        { status: 403 }
      );
    }

    // Delete folder from Firestore
    const folderRef = db.collection('folders').doc(folderId);
    const folder = await folderRef.get();

    if (!folder.exists) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folderData = folder.data();

    // Check if folder belongs to user's organization
    }

    await folderRef.delete();

    // Delete all tuples related to this folder from FGA
    const tuples = await readTuples(fgaFolderId);
    const deletedTuples = [];
    if (tuples.length > 0) {
      for (const tuple of tuples) {
        const deletedTuple = await deleteTuple(tuple);
        deletedTuples.push(deletedTuple);
      }
    }

    return NextResponse.json({
      success: true,
      tupleInfo: deletedTuples.map(tuple => ({
        operation: 'deleted' as const,
        tuple,
      })),
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
