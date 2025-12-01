import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/products/:id/publish
 * Admin publishes a product to the shop
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can publish
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only admins can publish products' }, { status: 403 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json().catch(() => ({}));

    // Find product
    const product = await db.collection('products').findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Can only publish approved or admin-created products
    if (!['approved', 'published'].includes(product.status) && product.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot publish product with status: ${product.status}` },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update product
    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'published',
          publishedAt: now,
          updatedAt: now
        },
        $push: {
          statusHistory: {
            status: 'published',
            timestamp: now,
            changedBy: session.user.userID || session.user.id,
            reason: 'Product published to shop',
            notes: body.notes || ''
          }
        }
      },
      { returnDocument: 'after' }
    );

    // Send published notification email
    // TODO: Implement notification integration
    /*
    try {
      await createNotification({
        userId: product.artisanId,
        userEmail: product.artisanEmail,
        userRole: 'artisan',
        type: 'product_published',
        title: 'Product Published',
        message: `Your product "${product.title}" is now live on the shop!`,
        relatedId: product._id.toString(),
        relatedType: 'product',
        actionUrl: `/dashboard/products/gemstones/${product._id}`,
        actionLabel: 'View Product',
        channels: ['email', 'inApp'],
        priority: 'high'
      });
      console.log('✅ Publication notification sent to artisan');
    } catch (notifError) {
      console.error('⚠️ Warning: Failed to send publication notification:', notifError);
      // Don't fail the request if notification fails
    }
    */

    return NextResponse.json({
      success: true,
      product: result.value,
      message: 'Product published to shop successfully'
    });
  } catch (error) {
    console.error('❌ Error publishing product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
