// src/app/api/documents/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { createDocumentSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import {
  checkPermission,
  writeTuple,
  formatUserId,
  formatDocId,
  formatFolderId,
  listObjects,
  type FGATuple
} from '@/lib/fga-service';

/**
 * GET /api/documents
 * List all documents the user can read
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

    // Get all documents user can read from FGA
    const fgaUserId = formatUserId(user.sub);
    const readableDocIds = await listObjects(fgaUserId, 'can_read', 'doc');

    // If no readable documents, return empty array
    if (readableDocIds.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // Extract document IDs from FGA format (doc:123 -> 123)
    const docIds = readableDocIds.map(id => id.replace('doc:', ''));

    // Fetch documents from Firestore
    const documentsRef = db.collection('documents');

    // Fetch documents in batches (Firestore 'in' query limit is 10)
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < docIds.length; i += batchSize) {
      const batch = docIds.slice(i, i + batchSize);

      // FGA already authorized these documents - just fetch them
      // No additional organizationId filtering needed
      const snapshot = await documentsRef
        .where('__name__', 'in', batch)
        .get();

      batches.push(...snapshot.docs);
    }

    const documents = batches.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/documents
 * Create a new document
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
    const validation = createDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, content, mimeType, size, parentId } = validation.data;

    // If parentId is provided, check if user can create files in that folder
    if (parentId) {
      const fgaUserId = formatUserId(user.sub);
      const fgaFolderId = formatFolderId(parentId);
      const canCreateFile = await checkPermission(fgaUserId, 'can_create_file', fgaFolderId);

      if (!canCreateFile) {
        return NextResponse.json(
          { error: 'You do not have permission to create files in this folder' },
          { status: 403 }
        );
      }
    }

    // Create document in Firestore
    const docRef = await db.collection('documents').add({
      name,
      content: content || '',
      mimeType: mimeType || 'text/plain',
      size: size || 0,
      parentId: parentId || null,
      ownerId: user.sub,
      organizationId: user.org_id || null, // null for non-org users
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const documentId = docRef.id;

    // Write ownership tuple to FGA
    const fgaUserId = formatUserId(user.sub);
    const fgaDocId = formatDocId(documentId);

    const tuples: FGATuple[] = [
      {
        user: fgaUserId,
        relation: 'owner',
        object: fgaDocId,
      },
    ];

    // If document is in a folder, add parent relationship
    if (parentId) {
      tuples.push({
        user: formatFolderId(parentId),
        relation: 'parent',
        object: fgaDocId,
      });
    }

    const createdTuples = [];
    const tuple1 = await writeTuple(tuples[0]);
    createdTuples.push(tuple1);

    if (tuples.length > 1) {
      const tuple2 = await writeTuple(tuples[1]);
      createdTuples.push(tuple2);
    }

    // Fetch the created document
    const doc = await docRef.get();

    return NextResponse.json(
      {
        document: {
          id: doc.id,
          ...doc.data(),
        },
        tupleInfo: createdTuples.map(tuple => ({
          operation: 'created' as const,
          tuple,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
