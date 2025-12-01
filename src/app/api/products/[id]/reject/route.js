import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

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

    // Send rejection/revision notification email
    // TODO: Implement notification integration
    /*
    try {
      if (newStatus === 'revision-requested') {
        await createNotification({
          userId: product.artisanId,
          userEmail: product.artisanEmail,
          userRole: 'artisan',
          type: 'revision_requested',
          title: 'Revision Requested',
          message: `Revisions requested for "${product.title}": ${body.reason}`,
          relatedId: product._id.toString(),
          relatedType: 'product',
          actionUrl: `/dashboard/products/gemstones/${product._id}`,
          actionLabel: 'View Feedback',
          channels: ['email', 'inApp'],
          priority: 'high'
        });
        console.log('✅ Revision request notification sent to artisan');
      } else {
        await createNotification({
          userId: product.artisanId,
          userEmail: product.artisanEmail,
          userRole: 'artisan',
          type: 'product_rejected',
          title: 'Product Rejected',
          message: `Your product "${product.title}" was rejected: ${body.reason}`,
          relatedId: product._id.toString(),
          relatedType: 'product',
          actionUrl: `/dashboard/products/gemstones/${product._id}`,
          actionLabel: 'View Feedback',
          channels: ['email', 'inApp'],
          priority: 'high'
        });
        console.log('✅ Rejection notification sent to artisan');
      }
    } catch (notifError) {
      console.error('⚠️ Warning: Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }
    */

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
