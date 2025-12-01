/**
 * /api/collections/[id]/route.js
 * Collection detail, update, delete operations
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth.js';
import { ObjectId } from 'mongodb';

/**
 * GET /api/collections/:id
 * Get collection details
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

    return NextResponse.json({ success: true, data: collection });

  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/collections/:id
 * Update collection (artisans own, admins all)
 */
export async function PUT(request, { params }) {
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

    // Authorization check
    if (session.user.role === 'artisan' && collection.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own collections' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData = {};

    // Allowed fields to update
    const allowedFields = ['name', 'description', 'image', 'thumbnail', 'seo', 'status', 'drop'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update slug if name changed
    if (body.name && body.name !== collection.name) {
      const newSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check slug uniqueness
      const existing = await db.collection('collections').findOne({
        slug: newSlug,
        _id: { $ne: new ObjectId(id) }
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Collection name already exists' },
          { status: 409 }
        );
      }

      updateData.slug = newSlug;
    }

    updateData.updatedAt = new Date();

    const result = await db.collection('collections').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/:id
 * Archive collection (soft delete)
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

    // Authorization check
    if (session.user.role === 'artisan' && collection.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own collections' },
        { status: 403 }
      );
    }

    // Soft delete - mark as archived
    const result = await db.collection('collections').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'archived',
          isPublished: false,
          updatedAt: new Date(),
          archivedAt: new Date(),
          archivedBy: session.user.id
        }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Collection archived',
      data: result.value
    });

  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
