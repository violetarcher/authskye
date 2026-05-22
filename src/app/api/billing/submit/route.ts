import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/firebase-admin';

/**
 * POST /api/claims/submit
 *
 * Submits an out-of-network claim for reimbursement.
 * This endpoint stores sensitive medical and financial data.
 *
 * Note: This endpoint should only be called after CIBA authentication has been approved.
 *
 * Request Body (FormData):
 * - serviceDate: string
 * - providerName: string
 * - providerNPI: string (optional)
 * - diagnosisCode: string (optional)
 * - claimAmount: number
 * - description: string (optional)
 * - routingNumber: string (encrypted)
 * - accountNumber: string (encrypted)
 * - superbill: File (PDF)
 *
 * Returns:
 * {
 *   success: true,
 *   claimId: string,
 *   submittedAt: string
 * }
 */
export const POST = withApiAuthRequired(async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    console.log('📋 Claim submission - Session check:', {
      hasSession: !!session,
      hasUser: !!user,
      hasSub: !!user?.sub,
      hasOrgId: !!user?.org_id,
      sub: user?.sub,
    });

    if (!user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use org_id from session if available, otherwise allow without it for demo
    const orgId = user.org_id || 'default-org';

    console.log('📋 Receiving claim submission for user:', user.sub);

    // Parse form data
    const formData = await request.formData();

    const serviceDate = formData.get('serviceDate') as string;
    const providerName = formData.get('providerName') as string;
    const providerNPI = formData.get('providerNPI') as string;
    const diagnosisCode = formData.get('diagnosisCode') as string;
    const claimAmount = parseFloat(formData.get('claimAmount') as string);
    const description = formData.get('description') as string;
    const routingNumber = formData.get('routingNumber') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const superbillFile = formData.get('superbill') as File;

    // Validate required fields
    if (!serviceDate || !providerName || !claimAmount || !routingNumber || !accountNumber) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Please provide all required information' },
        { status: 400 }
      );
    }

    if (!superbillFile) {
      return NextResponse.json(
        { error: 'Missing superbill', message: 'Please upload your superbill document' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Upload superbill to secure storage (e.g., Firebase Storage with encryption)
    // 2. Encrypt bank account information
    // 3. Store claim in database with proper access controls

    // For demo purposes, we'll store basic claim data
    const claimData = {
      userId: user.sub,
      organizationId: orgId,
      serviceDate,
      providerName,
      providerNPI: providerNPI || null,
      diagnosisCode: diagnosisCode || null,
      claimAmount,
      description: description || null,
      // In production: Store encrypted bank info or reference to secure vault
      bankInfo: {
        routingNumberLast4: routingNumber.slice(-4),
        accountNumberLast4: accountNumber.slice(-4),
        // DO NOT store full account numbers in production without encryption!
      },
      superbillInfo: {
        fileName: superbillFile.name,
        fileSize: superbillFile.size,
        fileType: superbillFile.type,
        // In production: Store reference to encrypted file in secure storage
      },
      status: 'pending',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('💾 Storing claim in Firestore...');

    // Store claim in Firestore
    const claimRef = await db.collection('claims').add(claimData);

    console.log('✅ Claim submitted successfully:', claimRef.id);

    return NextResponse.json(
      {
        success: true,
        claimId: claimRef.id,
        submittedAt: claimData.submittedAt,
        message: 'Claim submitted successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Failed to submit claim:', error);

    return NextResponse.json(
      {
        error: 'Failed to submit claim',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
