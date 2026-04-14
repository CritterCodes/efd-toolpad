import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';

/**
 * POST /api/products/:id/approve
 * Admin approves a product
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can approve
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only admins can approve products' }, { status: 403 });
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

    if (product.status !== 'pending-approval') {
      return NextResponse.json(
        { error: `Cannot approve product with status: ${product.status}` },
        { status: 400 }
      );
    }

    // Update product status
    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'approved',
          approvedBy: session.user.userID || session.user.id,
          approvalDate: new Date(),
          updatedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'approved',
            timestamp: new Date(),
            changedBy: session.user.userID || session.user.id,
            reason: 'Admin approval',
            notes: body.notes || ''
          }
        }
      },
      { returnDocument: 'after' }
    );

    // Send approval notification to artisan
    try {
      await NotificationService.createNotification({
        userId: product.artisanId,
        type: NOTIFICATION_TYPES.PRODUCT_APPROVED,
        title: 'Product Approved',
        message: `Your product "${product.title}" has been approved!`,
        channels: ['inApp', 'email'],
        templateName: 'product-approved',
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
      console.error('⚠️ Failed to send approval notification:', notifError.message);
    }

    return NextResponse.json({
      success: true,
      product: result.value,
      message: 'Product approved successfully'
    });
  } catch (error) {
    console.error('❌ Error approving product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
