import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/firebase-admin';
import { validateMcpToken, tokenHasScope } from '@/lib/mcp-token-validator';

/**
 * POST /api/billing/submit
 *
 * Submits a deposit request. Transfers require CIBA approval before processing.
 *
 * Request Body (FormData):
 * - transferDate: string
 * - transferDescription: string
 * - transferType: string (Wire / ACH / Bank Transfer)
 * - depositAmount: number
 * - description: string (optional)
 * - routingNumber: string
 * - accountNumber: string
 * - bankStatement: File (PDF, optional)
 *
 * Returns:
 * {
 *   success: true,
 *   claimId: string,
 *   submittedAt: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate CIBA access token — must carry transaction:pay scope
    let tokenPayload;
    try {
      tokenPayload = await validateMcpToken(request.headers.get('authorization'), process.env.CIBA_AUDIENCE);
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid CIBA access token required' },
        { status: 401 }
      );
    }

    if (!tokenHasScope(tokenPayload, 'transaction:pay')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Token missing transaction:pay scope' },
        { status: 403 }
      );
    }

    const userId = tokenPayload.sub;

    const session = await getSession();
    const orgId = session?.user?.org_id || 'default-org';

    console.log('💰 Receiving deposit submission for user:', userId);

    const formData = await request.formData();

    const transferDate = formData.get('serviceDate') as string;
    const transferDescription = formData.get('providerName') as string;
    const transferType = formData.get('diagnosisCode') as string;
    const depositAmount = parseFloat(formData.get('claimAmount') as string);
    const description = formData.get('description') as string;
    const routingNumber = formData.get('routingNumber') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const bankStatementFile = formData.get('superbill') as File | null;

    if (!transferDate || !transferDescription || !depositAmount || !routingNumber || !accountNumber) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Please provide all required information' },
        { status: 400 }
      );
    }

    const depositData = {
      userId,
      organizationId: orgId,
      transferDate,
      transferDescription,
      transferType: transferType || null,
      depositAmount,
      description: description || null,
      bankInfo: {
        routingNumberLast4: routingNumber.slice(-4),
        accountNumberLast4: accountNumber.slice(-4),
      },
      ...(bankStatementFile && {
        bankStatementInfo: {
          fileName: bankStatementFile.name,
          fileSize: bankStatementFile.size,
          fileType: bankStatementFile.type,
        },
      }),
      status: 'pending',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('💾 Storing deposit in Firestore...');

    const depositRef = await db.collection('transactions').add(depositData);

    console.log('✅ Deposit submitted successfully:', depositRef.id);

    return NextResponse.json(
      {
        success: true,
        claimId: depositRef.id,
        submittedAt: depositData.submittedAt,
        message: 'Deposit submitted successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Failed to submit deposit:', error);

    return NextResponse.json(
      {
        error: 'Failed to submit deposit',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
