/**
 * /api/drop-requests/[id]/route.js
 * Drop request detail, update, publish
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth.js';
import { ObjectId } from 'mongodb';

/**
 * GET /api/drop-requests/:id
 * Get drop request details with submission counts
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drop request ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const dropRequest = await db.collection('drop-requests').findOne({
      _id: new ObjectId(id)
    });

    if (!dropRequest) {
      return NextResponse.json(
        { success: false, error: 'Drop request not found' },
        { status: 404 }
      );
    }

    // Add submission count for admin view
    const enriched = {
      ...dropRequest,
      submissionCount: dropRequest.submissions?.length || 0,
      selectedCount: dropRequest.selectedProducts?.length || 0
    };

    return NextResponse.json({ success: true, data: enriched });

  } catch (error) {
    console.error('Error fetching drop request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/drop-requests/:id
 * Update drop request (admin only, before publishing)
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

    // Only admins can update drop requests
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can update drop requests' },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drop request ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const dropRequest = await db.collection('drop-requests').findOne({
      _id: new ObjectId(id)
    });

    if (!dropRequest) {
      return NextResponse.json(
        { success: false, error: 'Drop request not found' },
        { status: 404 }
      );
    }

    // Can't update published drops
    if (dropRequest.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Cannot update published drops' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = {};

    // Allowed fields to update
    const allowedFields = ['theme', 'vibes', 'description', 'requirements', 'opensAt', 'closesAt', 'targetQuantity'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate date consistency if dates are being updated
    if (updateData.opensAt || updateData.closesAt) {
      const openDate = updateData.opensAt ? new Date(updateData.opensAt) : dropRequest.opensAt;
      const closeDate = updateData.closesAt ? new Date(updateData.closesAt) : dropRequest.closesAt;

      if (closeDate <= openDate) {
        return NextResponse.json(
          { success: false, error: 'closesAt must be after opensAt' },
          { status: 400 }
        );
      }
    }

    updateData.updatedAt = new Date();

    const result = await db.collection('drop-requests').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    console.error('Error updating drop request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drop-requests/:id
 * Archive drop request (admin only)
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

    // Only admins can delete
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete drop requests' },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drop request ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const dropRequest = await db.collection('drop-requests').findOne({
      _id: new ObjectId(id)
    });

    if (!dropRequest) {
      return NextResponse.json(
        { success: false, error: 'Drop request not found' },
        { status: 404 }
      );
    }

    // Can't delete published drops
    if (dropRequest.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete published drops' },
        { status: 400 }
      );
    }

    // Archive drop request
    const result = await db.collection('drop-requests').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date(),
          archivedAt: new Date(),
          archivedBy: session.user.id
        }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Drop request archived',
      data: result.value
    });

  } catch (error) {
    console.error('Error deleting drop request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
