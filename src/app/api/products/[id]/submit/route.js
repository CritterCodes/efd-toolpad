import { NextResponse } from 'next/server';
import Database from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/products/:id/submit
 * Artisan submits a product from draft to pending-approval
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id) && !id.startsWith('gem_')) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const db = new Database();
    const dbInstance = await db.connect();
    const productsCollection = dbInstance.collection('products');

    // Find product - try both _id and productId
    let product;
    if (ObjectId.isValid(id)) {
      product = await productsCollection.findOne({
        _id: new ObjectId(id)
      });
    }
    
    // If not found by _id, try by productId (for gemstones)
    if (!product && id.startsWith('gem_')) {
      product = await productsCollection.findOne({
        productId: id
      });
    }
    
    // If still not found, try as _id anyway
    if (!product) {
      try {
        product = await productsCollection.findOne({
          _id: new ObjectId(id)
        });
      } catch (e) {
        // Not a valid ObjectId
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Only artisan who created the product can submit it
    if (product.userId !== session.user.userID && product.userId !== session.user.id) {
      console.error(`❌ Permission denied: product.userId=${product.userId}, session.user.userID=${session.user.userID}, session.user.id=${session.user.id}`);
      return NextResponse.json(
        { error: 'You can only submit your own products' },
        { status: 403 }
      );
    }

    // Can only submit draft products (or products without a status field)
    if (product.status && product.status !== 'draft') {
      console.error(`❌ Invalid status: product.status=${product.status}, must be 'draft' or undefined`);
      return NextResponse.json(
        { error: `Cannot submit product with status: ${product.status}. Only draft products can be submitted.` },
        { status: 400 }
      );
    }

    console.log(`✅ Attempting to submit product ${id} with status: ${product.status || 'undefined (will default to draft)'}`);

    const now = new Date();
    const body = await request.json().catch(() => ({}));

    // Build query to find the product (same way we found it initially)
    let updateQuery;
    if (product.productId) {
      updateQuery = { productId: product.productId };
    } else {
      updateQuery = { _id: product._id };
    }

    // Update product status to pending-approval
    const result = await productsCollection.findOneAndUpdate(
      updateQuery,
      {
        $set: {
          status: 'pending-approval',
          submittedAt: now,
          submittedBy: session.user.userID || session.user.id,
          updatedAt: now
        },
        $push: {
          statusHistory: {
            status: 'pending-approval',
            timestamp: now,
            changedBy: session.user.userID || session.user.id,
            reason: 'Submitted by artisan for admin approval',
            notes: body.notes || ''
          }
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    console.log(`✅ Product ${id} submitted for approval by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Product submitted for approval',
      product: result
    });

  } catch (error) {
    console.error('❌ Error submitting product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit product' },
      { status: 500 }
    );
  }
}
