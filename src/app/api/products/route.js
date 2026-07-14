import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';
import { mergeProductEditorUpdate } from '@/services/products/productEditorPayload';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'dev', 'staff']);

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const db = await mongo.connect();

    // Build query based on user role
    let query = {};
    
    if (ADMIN_ROLES.has(session.user.role)) {
      // Admins see all products, optionally filtered
      if (status) query.status = status;
      if (artisanId) query.artisanId = artisanId;
    } else if (session.user.role === 'artisan') {
      // Artisans see only their own products
      const id = session.user.userID || session.user.id;
      query.$or = [{ artisanId: id }, { userId: id }, { 'seller.userId': id }];
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
    if (session.user.role !== 'artisan' && !ADMIN_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: 'Only artisans and admins can create products' }, { status: 403 });
    }

    const data = await request.json();
    const db = await mongo.connect();

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

    const isAdmin = ADMIN_ROLES.has(session.user.role);
    const editorFields = mergeProductEditorUpdate({}, data, { canAdminister: isAdmin });
    const ownerId = (isAdmin && editorFields.artisanId) || session.user.userID || session.user.id;
    const now = new Date();
    const prefix = data.productType === 'gemstone' ? 'gem' : 'jwl';
    const productId = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const quantity = editorFields.inventory?.quantity ?? 1;

    // Create a contract-shaped draft. Publishing is a separate, audited transition.
    const product = {
      ...editorFields,
      productId,
      slug,
      artisanId: ownerId,
      artisanInfo: {
        artisanId: ownerId,
        businessName: session.user.businessName || data.artisanInfo?.businessName,
        businessHandle: session.user.businessHandle || data.artisanInfo?.businessHandle,
        email: session.user.email,
        phone: data.artisanInfo?.phone,
        location: data.artisanInfo?.location
      },
      seller: { ...(data.seller || {}), userId: ownerId },
      status: 'draft',
      availability: editorFields.availability || 'ready-to-ship',
      statusHistory: [
        {
          status: 'draft',
          timestamp: now,
          changedBy: session.user.userID || session.user.id,
          reason: 'Product created',
          notes: ''
        }
      ],
      gemstone: editorFields.gemstone || {},
      jewelry: editorFields.jewelry || {},
      pricing: { currency: 'USD', ...(editorFields.pricing || {}) },
      inventory: {
        ...(editorFields.inventory || {}),
        quantity,
        reserved: 0,
        available: quantity,
        lowStockThreshold: data.inventory?.lowStockThreshold ?? 3,
        sku: editorFields.inventory?.sku || `${slug}-${Date.now()}`
      },
      fulfillment: editorFields.fulfillment || {},
      references: editorFields.references || {},
      images: Array.isArray(data.images) ? data.images : [],
      media: data.media && typeof data.media === 'object' ? data.media : {},
      collectionIds: editorFields.collections || [],
      dropIds: [],
      designs: [],
      designOptions: [],
      seo: editorFields.seo || {},
      publishing: { visible: false, featured: false, publishedAt: null },
      createdAt: now,
      updatedAt: now,
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
