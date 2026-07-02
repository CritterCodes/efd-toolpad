import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CollectionsModel from '@/app/api/collections/model';

/**
 * POST /api/production/collections/[collectionID]/members — stage a product member.
 * Body: { productId, position?, notes? }. Idempotent by productId (see model).
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body?.productId) return NextResponse.json({ error: 'productId is required.' }, { status: 400 });

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
