import { getServerSession } from 'next-auth/next';
import { connectDB } from '@/lib/mongodb';
import authOptions from '@/app/api/auth/[...nextauth]/options';
import Product from '@/models/Product';

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role === 'admin') {
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

    await connectDB();

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          approvalStatus: 'declined',
          declinedAt: new Date(),
          declinedBy: approvedBy || session.user.userID,
          declineReason: notes.trim(),
          isActive: false // Keep product inactive
        }
      },
      { new: true }
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
