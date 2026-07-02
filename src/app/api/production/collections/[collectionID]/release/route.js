import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { releaseCollection } from '@/services/production/collectionRelease';

/**
 * POST /api/production/collections/[collectionID]/release — go-live NOW (M1-T6).
 * Flips every member product to published + the collection to released (mechanism (a)).
 * The scheduled path uses the same service via `findDueReleases` on a cron. admin/dev.
 */
export const POST = async (_req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  try {
    const result = await releaseCollection(collectionID);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Collection not found.' ? 404 : 400 });
  }
};
