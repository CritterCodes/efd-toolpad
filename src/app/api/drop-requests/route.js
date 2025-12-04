/**
 * /api/drop-requests/route.js
 * Drop request management - admin creates drops, artisans view and submit
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb.js';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/drop-requests
 * List drop requests - admins see all, artisans see active only
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Build filter
    const filter = {};
    
    // Artisans only see open drops
    if (session.user.role === 'artisan') {
      filter.status = 'open';
      filter.opensAt = { $lte: new Date() };
      filter.closesAt = { $gte: new Date() };
    } else if (status) {
      filter.status = status;
    }

    // Get total count
    const total = await db.collection('drop-requests').countDocuments(filter);

    // Get paginated results
    const dropRequests = await db.collection('drop-requests')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: dropRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching drop requests:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drop-requests
 * Create new drop request (admin only)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can create drop requests
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can create drop requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      theme,
      vibes,
      description,
      requirements,
      opensAt,
      closesAt,
      targetQuantity
    } = body;

    // Validate required fields
    if (!theme || !opensAt || !closesAt) {
      return NextResponse.json(
        { success: false, error: 'theme, opensAt, and closesAt are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const openDate = new Date(opensAt);
    const closeDate = new Date(closesAt);

    if (closeDate <= openDate) {
      return NextResponse.json(
        { success: false, error: 'closesAt must be after opensAt' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Create drop request
    const dropRequest = {
      theme,
      vibes: vibes || '',
      description: description || '',
      requirements: requirements || {},
      status: 'draft',
      createdAt: new Date(),
      createdBy: session.user.id,
      opensAt: openDate,
      closesAt: closeDate,
      targetQuantity: targetQuantity || null,
      submissions: [],
      selectedArtisans: [],
      selectedProducts: [],
      collectionId: null,
      updatedAt: new Date()
    };

    const result = await db.collection('drop-requests').insertOne(dropRequest);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: result.insertedId,
          ...dropRequest
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating drop request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
