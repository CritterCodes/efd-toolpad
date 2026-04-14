import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';

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

    // Send published notification to artisan
    try {
      await NotificationService.createNotification({
        userId: product.artisanId,
        type: NOTIFICATION_TYPES.PRODUCT_PUBLISHED,
        title: 'Product Published',
        message: `Your product "${product.title}" is now live on the shop!`,
        channels: ['inApp', 'email'],
        templateName: 'product-published',
        recipientEmail: product.artisanEmail,
        data: {
          productTitle: product.title,
          productId: product._id.toString(),
          userRole: 'artisan',
          relatedType: 'product',
          actionUrl: `/dashboard/products/gemstones/${product._id}`,
          actionLabel: 'View Product',
        },
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send publish notification:', notifError.message);
    }

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
