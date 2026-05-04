import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession, getAccessToken } from '@auth0/nextjs-auth0';
import { enrollMfaFactorSchema } from '@/lib/validations';

/**
 * GET /api/mfa/methods
 *
 * Lists all enrolled authentication methods (MFA factors) for the current user via My Account API.
 *
 * Returns:
 * - 200: Array of enrolled authentication methods
 * - 401: Unauthorized
 * - 500: Server error
 */
export const GET = withApiAuthRequired(async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get access token from Authorization header (passed from frontend after token exchange)
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available', message: 'Please provide My Account API token in Authorization header' },
        { status: 401 }
      );
    }

    console.log('📋 Fetching enrolled MFA methods via My Account API for user:', user.sub);

    // Construct My Account API endpoint URL
    const myAccountDomain = process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '');
    const myAccountUrl = `https://${myAccountDomain}/me/v1/authentication-methods`;

    // Call My Account API
    const response = await fetch(myAccountUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ My Account API error:', response.status, errorData);

      // If 404, My Account API might not be activated
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: 'My Account API not available',
            message: 'My Account API may not be activated in your Auth0 tenant',
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch MFA methods',
          message: errorData.message || errorData.error || 'An unexpected error occurred',
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // My Account API returns: { authentication_methods: [...] }
    const methods = data.authentication_methods || data || [];

    return NextResponse.json({
      success: true,
      methods: Array.isArray(methods) ? methods : [],
      count: Array.isArray(methods) ? methods.length : 0,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch MFA methods:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch MFA methods',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/mfa/methods
 *
 * Enrolls a new MFA factor for the current user via My Account API.
 * Note: Step-up authentication removed to allow first-factor enrollment.
 *
 * Request Body:
 * {
 *   type: 'sms' | 'phone' | 'email' | 'totp' | 'webauthn-roaming' | 'webauthn-platform',
 *   phoneNumber?: string,  // Required for SMS/phone
 *   email?: string,        // Required for email
 *   name?: string          // Optional display name
 * }
 *
 * Returns:
 * - 201: Enrolled authentication method
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Server error
 */
export const POST = withApiAuthRequired(async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get access token from Authorization header (passed from frontend after token exchange)
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available', message: 'Please provide My Account API token in Authorization header' },
        { status: 401 }
      );
    }

    // Step-up authentication removed - users need to be able to enroll their first MFA factor
    // without already having MFA enabled (chicken-and-egg problem)

    // Parse and validate request body
    const body = await request.json();

    console.log('📥 Enrollment request body:', body);

    const validation = enrollMfaFactorSchema.safeParse(body);

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid enrollment request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { type, phoneNumber, email, name, connection, identity_user_id } = validation.data;

    console.log('✨ Enrolling MFA factor via My Account API:', type, 'for user:', user.sub);

    // Create enrollment request based on factor type
    const enrollmentRequest: any = { type };

    // Add optional name if provided
    if (name) {
      enrollmentRequest.name = name;
    }

    // Type-specific configuration
    switch (type) {
      case 'sms':
        // SMS is actually type 'phone' with preferred_authentication_method='sms'
        if (!phoneNumber) {
          return NextResponse.json(
            {
              error: 'Validation error',
              message: 'Phone number required for SMS enrollment',
            },
            { status: 400 }
          );
        }
        enrollmentRequest.type = 'phone';
        enrollmentRequest.phone_number = phoneNumber;
        enrollmentRequest.preferred_authentication_method = 'sms';
        break;

      case 'phone':
        // Voice call
        if (!phoneNumber) {
          return NextResponse.json(
            {
              error: 'Validation error',
              message: 'Phone number required for phone enrollment',
            },
            { status: 400 }
          );
        }
        enrollmentRequest.phone_number = phoneNumber;
        enrollmentRequest.preferred_authentication_method = 'voice';
        break;

      case 'email':
        if (email) {
          enrollmentRequest.email = email;
        }
        break;

      case 'totp':
        // TOTP enrollment - no additional fields needed
        break;

      case 'push-notification':
        // Push notification (Guardian) - no additional config needed
        // Auth0 will return enrollment URL/barcode for Guardian app
        break;

      case 'passkey':
        // Passkey enrollment - requires browser WebAuthn API
        // Auth0 returns authn_params_public_key for credential creation
        // Optional: connection and identity_user_id for identity linkage
        if (connection) {
          enrollmentRequest.connection = connection;
        }
        if (identity_user_id) {
          enrollmentRequest.identity_user_id = identity_user_id;
        }
        break;

      // WebAuthn types temporarily disabled - not yet supported
      // case 'webauthn-roaming':
      // case 'webauthn-platform':
      //   // WebAuthn requires browser API - backend just sends the type as-is
      //   // Auth0 returns public_key_credential_creation_options in response
      //   // No additional fields required per API documentation
      //   break;

      default:
        return NextResponse.json(
          {
            error: 'Not supported',
            message: `MFA type "${type}" not fully implemented yet.`,
          },
          { status: 400 }
        );
    }

    // Construct My Account API endpoint URL
    const myAccountDomain = process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '');
    const myAccountUrl = `https://${myAccountDomain}/me/v1/authentication-methods`;

    console.log('📤 Calling My Account API:', myAccountUrl);
    console.log('📦 Request body:', enrollmentRequest);

    // Call My Account API
    const response = await fetch(myAccountUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrollmentRequest),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ My Account API error:', response.status, errorData);

      return NextResponse.json(
        {
          error: 'Failed to enroll MFA factor',
          message: errorData.message || errorData.error || errorData.error_description || 'An unexpected error occurred',
          details: errorData,
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    const method = await response.json();
    console.log('✅ Enrollment response:', JSON.stringify(method, null, 2));

    // Check for auth_session (indicates pending verification)
    if (method.auth_session) {
      console.log('⚠️ Enrollment pending - requires verification with auth_session:', method.auth_session);
    }

    return NextResponse.json(
      {
        success: true,
        message: method.auth_session ? 'Enrollment initiated - verification required' : 'MFA factor enrolled successfully',
        method,
        requiresVerification: !!method.auth_session,
      },
      { status: response.status }
    );
  } catch (error: any) {
    console.error('❌ Failed to enroll MFA factor:', error);

    return NextResponse.json(
      {
        error: 'Failed to enroll MFA factor',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/mfa/methods
 *
 * Removes ALL enrolled MFA factors (MFA reset) via My Account API.
 * Note: Step-up authentication removed for consistency with enrollment.
 *
 * This is a destructive operation that should require user confirmation.
 *
 * Returns:
 * - 200: All methods deleted successfully
 * - 401: Unauthorized
 * - 500: Server error
 */
export const DELETE = withApiAuthRequired(async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get access token from Authorization header (passed from frontend after token exchange)
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available', message: 'Please provide My Account API token in Authorization header' },
        { status: 401 }
      );
    }

    // Step-up authentication removed for consistency with enrollment
    // User confirmation still required in UI before calling this endpoint

    console.log('🗑️ Resetting all MFA factors via My Account API for user:', user.sub);

    // Construct My Account API endpoint URL
    const myAccountDomain = process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '');
    const myAccountUrl = `https://${myAccountDomain}/me/v1/authentication-methods`;

    // Get all methods first
    const getResponse = await fetch(myAccountUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getResponse.ok) {
      const errorData = await getResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Failed to fetch methods for deletion:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to fetch MFA methods',
          message: errorData.message || 'Could not retrieve methods to delete',
        },
        { status: getResponse.status }
      );
    }

    const methods = await getResponse.json();

    // Delete each method
    for (const method of methods) {
      const deleteUrl = `${myAccountUrl}/${method.id}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'All MFA factors have been removed successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to reset MFA:', error);

    return NextResponse.json(
      {
        error: 'Failed to reset MFA',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
