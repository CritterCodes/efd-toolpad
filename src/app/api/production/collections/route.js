import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CollectionsModel from '@/app/api/collections/model';

/**
 * Clean unified Collections(≡Drops) API on `CollectionsModel` (Pipeline M1-T5).
 * Sits alongside the legacy `/api/collections/*` (which stays for existing consumers
 * on the `_id`/`products[]` shape and drains — tech-debt) and the legacy
 * `/api/production/drops`. New canonical writes go through this namespace.
 */

/** GET /api/production/collections — list (?ownerType= / ?status=). */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const filter = {};
  const ownerType = searchParams.get('ownerType');
  const status = searchParams.get('status');
  if (ownerType) filter.ownerType = ownerType;
  if (status) filter.status = status;

  const collections = await CollectionsModel.list(filter);
  return NextResponse.json(collections, { status: 200 });
};

/** POST /api/production/collections — create a unified Collection (≡Drop). */
export const POST = async (req) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });
  if (body.slug && (await CollectionsModel.findBySlug(body.slug))) {
    return NextResponse.json({ error: `slug "${body.slug}" already exists.` }, { status: 409 });
  }

  const collection = await CollectionsModel.create({
    ...body,
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(collection, { status: 201 });
};
