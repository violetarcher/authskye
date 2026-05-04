// src/app/api/folders/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { createFolderSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import {
  checkPermission,
  writeTuple,
  formatUserId,
  formatFolderId,
  listObjects,
  type FGATuple
} from '@/lib/fga-service';

/**
 * GET /api/folders
 * List all folders the user can view
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

    // Get all folders user can view from FGA
    const fgaUserId = formatUserId(user.sub);
    const viewableFolderIds = await listObjects(fgaUserId, 'viewer', 'folder');

    // If no viewable folders, return empty array
    if (viewableFolderIds.length === 0) {
      return NextResponse.json({ folders: [] });
    }

    // Extract folder IDs from FGA format (folder:123 -> 123)
    const folderIds = viewableFolderIds.map(id => id.replace('folder:', ''));

    // Fetch folders from Firestore
    const foldersRef = db.collection('folders');

    // Fetch folders in batches (Firestore 'in' query limit is 10)
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < folderIds.length; i += batchSize) {
      const batch = folderIds.slice(i, i + batchSize);

      // FGA already authorized these folders - just fetch them
      const snapshot = await foldersRef
        .where('__name__', 'in', batch)
        .get();

      batches.push(...snapshot.docs);
    }

    const folders = batches.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/folders
 * Create a new folder
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

    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, parentId } = validation.data;

    // If parentId is provided, check if user can create files in that folder
    if (parentId) {
      const fgaUserId = formatUserId(user.sub);
      const fgaFolderId = formatFolderId(parentId);
      const canCreateFile = await checkPermission(fgaUserId, 'can_create_file', fgaFolderId);

      if (!canCreateFile) {
        return NextResponse.json(
          { error: 'You do not have permission to create folders in this location' },
          { status: 403 }
        );
      }
    }

    // Create folder in Firestore
    const folderRef = await db.collection('folders').add({
      name,
      parentId: parentId || null,
      ownerId: user.sub,
      organizationId: user.org_id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const folderId = folderRef.id;

    // Write ownership tuple to FGA
    const fgaUserId = formatUserId(user.sub);
    const fgaFolderId = formatFolderId(folderId);

    const tuples: FGATuple[] = [
      {
        user: fgaUserId,
        relation: 'owner',
        object: fgaFolderId,
      },
    ];

    // If folder is in a parent folder, add parent relationship
    if (parentId) {
      tuples.push({
        user: formatFolderId(parentId),
        relation: 'parent',
        object: fgaFolderId,
      });
    }

    const createdTuples = [];
    const tuple1 = await writeTuple(tuples[0]);
    createdTuples.push(tuple1);

    if (tuples.length > 1) {
      const tuple2 = await writeTuple(tuples[1]);
      createdTuples.push(tuple2);
    }

    // Fetch the created folder
    const folder = await folderRef.get();

    return NextResponse.json(
      {
        folder: {
          id: folder.id,
          ...folder.data(),
        },
        tupleInfo: createdTuples.map(tuple => ({
          operation: 'created' as const,
          tuple,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
