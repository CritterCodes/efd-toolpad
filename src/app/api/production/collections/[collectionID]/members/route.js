import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import CollectionsModel from '@/app/api/collections/model';

/**
 * POST /api/production/collections/[collectionID]/members — stage a product member.
 * Body: { productId, position?, notes? }. Idempotent by productId (see model).
 *
 * Readiness (contract §8) is NOT gated here (PM ruling #203 / M5-T1 spec §7): **staging a not-yet-ready
 * product is allowed** — readiness gates RELEASE (see `releaseCollection`), not membership. We only
 * confirm the product exists (a phantom productId is still a 404).
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body?.productId) return NextResponse.json({ error: 'productId is required.' }, { status: 400 });

  const dbInstance = await db.connect();
  const product = await dbInstance.collection('products').findOne({ productId: body.productId }, { projection: { _id: 1 } });
  if (!product) return NextResponse.json({ error: `Product "${body.productId}" not found.` }, { status: 404 });

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
