import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import DropsModel from '@/app/api/drops/model';
import { isStaff, canCreateDesignCategory, designListFilter, sessionArtisanTypes } from '@/lib/designPermissions';
import { canViewDrop } from '@/lib/dropPermissions';
import { db as mongo } from '@/lib/database';
import Constants from '@/lib/constants';

/**
 * How many physical pieces each design has, and how many are sellable right now.
 *
 * One grouped query for the whole list — the catalog index needs this for every row, and a
 * find-per-design would be N+1 on the page most likely to hold the whole catalog. It also keeps
 * artisans out of the pieces endpoint, which refuses an unscoped query by design.
 */
async function pieceCounts(designIDs) {
  if (!designIDs.length) return new Map();
  const database = await mongo.connect();
  const rows = await database.collection(Constants.PIECES_COLLECTION).aggregate([
    { $match: { designID: { $in: designIDs } } },
    {
      $group: {
        _id: '$designID',
        total: { $sum: 1 },
        available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
      },
    },
  ]).toArray();
  return new Map(rows.map((r) => [r._id, { total: r.total, available: r.available }]));
}

/** GET /api/production/designs — list designs (optional ?dropID=, ?withCounts=1).
 *  Staff see everything; artisans see ONLY their own designs (primaryArtisanId).
 *  `withCounts` adds `pieceCount`/`availablePieceCount` for the catalog index. */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  if (!isStaff(session) && session.user.role !== 'artisan') {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dropID = searchParams.get('dropID');
  const category = searchParams.get('category');
  // Gem designs are the shop's internal MENU — any design-authoring artisan may browse them to
  // link one into their jewelry (they still can't edit designs they don't own).
  const scope = category === 'gemstone' ? { category: 'gemstone' } : designListFilter(session);
  const designs = dropID ? await DesignsModel.findByDrop(dropID, scope) : await DesignsModel.list(scope);

  if (searchParams.get('withCounts') === '1') {
    const counts = await pieceCounts(designs.map((d) => d.designID).filter(Boolean));
    return NextResponse.json(
      designs.map((d) => ({
        ...d,
        pieceCount: counts.get(d.designID)?.total ?? 0,
        availablePieceCount: counts.get(d.designID)?.available ?? 0,
      })),
      { status: 200 },
    );
  }

  return NextResponse.json(designs, { status: 200 });
};

/** POST /api/production/designs — create a design. Artisan self-service (owner's matrix):
 *  gem cutters author gemstone designs; jewelers/engravers/CAD designers author jewelry.
 *  Artisan-created designs are always credited to (owned by) the artisan themselves. */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });

  if (!canCreateDesignCategory(session, body.category)) {
    const need = body.category === 'gemstone' ? 'gem cutters' : 'jewelers, engravers, or CAD designers';
    return NextResponse.json(
      { error: `Access denied — ${body.category === 'gemstone' ? 'gemstone' : 'jewelry'} designs can be created by ${need} (and staff). Your artisan types: ${sessionArtisanTypes(session).join(', ') || 'none'}.` },
      { status: 403 },
    );
  }

  // An artisan may only attach a design to a drop they own or collaborate on.
  if (!isStaff(session) && body.dropId) {
    const drop = await DropsModel.findById(body.dropId);
    if (!drop || !canViewDrop(session, drop)) {
      return NextResponse.json({ error: 'Access denied — you are not an owner or collaborator on that drop.' }, { status: 403 });
    }
  }

  const design = await DesignsModel.create({
    ...body,
    // Artisans always own what they create; staff may credit anyone.
    ...(isStaff(session) ? {} : { primaryArtisanId: session.user.userID || session.user.email }),
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(design, { status: 201 });
};
