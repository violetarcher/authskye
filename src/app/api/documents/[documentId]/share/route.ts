// src/app/api/documents/[documentId]/share/route.ts
import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';
import { shareDocumentSchema } from '@/lib/validations';
import {
  checkPermission,
  writeTuple,
  deleteTuple,
  formatUserId,
  formatDocId,
} from '@/lib/fga-service';


/**
 * POST /api/documents/[documentId]/share
 * Share a document with a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
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

    const { documentId } = params;

    // Check if user can share this document
    const fgaUserId = formatUserId(user.sub);
    const fgaDocId = formatDocId(documentId);
    const canShare = await checkPermission(fgaUserId, 'can_share', fgaDocId);

    if (!canShare) {
      return NextResponse.json(
        { error: 'You do not have permission to share this document' },
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

    // Write tuple to FGA
    const targetUserId = formatUserId(userId);
    const tuple = await writeTuple({
      user: targetUserId,
      relation: permission,
      object: fgaDocId,
    });

    return NextResponse.json({
      success: true,
      message: `Document shared with user ${userId} as ${permission}`,
      tupleInfo: {
        operation: 'created',
        tuple,
      },
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[documentId]/share
 * Revoke access to a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
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

    const { documentId } = params;

    // Check if user can share this document
    const fgaUserId = formatUserId(user.sub);
    const fgaDocId = formatDocId(documentId);
    const canShare = await checkPermission(fgaUserId, 'can_share', fgaDocId);

    if (!canShare) {
      return NextResponse.json(
        { error: 'You do not have permission to manage sharing for this document' },
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

    // Delete tuple from FGA
    const targetUserId = formatUserId(userId);
    const tuple = await deleteTuple({
      user: targetUserId,
      relation: permission,
      object: fgaDocId,
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
    console.error('Error revoking document access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
