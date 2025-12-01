import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

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

    // Send approval notification email
    // TODO: Implement notification service
    /*
    try {
      await createNotification({
        userId: product.artisanId,
        userEmail: product.artisanEmail,
        userRole: 'artisan',
        type: 'product_approved',
        title: 'Product Approved',
        message: `Your product "${product.title}" has been approved and published!`,
        relatedId: product._id.toString(),
        relatedType: 'product',
        actionUrl: `/dashboard/products/gemstones/${product._id}`,
        actionLabel: 'View Product',
        channels: ['email', 'inApp'],
        priority: 'high'
      });
      console.log('✅ Approval notification sent to artisan');
    } catch (notifError) {
      console.error('⚠️ Warning: Failed to send approval notification:', notifError);
      // Don't fail the request if notification fails
    }
    */

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
