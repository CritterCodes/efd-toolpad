import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';
import { getUserArtisanTypes, canPublishProduct } from '@/lib/productPermissions';
import { validateProductContract } from '@/services/products/productContract';

/**
 * POST /api/products/:id/publish
 * Admins, jewelers (own jewelry), and gem-cutters (own gemstones) can publish.
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const db = await mongo.connect();
    const body = await request.json().catch(() => ({}));

    // Find product by _id or productId
    let product = null;
    if (ObjectId.isValid(id)) {
      product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    }
    if (!product) {
      product = await db.collection('products').findOne({ productId: id });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Resolve artisan types for the requesting user
    let artisanTypes = [];
    if (!['admin', 'superadmin', 'dev', 'staff'].includes(session.user.role)) {
      const userProfile = await db.collection('users').findOne({ email: session.user.email });
      artisanTypes = getUserArtisanTypes(userProfile);
    }

    const userId = session.user.userID || session.user.id;
    if (!canPublishProduct(session.user.role, artisanTypes, product, userId)) {
      return NextResponse.json(
        { error: 'You do not have permission to publish this product' },
        { status: 403 }
      );
    }

    if (!['approved', 'published', 'draft'].includes(product.status)) {
      return NextResponse.json(
        { error: `Cannot publish product with status: ${product.status}` },
        { status: 400 }
      );
    }

    if (product.status === 'published' && product.publishing?.visible === true) {
      return NextResponse.json({
        success: true,
        product,
        message: 'Product is already published',
      });
    }

    const contract = validateProductContract(product);
    if (!contract.valid) {
      return NextResponse.json(
        { error: 'Product is not ready to publish', details: contract.errors },
        { status: 400 }
      );
    }

    const now = new Date();
    const searchCriteria = product._id ? { _id: product._id } : { productId: id };
    const transitionCriteria = {
      ...searchCriteria,
      status: { $in: ['approved', 'published', 'draft'] },
      'publishing.visible': { $ne: true },
    };

    const result = await db.collection('products').findOneAndUpdate(
      transitionCriteria,
      {
        $set: {
          status: 'published',
          isPublic: true,
          'publishing.visible': true,
          'publishing.publishedAt': now,
          publishedAt: now,
          updatedAt: now,
        },
        $push: {
          statusHistory: {
            status: 'published',
            timestamp: now,
            changedBy: userId,
            reason: 'Product published to shop',
            notes: body.notes || '',
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      const current = await db.collection('products').findOne(searchCriteria);
      if (current?.status === 'published' && current.publishing?.visible === true) {
        return NextResponse.json({ success: true, product: current, message: 'Product is already published' });
      }
      return NextResponse.json({ error: 'Product changed while it was being published' }, { status: 409 });
    }

    // Notify artisan (non-blocking)
    try {
      await NotificationService.createNotification({
        userId: product.artisanId || product.userId,
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
          actionUrl: `/dashboard/products/${product._id}`,
          actionLabel: 'View Product',
        },
      });
    } catch (notifError) {
      console.error('Failed to send publish notification:', notifError.message);
    }

    return NextResponse.json({
      success: true,
      product: result,
      message: 'Product published to shop successfully',
    });
  } catch (error) {
    console.error('Error publishing product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
