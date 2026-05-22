import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getClaimKey } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        sub: user.sub,
        email: user.email,
        name: user.name,
        org_id: user.org_id,
        org_name: user[getClaimKey('org_name')],
        roles: user[getClaimKey('roles')],
      } : null,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
