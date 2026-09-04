import { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const userId = user.sub;

    if (!userId) {
      return Response.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    console.log('📥 Received preference update:', body);

    const ALLOWED_KEYS = ['po_approval_alerts', 'budget_threshold_alerts', 'vendor_notifications', 'inventory_reports'];
    const STALE_KEYS = ['bet_confirmations', 'win_loss_alerts', 'promotional_offers', 'responsible_gaming', 'refill_reminders', 'pickup_alerts', 'auto_refill', 'generic_substitution', 'auto_sync', 'security_alerts', 'email_notifications', 'activity_alerts', 'usage_reports', 'api_webhooks'];

    const filtered = Object.fromEntries(
      Object.entries(body).filter(([k]) => ALLOWED_KEYS.includes(k))
    );

    if (Object.keys(filtered).length === 0) {
      return Response.json({ error: 'No valid preference keys provided' }, { status: 400 });
    }

    // Get current user metadata
    const userDetails = await managementClient.users.get({ id: userId });
    const currentMetadata = userDetails.data.user_metadata || {};
    console.log('📋 Current metadata:', currentMetadata);

    // Merge new preferences, stripping stale keys
    const updatedMetadata = { ...currentMetadata, ...filtered };
    STALE_KEYS.forEach(k => delete updatedMetadata[k]);
    console.log('✅ Updated metadata:', updatedMetadata);

    // Update user_metadata in Auth0
    await managementClient.users.update(
      { id: userId },
      { user_metadata: updatedMetadata }
    );

    console.log('💾 Successfully saved to Auth0');

    return Response.json({
      success: true,
      message: 'Preferences updated successfully',
      metadata: updatedMetadata
    });
  } catch (error: any) {
    console.error('Failed to update user preferences:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}
