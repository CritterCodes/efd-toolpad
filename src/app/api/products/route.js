import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/products
 * List all products (with filters)
 * Admin can see all, artisans see only their own
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const artisanId = searchParams.get('artisanId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const { db } = await connectToDatabase();

    // Build query based on user role
    let query = {};
    
    if (session.user.role === 'admin' || session.user.role === 'superadmin') {
      // Admins see all products, optionally filtered
      if (status) query.status = status;
      if (artisanId) query.artisanId = artisanId;
    } else if (session.user.role === 'artisan') {
      // Artisans see only their own products
      query.artisanId = session.user.userID || session.user.id;
      if (status) query.status = status;
    } else {
      // Customers don't have access to this endpoint
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await db
      .collection('products')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('products').countDocuments(query);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Create new product (artisan submission or admin entry)
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only artisans and admins can create products
    if (!['artisan', 'admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only artisans and admins can create products' }, { status: 403 });
    }

    const data = await request.json();
    const { db } = await connectToDatabase();

    // Validate required fields
    const requiredFields = ['title', 'description', 'productType'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug is unique
    const existingSlug = await db.collection('products').findOne({ slug });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'Product title already exists' },
        { status: 400 }
      );
    }

    // Create product document
    const product = {
      title: data.title,
      slug,
      description: data.description,
      productType: data.productType,
      artisanId: session.user.userID || session.user.id,
      artisanInfo: {
        artisanId: session.user.userID || session.user.id,
        businessName: session.user.businessName || data.artisanInfo?.businessName,
        businessHandle: session.user.businessHandle || data.artisanInfo?.businessHandle,
        email: session.user.email,
        phone: data.artisanInfo?.phone,
        location: data.artisanInfo?.location
      },
      status: session.user.role === 'admin' ? 'approved' : 'draft',
      statusHistory: [
        {
          status: session.user.role === 'admin' ? 'approved' : 'draft',
          timestamp: new Date(),
          changedBy: session.user.userID || session.user.id,
          reason: 'Product created',
          notes: ''
        }
      ],
      // Copy optional fields if provided
      gemstone: data.gemstone || {},
      pricing: data.pricing || {},
      inventory: {
        quantity: data.inventory?.quantity || 1,
        reserved: 0,
        available: data.inventory?.quantity || 1,
        lowStockThreshold: data.inventory?.lowStockThreshold || 3,
        sku: data.inventory?.sku || `${slug}-${Date.now()}`
      },
      images: data.images || [],
      media: data.media || {},
      collectionIds: [],
      dropIds: [],
      cadRequests: [],
      designs: [],
      designOptions: [],
      seo: data.seo || {},
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert product
    const result = await db.collection('products').insertOne(product);
    product._id = result.insertedId;

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
