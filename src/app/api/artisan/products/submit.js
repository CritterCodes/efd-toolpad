import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

/**
 * POST /api/artisan/products/submit
 * Artisan submits a product for admin approval
 * Transitions product from draft to pending-approval
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only artisans can submit products
    if (session.user.role !== 'artisan') {
      return NextResponse.json({ error: 'Only artisans can submit products' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();

    if (!body.productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Find product and verify ownership
    const product = await db.collection('products').findOne({
      _id: require('mongodb').ObjectId.createFromHexString(body.productId),
      artisanId: session.user.userID || session.user.id
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft products can be submitted' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update product status to pending-approval
    const result = await db.collection('products').findOneAndUpdate(
      { _id: product._id },
      {
        $set: {
          status: 'pending-approval',
          updatedAt: now
        },
        $push: {
          statusHistory: {
            status: 'pending-approval',
            timestamp: now,
            changedBy: session.user.userID || session.user.id,
            reason: 'Artisan submitted for approval',
            notes: body.notes || ''
          }
        }
      },
      { returnDocument: 'after' }
    );

    // TODO: Send notification to admins
    // await notificationService.notifyAdminsProductSubmitted(product._id, session.user.email)

    return NextResponse.json({
      success: true,
      product: result.value,
      message: 'Product submitted for review. You will receive an email when admin reviews it.'
    });
  } catch (error) {
    console.error('❌ Error submitting product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
