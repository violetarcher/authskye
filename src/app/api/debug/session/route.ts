import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

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
        org_name: user['https://agency-inc-demo.com/org_name'],
        roles: user['https://agency-inc-demo.com/roles'],
      } : null,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
