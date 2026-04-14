import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';

/**
 * POST /api/products/:id/reject
 * Admin rejects a product with optional revision request
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can reject
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only admins can reject products' }, { status: 403 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();

    if (!body.reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Find product
    const product = await db.collection('products').findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.status !== 'pending-approval') {
      return NextResponse.json(
        { error: `Cannot reject product with status: ${product.status}` },
        { status: 400 }
      );
    }

    // Determine if this is a rejection or revision request
    const newStatus = body.requestRevision ? 'revision-requested' : 'rejected';

    // Update product
    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: newStatus,
          ...(newStatus === 'revision-requested' 
            ? { revisionRequestNotes: body.reason }
            : { rejectionReason: body.reason }
          ),
          updatedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: newStatus,
            timestamp: new Date(),
            changedBy: session.user.userID || session.user.id,
            reason: body.reason,
            notes: body.notes || ''
          }
        }
      },
      { returnDocument: 'after' }
    );

    // Send rejection/revision notification to artisan
    try {
      const notifType = newStatus === 'revision-requested'
        ? NOTIFICATION_TYPES.PRODUCT_REVISION_REQUESTED
        : NOTIFICATION_TYPES.PRODUCT_REJECTED;
      const notifTitle = newStatus === 'revision-requested'
        ? 'Revision Requested'
        : 'Product Not Approved';
      await NotificationService.createNotification({
        userId: product.artisanId,
        type: notifType,
        title: notifTitle,
        message: `${notifTitle} for "${product.title}": ${body.reason}`,
        channels: ['inApp', 'email'],
        templateName: newStatus === 'revision-requested' ? 'product-revision-request' : 'product-rejected',
        recipientEmail: product.artisanEmail,
        data: {
          productTitle: product.title,
          productId: product._id.toString(),
          reason: body.reason,
          userRole: 'artisan',
          relatedType: 'product',
          actionUrl: `/dashboard/products/gemstones/${product._id}`,
          actionLabel: 'View Feedback',
        },
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send rejection notification:', notifError.message);
    }

    return NextResponse.json({
      success: true,
      product: result.value,
      message: `Product ${newStatus} successfully`
    });
  } catch (error) {
    console.error('❌ Error rejecting product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
