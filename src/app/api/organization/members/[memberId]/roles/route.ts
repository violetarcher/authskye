import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { memberIdSchema, updateMemberRolesSchema } from '@/lib/validations';
import { getClaimKey } from '@/lib/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const userRoles = user?.[getClaimKey('roles')] || [];

    if (!userRoles.includes('Admin')) {
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
    const memberValidation = memberIdSchema.safeParse({ memberId: params.memberId });
    if (!memberValidation.success) {
      return Response.json(
        { 
          error: 'Invalid member ID',
          details: memberValidation.error.issues
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const bodyValidation = updateMemberRolesSchema.safeParse(body);
    if (!bodyValidation.success) {
      return Response.json(
        { 
          error: 'Invalid request body',
          details: bodyValidation.error.issues
        },
        { status: 400 }
      );
    }

    const { memberId } = memberValidation.data;
    const { roles, roleIds: requestRoleIds } = bodyValidation.data;
    const roleIds = roles || requestRoleIds || [];

    // Get the member's current roles
    const currentRolesResponse = await managementClient.organizations.getMemberRoles(
      { id: orgId, user_id: memberId }
    );
    const currentRoleIds = currentRolesResponse.data.map(role => role.id);

    // Remove all current roles, if any exist
    if (currentRoleIds.length > 0) {
      await managementClient.organizations.deleteMemberRoles(
        { id: orgId, user_id: memberId },
        { roles: currentRoleIds }
      );
    }
    
    // Add the new roles, if any were selected
    if (roleIds.length > 0) {
      await managementClient.organizations.addMemberRoles(
        { id: orgId, user_id: memberId },
        { roles: roleIds }
      );
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}