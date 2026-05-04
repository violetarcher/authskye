import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

/**
 * My Account API Proxy Endpoint
 *
 * This endpoint proxies requests to Auth0's My Account API to avoid CORS issues.
 * It extracts the access token from the session and forwards the request to Auth0.
 *
 * Usage:
 * POST /api/mfa/proxy
 * Body: {
 *   method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
 *   endpoint: '/me/authentication-methods',
 *   body?: { ... }
 * }
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

    // Parse request body
    const requestBody = await request.json();
    const { method, endpoint, body } = requestBody;

    if (!method || !endpoint) {
      return NextResponse.json(
        { error: 'Missing required fields: method and endpoint' },
        { status: 400 }
      );
    }

    // Get access token from session
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available in session' },
        { status: 401 }
      );
    }

    // Build full URL
    const myAccountApiUrl = `${process.env.AUTH0_ISSUER_BASE_URL}${endpoint}`;

    console.log('🔄 Proxying My Account API request:', {
      method,
      url: myAccountApiUrl,
      hasBody: !!body,
    });

    // Make request to Auth0 My Account API
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(myAccountApiUrl, options);

    // Extract headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Try to parse body as JSON
    let responseBody;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    console.log('✅ My Account API response:', {
      status: response.status,
      statusText: response.statusText,
    });

    // Return the response with status and headers
    return NextResponse.json(
      {
        status: response.status,
        statusText: response.statusText,
        headers,
        body: responseBody,
      },
      { status: 200 } // Always return 200, actual status is in the body
    );

  } catch (error: any) {
    console.error('❌ My Account API proxy error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to proxy request',
        status: 500,
        statusText: 'Internal Server Error',
      },
      { status: 200 } // Return 200 with error in body for consistent handling
    );
  }
});
