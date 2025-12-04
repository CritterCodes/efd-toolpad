/**
 * /api/collections/[id]/products/route.js
 * Manage products in a collection - add and remove
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongodb.js';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/collections/:id/products
 * Get all products in a collection
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = await db.collection('collections').findOne({
      _id: new ObjectId(id)
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Get product details for all products in collection
    const productIds = collection.products.map(p => new ObjectId(p.productId));
    const products = await db.collection('products')
      .find({ _id: { $in: productIds } })
      .toArray();

    // Merge with position info
    const productsWithPosition = products.map(product => {
      const positionInfo = collection.products.find(p => p.productId === product._id.toString());
      return {
        ...product,
        position: positionInfo?.position,
        addedAt: positionInfo?.addedAt,
        notes: positionInfo?.notes
      };
    });

    return NextResponse.json({
      success: true,
      data: productsWithPosition,
      count: productsWithPosition.length
    });

  } catch (error) {
    console.error('Error fetching collection products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections/:id/products
 * Add products to collection
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { productId, position, notes } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check collection exists and user has permission
    const collection = await db.collection('collections').findOne({
      _id: new ObjectId(id)
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Authorization check
    if (session.user.role === 'artisan' && collection.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own collections' },
        { status: 403 }
      );
    }

    // Check product exists
    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId)
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check product not already in collection
    const alreadyExists = collection.products.some(p => p.productId === productId);
    if (alreadyExists) {
      return NextResponse.json(
        { success: false, error: 'Product already in collection' },
        { status: 409 }
      );
    }

    // Add product to collection
    const newPosition = position || collection.products.length + 1;
    
    const result = await db.collection('collections').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $push: {
          products: {
            productId: productId,
            position: newPosition,
            notes: notes || '',
            addedAt: new Date()
          }
        },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Product added to collection',
      data: result.value
    });

  } catch (error) {
    console.error('Error adding product to collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/:id/products/:productId
 * Remove product from collection
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id, productId } = params;
    
    if (!ObjectId.isValid(id) || !ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check collection exists and user has permission
    const collection = await db.collection('collections').findOne({
      _id: new ObjectId(id)
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Authorization check
    if (session.user.role === 'artisan' && collection.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own collections' },
        { status: 403 }
      );
    }

    // Remove product from collection
    const result = await db.collection('collections').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $pull: {
          products: { productId: productId }
        },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Product removed from collection',
      data: result.value
    });

  } catch (error) {
    console.error('Error removing product from collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
