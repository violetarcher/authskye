import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export const POST = withApiAuthRequired(async function POST(request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all bills for this user
    const querySnapshot = await db
      .collection('documents')
      .where('ownerId', '==', user.sub)
      .get();

    // Delete all bills for this user
    const batch = db.batch();
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`✅ Cleared ${querySnapshot.docs.length} bills for user ${user.sub}`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${querySnapshot.docs.length} bills`,
      count: querySnapshot.docs.length,
    });
  } catch (error: any) {
    console.error('❌ Error clearing bills:', error);
    return NextResponse.json(
      { error: 'Failed to clear bills', message: error.message },
      { status: 500 }
    );
  }
});
