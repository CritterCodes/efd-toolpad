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

    await connectDB();

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: approvedBy || session.user.userID,
          approvalNotes: notes || '',
          isActive: true // Make product active/visible on website
        }
      },
      { new: true }
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
