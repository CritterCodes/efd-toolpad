import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { mergeProductEditorUpdate } from '@/services/products/productEditorPayload';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'dev', 'staff']);
const userId = (session) => session?.user?.userID || session?.user?.id;
const ownsProduct = (product, session) => {
  const id = userId(session);
  return Boolean(id && [product.artisanId, product.userId, product.seller?.userId].filter(Boolean).includes(id));
};

/**
 * GET /api/products/:id
 * Get product details
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
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

    if (!ADMIN_ROLES.has(session.user.role) && !ownsProduct(product, session)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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

    const { id } = await params;
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
    const isOwner = ownsProduct(product, session);
    const isAdmin = ADMIN_ROLES.has(session.user.role);

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
    const now = new Date();
    const updateData = {
      ...mergeProductEditorUpdate(product, data, { canAdminister: isAdmin }),
      updatedAt: now,
    };
    const update = { $set: updateData };
    if (updateData.status && updateData.status !== product.status) {
      update.$set.isPublic = false;
      update.$set.publishing = { ...(product.publishing || {}), visible: false };
      if (updateData.status === 'archived') update.$set.archivedAt = now;
      else update.$unset = { archivedAt: '' };
      update.$push = { statusHistory: {
        status: updateData.status,
        timestamp: now,
        changedBy: userId(session),
        reason: 'Product editor update',
        notes: '',
      } };
    }

    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: 'after' }
    );

    return NextResponse.json(result);
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

    const { id } = await params;
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
    const isOwner = ownsProduct(product, session);
    const isAdmin = ADMIN_ROLES.has(session.user.role);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    if (!isAdmin && product.status !== 'draft') {
      return NextResponse.json({ error: 'Can only archive draft products' }, { status: 400 });
    }

    // Archive product
    const result = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'archived',
          isPublic: false,
          'publishing.visible': false,
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error archiving product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
