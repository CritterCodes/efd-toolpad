import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/database';

export async function POST(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { productId } = params;
    const { notes, approvedBy } = await req.json();

    const { db } = await connectDB();

    const product = await db.collection('products').findOneAndUpdate(
      { _id: productId },
      {
        $set: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: approvedBy || session.user.userID,
          approvalNotes: notes || '',
          isActive: true // Make product active/visible on website
        }
      },
      { returnDocument: 'after' }
    );

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log('✅ Product approved:', productId);

    return Response.json({
      success: true,
      message: 'Product approved and is now live on the website',
      product
    });

  } catch (error) {
    console.error('❌ Approval error:', error);
    return Response.json(
      { error: error.message || 'Failed to approve product' },
      { status: 500 }
    );
  }
}
