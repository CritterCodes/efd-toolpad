import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/products/:id
 * Get product details
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const db = await mongo.connect();

    // Validate ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await db.collection('products').findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/products/:id
 * Update product
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const db = await mongo.connect();
    const data = await request.json();

    // Find product
    const product = await db.collection('products').findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check permissions
    const isArtisan = session.user.role === 'artisan';
    const isOwner = product.artisanId === (session.user.userID || session.user.id);
    const isAdmin = ['admin', 'superadmin'].includes(session.user.role);

    if (!isAdmin && (!isArtisan || !isOwner)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Artisans can only edit draft products
    if (isArtisan && isOwner && product.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit draft products' },
        { status: 400 }
      );
    }

    // Prepare update
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    // Admins may set status directly; non-admin roles cannot change status or ownership here
    if (!isAdmin) {
      delete updateData.status;
    }
    delete updateData.artisanId;
    delete updateData.statusHistory;

    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return NextResponse.json(result.value);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/products/:id
 * Archive product (soft delete)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const db = await mongo.connect();

    // Find product
    const product = await db.collection('products').findOne({
      _id: new ObjectId(id)
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = product.artisanId === (session.user.userID || session.user.id);
    const isAdmin = ['admin', 'superadmin'].includes(session.user.role);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Archive product
    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'archived',
          archivedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'archived',
            timestamp: new Date(),
            changedBy: session.user.userID || session.user.id,
            reason: 'Product archived',
            notes: ''
          }
        }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json(result.value);
  } catch (error) {
    console.error('❌ Error archiving product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
