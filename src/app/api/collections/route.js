/**
 * /api/collections/route.js
 * Collection management API - GET list, POST create
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb.js';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/collections
 * List collections with filters
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const isPublished = searchParams.get('published');
    const ownerId = searchParams.get('ownerId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();
    
    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (isPublished !== null) filter.isPublished = isPublished === 'true';
    if (ownerId) filter.ownerId = ownerId;

    // Get total count
    const total = await db.collection('collections').countDocuments(filter);

    // Get paginated results
    const collections = await db.collection('collections')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 * Create new collection
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

    // Only admins and artisans can create collections
    if (!['admin', 'superadmin', 'artisan'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, type, image, thumbnail, drop, seo } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['artisan', 'admin', 'drop'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection type' },
        { status: 400 }
      );
    }

    // Artisans can only create artisan collections
    if (session.user.role === 'artisan' && type !== 'artisan') {
      return NextResponse.json(
        { success: false, error: 'Artisans can only create artisan collections' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug uniqueness
    const existing = await db.collection('collections').findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Collection name already exists' },
        { status: 409 }
      );
    }

    // Create collection
    const collection = {
      name,
      slug,
      description: description || '',
      type,
      status: 'draft',
      isPublished: false,
      products: [],
      image: image || null,
      thumbnail: thumbnail || null,
      seo: seo || {},
      drop: drop || null,
      // For artisan collections, set owner
      ...(type === 'artisan' && {
        ownerId: session.user.id,
        ownerInfo: {
          businessName: session.user.businessName || session.user.name,
          businessHandle: session.user.businessHandle,
          email: session.user.email
        }
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('collections').insertOne(collection);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: result.insertedId,
          ...collection
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
