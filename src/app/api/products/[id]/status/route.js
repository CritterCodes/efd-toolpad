import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { isValidTransition } from '@/lib/statusTransitions';
import { ObjectId } from 'mongodb';

/**
 * POST /api/products/[id]/status
 * 
 * Unified endpoint for product status changes
 * 
 * Request body:
 * {
 *   status: 'draft' | 'published' | 'archived',
 *   isApproved: true | false (optional - only admin can set)
 * }
 */
export async function POST(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const { status: newStatus, isApproved } = await req.json();

    // Validate product ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Validate new status
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${newStatus}` },
        { status: 400 }
      );
    }

    // Get database and products collection
    const database = await db.connect();
    const productsCollection = database.collection('products');

    // Get current product
    const product = await productsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify authorization - user must be artisan owner or admin
    const isAdmin = session.user.role === 'admin';
    const isArtisan = product.artisanId === session.user.id;

    if (!isAdmin && !isArtisan) {
      return NextResponse.json(
        { error: 'Forbidden - Not authorized to modify this product' },
        { status: 403 }
      );
    }

    const currentStatus = product.status || 'draft';

    // Check if transition is valid
    if (!isValidTransition(currentStatus, newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' to '${newStatus}'` },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Only admin can change isApproved
    if (typeof isApproved === 'boolean' && isAdmin) {
      updateData.isApproved = isApproved;
      
      // Track when first approved
      if (isApproved && !product.isApproved) {
        updateData.approvedAt = new Date();
        updateData.approvedBy = session.user.id;
      }
    }

    // When publishing, set isApproved to false if not already approved
    if (newStatus === 'published' && !product.isApproved) {
      updateData.isApproved = false;
    }

    // Track status change in history
    if (!product.statusHistory) {
      product.statusHistory = [];
    }

    const statusChange = {
      status: newStatus,
      isApproved: updateData.isApproved !== undefined ? updateData.isApproved : product.isApproved,
      timestamp: new Date(),
      changedBy: session.user.id,
      changedByEmail: session.user.email
    };

    updateData.statusHistory = [
      ...product.statusHistory,
      statusChange
    ];

    // Update product
    const result = await productsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Return updated product
    return NextResponse.json({
      success: true,
      product: result.value,
      message: `Product status updated to ${newStatus}`
    });

  } catch (error) {
    console.error('Status transition error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product status' },
      { status: 500 }
    );
  }
}

