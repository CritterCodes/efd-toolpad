import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import CollectionsModel from '@/app/api/collections/model';
import { validateProductContract } from '@/services/products/productContract';

/**
 * POST /api/production/collections/[collectionID]/members — stage a product member.
 * Body: { productId, position?, notes? }. Idempotent by productId (see model).
 *
 * M4-T2 readiness gate (contract §8): the product must exist and pass `validateProductContract`
 * before it can be staged into a drop — an incomplete product is blocked with a 422 + field errors.
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body?.productId) return NextResponse.json({ error: 'productId is required.' }, { status: 400 });

  // Readiness gate: product must exist and satisfy the storefront contract before staging.
  const dbInstance = await db.connect();
  const product = await dbInstance.collection('products').findOne({ productId: body.productId });
  if (!product) return NextResponse.json({ error: `Product "${body.productId}" not found.` }, { status: 404 });
  const { valid, errors } = validateProductContract(product);
  if (!valid) {
    return NextResponse.json(
      { error: 'Product is not ready to stage (contract §8). Fix these before adding it to a drop:', errors },
      { status: 422 },
    );
  }

  const collection = await CollectionsModel.addMember(collectionID, body);
  if (!collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  return NextResponse.json(collection, { status: 200 });
};

/** DELETE /api/production/collections/[collectionID]/members?productId=… — unstage. */
export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  const productId = new URL(req.url).searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId query param is required.' }, { status: 400 });

  const collection = await CollectionsModel.removeMember(collectionID, productId);
  if (!collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  return NextResponse.json(collection, { status: 200 });
};
