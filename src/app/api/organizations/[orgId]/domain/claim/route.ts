import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { claimDomainSchema } from '@/lib/validations';
import { db } from '@/lib/firebase-admin';
import crypto from 'crypto';

/**
 * POST /api/organizations/[orgId]/domain/claim
 *
 * Claim a domain for verification.
 * Generates a verification token and returns DNS TXT record instructions.
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
        { error: 'Forbidden', message: 'You can only claim domains for your own organization' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = claimDomainSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { domain } = validation.data;

    console.log('🌐 Claiming domain:', domain, 'for organization:', orgId);

    // Check if domain is already claimed by another organization
    const existingClaims = await db
      .collectionGroup('domain_verification')
      .where('domain', '==', domain)
      .where('verified', '==', true)
      .get();

    if (!existingClaims.empty) {
      // Check if claimed by a different org
      const claimedByOtherOrg = existingClaims.docs.some(
        (doc) => doc.ref.parent.parent?.id !== orgId
      );

      if (claimedByOtherOrg) {
        return NextResponse.json(
          {
            error: 'Domain already claimed',
            message: 'This domain has been verified by another organization',
          },
          { status: 409 }
        );
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store in Firestore
    const domainVerificationRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('domain_verification')
      .doc(domain);

    await domainVerificationRef.set({
      domain,
      verified: false,
      verificationToken,
      claimedAt: new Date().toISOString(),
      claimedBy: user.sub,
    });

    console.log('✅ Domain claimed, verification token generated');

    // Log to audit trail
    try {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('audit_logs')
        .add({
          action: 'domain_claimed',
          initiatedBy: user.sub,
          domain,
          timestamp: new Date().toISOString(),
        });
    } catch (firestoreError) {
      console.error('⚠️ Failed to log to Firestore:', firestoreError);
    }

    // Return DNS TXT record instructions
    return NextResponse.json({
      success: true,
      domain,
      txtRecord: {
        host: `_auth0-verification.${domain}`,
        value: verificationToken,
      },
      instructions: [
        `Log in to your DNS provider (e.g., GoDaddy, Cloudflare, Route 53)`,
        `Navigate to DNS settings for ${domain}`,
        `Add a TXT record with the following details:`,
        `  Host: _auth0-verification.${domain}`,
        `  Value: ${verificationToken}`,
        `  TTL: 3600 (or default)`,
        `Wait a few minutes for DNS propagation`,
        `Click "Verify Domain" to complete verification`,
      ],
    });
  } catch (error: any) {
    console.error('Failed to claim domain:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
