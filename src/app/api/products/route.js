import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';

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

    const db = await mongo.connect();

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
 * POST /api/products — RETIRED (0008 C-6).
 *
 * This handler wrote a THIRD, incompatible product shape (ObjectId-keyed with
 * `inventory{quantity,available}` / `collectionIds` / `dropIds` / `designOptions`
 * and an `artisanId` owner field) that no live UI create button produced — the
 * dead generic write path flagged in 0008 §2.3. It conflicts with the canonical
 * string-`productId` contract (0004/D6).
 *
 * Product creation now has ONE canonical path per type:
 *   - jewelry   → POST /api/products/jewelry
 *   - gemstone  → POST /api/products/gemstones
 *   - concept   → POST /api/production/designs/[designID]/list-concept  (pipeline)
 *   - jewelry (from a made piece) → POST /api/production/pieces/[pieceID]/list-product
 * all of which shape the doc via services/products/productContract
 * (normalizeProductWrite / buildProductFromPiece / buildConceptFromDesign).
 *
 * Per D9 the route file is left dormant (not deleted) and returns 410 Gone so any
 * unexpected caller surfaces in logs instead of silently writing a bad shape.
 * GET /api/products (the unified catalog read) is unchanged, above.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Retired endpoint (0008 C-6). Create products via the typed routes '
        + '(/api/products/jewelry, /api/products/gemstones) or the pipeline '
        + '(list-concept / list-product).',
      code: 'ENDPOINT_RETIRED',
    },
    { status: 410 },
  );
}
