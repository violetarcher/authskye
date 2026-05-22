import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { memberIdSchema } from '@/lib/validations';
import { getClaimKey } from '@/lib/auth-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const roles = user?.[getClaimKey('roles')] || [];

    if (!roles.includes('Admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user?.org_id;
    if (!orgId) {
      return Response.json(
        { error: 'Organization not found in session.' },
        { status: 400 }
      );
    }

    // Validate member ID
    const validationResult = memberIdSchema.safeParse({ memberId: params.memberId });
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid member ID',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { memberId } = validationResult.data;

    await managementClient.organizations.deleteMembers(
      { id: orgId },
      { members: [memberId] }
    );

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Failed to remove member:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}