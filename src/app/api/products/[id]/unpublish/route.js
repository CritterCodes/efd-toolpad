import { NextResponse } from 'next/server';
import Database from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/products/:id/unpublish
 * Artisan can unpublish a published product (move back to draft or archive)
 * Supports moving to either 'draft' or 'archived' status
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

    // Only artisan who created the product can unpublish it
    if (product.userId !== session.user.userID && product.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only manage your own products' },
        { status: 403 }
      );
    }

    // Can only unpublish published or approved products
    if (!['published', 'approved'].includes(product.status)) {
      return NextResponse.json(
        { error: `Cannot unpublish product with status: ${product.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const body = await request.json().catch(() => ({}));
    
    // Default to 'draft' if not specified, but support 'archived' as well
    const targetStatus = ['draft', 'archived'].includes(body.targetStatus) 
      ? body.targetStatus 
      : 'draft';

    const updateData = {
      $set: {
        status: targetStatus,
        updatedAt: now
      },
      $push: {
        statusHistory: {
          status: targetStatus,
          timestamp: now,
          changedBy: session.user.userID || session.user.id,
          reason: targetStatus === 'archived' 
            ? 'Product archived by artisan' 
            : 'Product moved back to draft by artisan',
          notes: body.notes || ''
        }
      }
    };

    // If archiving, add archivedAt timestamp
    if (targetStatus === 'archived') {
      updateData.$set.archivedAt = now;
    }

    // Update product
    const result = await productsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateData,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    const actionMessage = targetStatus === 'archived' 
      ? 'archived' 
      : 'moved back to draft';

    console.log(`✅ Product ${id} ${actionMessage} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: `Product ${actionMessage} successfully`,
      product: result
    });

  } catch (error) {
    console.error('❌ Error unpublishing product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unpublish product' },
      { status: 500 }
    );
  }
}
