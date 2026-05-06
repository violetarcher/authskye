import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';

// POST - Send email verification link
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has an email
    if (!user.email) {
      return NextResponse.json(
        { error: 'No email address on account. Please add an email first.' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Send verification email
    await managementClient.jobs.verifyEmail({ user_id: user.sub });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('Failed to send verification email:', error);

    return NextResponse.json(
      { error: 'Failed to send verification email', details: error.message },
      { status: 500 }
    );
  }
}
