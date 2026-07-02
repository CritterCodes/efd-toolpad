import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CollectionsModel from '@/app/api/collections/model';

/** GET /api/production/collections/[collectionID] */
export const GET = async (_req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  const collection = await CollectionsModel.findById(collectionID);
  if (!collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  return NextResponse.json(collection, { status: 200 });
};

/** PUT /api/production/collections/[collectionID] — patch mutable fields. */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  const existing = await CollectionsModel.findById(collectionID);
  if (!existing) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const ALLOWED = ['name', 'slug', 'theme', 'description', 'ownerType', 'ownerId', 'ownerInfo', 'channel', 'status', 'releaseAt', 'image', 'thumbnail', 'seo'];
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
  const collection = await CollectionsModel.updateById(collectionID, update);
  return NextResponse.json(collection, { status: 200 });
};
