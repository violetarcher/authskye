// src/app/api/documents/[documentId]/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import {
  checkPermission,
  deleteTuple,
  readTuples,
  formatUserId,
  formatDocId,
} from '@/lib/fga-service';


/**
 * GET /api/documents/[documentId]
 * Get a specific document
 */
export const GET = withApiAuthRequired(async function GET(
  request: NextRequest,
  context: { params: { documentId: string } }
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

    const { documentId } = context.params;

    // Check if user can read this document
    const fgaUserId = formatUserId(user.sub);
    const fgaDocId = formatDocId(documentId);
    const canRead = await checkPermission(fgaUserId, 'can_read', fgaDocId);

    if (!canRead) {
      return NextResponse.json(
        { error: 'You do not have permission to read this document' },
        { status: 403 }
      );
    }

    // Fetch document from Firestore
    const docRef = db.collection('documents').doc(documentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const docData = doc.data();

    // FGA already verified can_read permission - no additional checks needed
    // organizationId is metadata only, not used for authorization

    // Check user's permissions
    const canWrite = await checkPermission(fgaUserId, 'can_write', fgaDocId);
    const canShare = await checkPermission(fgaUserId, 'can_share', fgaDocId);
    const canChangeOwner = await checkPermission(fgaUserId, 'can_change_owner', fgaDocId);

    return NextResponse.json({
      document: {
        id: doc.id,
        ...docData,
        canRead: true,
        canWrite,
        canShare,
        canChangeOwner,
      },
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/documents/[documentId]
 * Update a document
 */
export const PUT = withApiAuthRequired(async function PUT(
  request: NextRequest,
  context: { params: { documentId: string } }
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

    const { documentId } = context.params;

    // Check if user can write to this document
    const fgaUserId = formatUserId(user.sub);
    const fgaDocId = formatDocId(documentId);
    const canWrite = await checkPermission(fgaUserId, 'can_write', fgaDocId);

    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this document' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateDocumentSchema.safeParse(body);

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

    // Update document in Firestore
    const docRef = db.collection('documents').doc(documentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // FGA already verified can_write permission - no additional checks needed
    // organizationId is metadata only, not used for authorization

    await docRef.update(updates);

    // Fetch updated document
    const updatedDoc = await docRef.get();

    return NextResponse.json({
      document: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/documents/[documentId]
 * Delete a document
 */
export const DELETE = withApiAuthRequired(async function DELETE(
  request: NextRequest,
  context: { params: { documentId: string } }
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

    const { documentId } = context.params;

    // Check if user owns this document (only owner can delete)
    const fgaUserId = formatUserId(user.sub);
    const fgaDocId = formatDocId(documentId);
    const canChangeOwner = await checkPermission(fgaUserId, 'can_change_owner', fgaDocId);

    if (!canChangeOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this document' },
        { status: 403 }
      );
    }

    // Delete document from Firestore
    const docRef = db.collection('documents').doc(documentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // FGA already verified can_change_owner permission - no additional checks needed
    // organizationId is metadata only, not used for authorization

    await docRef.delete();

    // Delete all tuples related to this document from FGA
    const tuples = await readTuples(fgaDocId);
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
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
