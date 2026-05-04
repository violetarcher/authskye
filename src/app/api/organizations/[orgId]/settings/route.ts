import { NextRequest, NextResponse } from 'next/server';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { updateOrganizationSettingsSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';

/**
 * GET /api/organizations/[orgId]/settings
 *
 * Fetch organization settings from Auth0.
 * Admin-only endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const roles = user?.['https://agency-inc-demo.com/roles'] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user belongs to this organization
    if (user.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only access your own organization settings' },
        { status: 403 }
      );
    }

    // Fetch organization from Auth0
    const organization = await managementClient.organizations.get({
      id: orgId,
    });

    return NextResponse.json({
      id: organization.data.id,
      name: organization.data.name,
      display_name: organization.data.display_name,
      metadata: organization.data.metadata || {},
    });
  } catch (error: any) {
    console.error('Failed to fetch organization settings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * PATCH /api/organizations/[orgId]/settings
 *
 * Update organization settings in Auth0 and Firestore.
 * Admin-only endpoint.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const roles = user?.['https://agency-inc-demo.com/roles'] || [];
    if (!roles.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user belongs to this organization
    if (user.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only update your own organization settings' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('📥 Received update request:', body);

    const validation = updateOrganizationSettingsSchema.safeParse(body);

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.issues,
          message: validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Get current organization data
    const currentOrg = await managementClient.organizations.get({
      id: orgId,
    });

    // Prepare update payload
    const updatePayload: any = {};

    if (updates.name !== undefined) {
      updatePayload.name = updates.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    if (updates.display_name !== undefined) {
      updatePayload.display_name = updates.display_name;
    }

    // Update metadata
    const currentMetadata = currentOrg.data.metadata || {};
    const newMetadata: any = { ...currentMetadata };

    if (updates.logo_url !== undefined) {
      newMetadata.logo_url = updates.logo_url;
    }
    if (updates.website !== undefined) {
      newMetadata.website = updates.website;
    }
    if (updates.industry !== undefined) {
      newMetadata.industry = updates.industry;
    }

    updatePayload.metadata = newMetadata;

    // Update in Auth0
    await managementClient.organizations.update(
      { id: orgId },
      updatePayload
    );

    console.log('✅ Organization updated in Auth0:', orgId);

    // Log to Firestore audit trail
    try {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('audit_logs')
        .add({
          action: 'settings_updated',
          initiatedBy: user.sub,
          updates: Object.keys(updates),
          timestamp: new Date().toISOString(),
        });
    } catch (firestoreError) {
      console.error('⚠️ Failed to log to Firestore:', firestoreError);
      // Don't fail the update if Firestore logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Organization settings updated successfully',
    });
  } catch (error: any) {
    console.error('Failed to update organization settings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}
