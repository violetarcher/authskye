import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/firebase-admin';
import { managementClient } from '@/lib/auth0-mgmt-client';
import { resolveTxt } from 'dns/promises';

/**
 * POST /api/organizations/[orgId]/domain/verify
 *
 * Verify domain ownership via DNS TXT record.
 * Admin-only endpoint.
 */
export async function POST(
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
        { error: 'Forbidden', message: 'You can only verify domains for your own organization' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying domain:', domain, 'for organization:', orgId);

    // Get the verification token from Firestore
    const domainVerificationRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('domain_verification')
      .doc(domain);

    const domainDoc = await domainVerificationRef.get();

    if (!domainDoc.exists) {
      return NextResponse.json(
        { error: 'Domain not claimed', message: 'Please claim the domain first' },
        { status: 404 }
      );
    }

    const domainData = domainDoc.data();
    const expectedToken = domainData?.verificationToken;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Verification token not found' },
        { status: 500 }
      );
    }

    // Check DNS TXT record
    const txtHost = `_auth0-verification.${domain}`;
    let verified = false;

    try {
      const records = await resolveTxt(txtHost);
      const flatRecords = records.flat();

      console.log('📋 DNS TXT records found:', flatRecords);

      // Check if any record matches the expected token
      verified = flatRecords.includes(expectedToken);
    } catch (dnsError: any) {
      console.error('DNS lookup failed:', dnsError);

      // NOTFOUND is expected if TXT record doesn't exist yet
      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        return NextResponse.json(
          {
            verified: false,
            message: 'DNS TXT record not found. Please ensure you have added the TXT record and wait a few minutes for DNS propagation.',
          },
          { status: 200 }
        );
      }

      throw dnsError;
    }

    if (!verified) {
      return NextResponse.json(
        {
          verified: false,
          message: 'DNS TXT record found, but verification token does not match. Please check the TXT record value.',
        },
        { status: 200 }
      );
    }

    console.log('✅ Domain verified successfully');

    // Update Firestore
    await domainVerificationRef.update({
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: user.sub,
    });

    // Update Auth0 organization metadata with verified domain
    try {
      await managementClient.organizations.update(
        { id: orgId },
        {
          metadata: {
            verified_domain: domain,
          },
        }
      );
      console.log('✅ Auth0 organization metadata updated');
    } catch (auth0Error) {
      console.error('⚠️ Failed to update Auth0 metadata:', auth0Error);
      // Don't fail verification if Auth0 update fails
    }

    // Find the organization's SSO connection and add domain to domain_aliases
    try {
      console.log('🔍 Looking for SSO connection for organization...');

      // Get enabled connections for this organization
      const connections = await managementClient.organizations.getEnabledConnections({
        id: orgId,
      });

      // Filter for enterprise SSO connections (exclude auth0, google-oauth2, etc.)
      const ssoStrategies = ['samlp', 'oidc', 'okta', 'waad', 'adfs'];
      const ssoConnection = connections.data.find((conn) =>
        conn.connection?.strategy && ssoStrategies.includes(conn.connection.strategy)
      );

      if (ssoConnection?.connection_id) {
        console.log('✅ Found SSO connection:', ssoConnection.connection_id, 'strategy:', ssoConnection.connection?.strategy);

        // Get the full connection details
        const connectionDetails = await managementClient.connections.get({
          id: ssoConnection.connection_id,
        });

        // Get existing domain_aliases
        const existingDomains = connectionDetails.data.options?.domain_aliases || [];

        // Add the new domain if not already present
        if (!existingDomains.includes(domain)) {
          const updatedDomains = [...existingDomains, domain];

          console.log('📤 Adding domain to connection domain_aliases:', updatedDomains);

          // Update connection with new domain_aliases
          await managementClient.connections.update(
            { id: ssoConnection.connection_id },
            {
              options: {
                ...connectionDetails.data.options,
                domain_aliases: updatedDomains,
              },
            }
          );

          console.log('✅ Domain added to SSO connection for home realm discovery');
        } else {
          console.log('ℹ️ Domain already in connection domain_aliases');
        }
      } else {
        console.log('ℹ️ No SSO connection found for organization (this is okay - will be added when SSO is configured)');
      }
    } catch (connectionError) {
      console.error('⚠️ Failed to update SSO connection domain_aliases:', connectionError);
      // Don't fail verification if connection update fails
    }

    // Log to audit trail
    try {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('audit_logs')
        .add({
          action: 'domain_verified',
          initiatedBy: user.sub,
          domain,
          timestamp: new Date().toISOString(),
        });
    } catch (firestoreError) {
      console.error('⚠️ Failed to log to Firestore:', firestoreError);
    }

    return NextResponse.json({
      verified: true,
      domain,
      message: 'Domain verified successfully!',
    });
  } catch (error: any) {
    console.error('Failed to verify domain:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
