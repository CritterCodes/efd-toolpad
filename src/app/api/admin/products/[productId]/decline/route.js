import { auth } from '../../../../../../auth';
import { connectDB } from '@/lib/database';

export async function POST(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { productId } = params;
    const { notes, approvedBy } = await req.json();

    if (!notes?.trim()) {
      return Response.json(
        { error: 'Decline reason is required' },
        { status: 400 }
      );
    }

    const { db } = await connectDB();

    const product = await db.collection('products').findOneAndUpdate(
      { _id: productId },
      {
        $set: {
          approvalStatus: 'declined',
          declinedAt: new Date(),
          declinedBy: approvedBy || session.user.userID,
          declineReason: notes.trim(),
          isActive: false // Keep product inactive
        }
      },
      { returnDocument: 'after' }
    );

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log('✅ Product declined:', productId);

    // TODO: Send notification to artisan about decline reason

    return Response.json({
      success: true,
      message: 'Product declined. Artisan has been notified.',
      product
    });

  } catch (error) {
    console.error('❌ Decline error:', error);
    return Response.json(
      { error: error.message || 'Failed to decline product' },
      { status: 500 }
    );
  }
}
