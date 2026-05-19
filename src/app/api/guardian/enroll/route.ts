import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

/**
 * POST /api/guardian/enroll
 *
 * Creates a Guardian push notification enrollment ticket for the current user.
 * Uses the `factor` parameter to force push-notification enrollment only.
 *
 * Ref: https://auth0.com/docs/api/management/v2/guardian/post-ticket
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

    console.log('🎫 Creating Guardian push enrollment ticket for user:', user.sub);

    const domain = process.env.AUTH0_MGMT_DOMAIN;
    const token = await getManagementToken();

    // Use raw API call to include `factor` parameter
    // This forces enrollment to only show push-notification option
    const response = await fetch(`https://${domain}/api/v2/guardian/enrollments/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: user.sub,
        send_mail: false,
        factor: 'push-notification', // Force push notification only (works with Universal Login)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Guardian API error:', errorData);
      throw new Error(errorData.message || errorData.error || 'Failed to create enrollment ticket');
    }

    const ticket = await response.json();
    console.log('✅ Guardian push enrollment ticket created:', JSON.stringify(ticket, null, 2));

    return NextResponse.json({
      ticket_id: ticket.ticket_id,
      ticket_url: ticket.ticket_url,
    });
  } catch (error: any) {
    console.error('❌ Failed to create Guardian enrollment ticket:', error);

    return NextResponse.json(
      { error: 'Failed to create enrollment', message: error.message },
      { status: 500 }
    );
  }
});

// Get Management API token
async function getManagementToken(): Promise<string> {
  const domain = process.env.AUTH0_MGMT_DOMAIN;
  const clientId = process.env.AUTH0_MGMT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET;

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Management API token');
  }

  const data = await response.json();
  return data.access_token;
}
