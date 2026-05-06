import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { z } from 'zod';

const updateEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// POST - Add or update user's email address
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateEmailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Update the user's email in Auth0
    await managementClient.users.update(
      { id: user.sub },
      {
        email: email,
        email_verified: false, // New emails need verification
      }
    );

    // Send verification email for the new address
    await managementClient.jobs.verifyEmail({ user_id: user.sub });

    return NextResponse.json({
      success: true,
      message: 'Email updated. Please check your inbox for a verification link.',
    });
  } catch (error: any) {
    console.error('Failed to update email:', error);

    // Handle specific Auth0 errors
    if (error.statusCode === 409) {
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update email', details: error.message },
      { status: 500 }
    );
  }
}
