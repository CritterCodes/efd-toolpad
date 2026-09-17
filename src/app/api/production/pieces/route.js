import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';
import DesignsModel from '@/app/api/designs/model';
import DropsModel from '@/app/api/drops/model';
import { isStaff, canManageDesign, designListFilter } from '@/lib/designPermissions';
import { canViewDrop } from '@/lib/dropPermissions';
import { createPieceFromDesign, createDirectPiece } from '@/services/production/pieceRouting';
import { intakePremadePiece } from '@/services/production/pieceIntake';
import { EditionCapacityError } from '@/services/production/editionCapacity';
import { db } from '@/lib/database';

/** GET /api/production/pieces — list (optional ?designID= / ?dropId= / ?status=).
 *  Staff see everything; artisans may read pieces of THEIR design, of a drop they own or
 *  collaborate on, or — unscoped — every piece across the designs they own. Nothing broader. */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const filter = {};
  const designID = searchParams.get('designID');
  const dropId = searchParams.get('dropId');
  const status = searchParams.get('status');
  if (designID) filter.designID = designID;
  if (dropId) filter.dropId = dropId;
  if (status) filter.status = status;

  if (!isStaff(session)) {
    if (session.user.role !== 'artisan') return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    if (designID) {
      const design = await DesignsModel.findById(designID);
      if (!design || !canManageDesign(session, design)) return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
    } else if (dropId) {
      const drop = await DropsModel.findById(dropId);
      if (!drop || !canViewDrop(session, drop)) return NextResponse.json({ error: 'Access denied — not your drop.' }, { status: 403 });
    } else {
      // "My pieces": every physical piece of every design this artisan owns. Resolved from their
      // designs rather than trusted from the caller, so the scope is still theirs alone — the
      // endpoint used to refuse this outright, which left artisans with no way to see their own
      // stock at all.
      const owned = await DesignsModel.list(designListFilter(session));
      const ids = owned.map((d) => d.designID).filter(Boolean);
      if (!ids.length) return NextResponse.json([], { status: 200 });
      filter.designID = { $in: ids };
    }
  }

  const pieces = await PiecesModel.list(filter);
  return NextResponse.json(pieces, { status: 200 });
};

/**
 * POST /api/production/pieces — bring a piece into existence. Two different intents:
 *
 *   `premade: true` → RECORD one that already exists (the ring in the case, a consigned stone,
 *     last year's handmade work). Comes in `available`, with its recorded cost and NO work
 *     orders — nobody is owed labor for work that was not done here.
 *   otherwise      → PRODUCE one. Routed work orders spawn from the design's routing.
 *
 * Producing stays with staff. Recording is open to the artisan whose design it is: an artisan
 * with finished work in the case needs to list it without asking anybody, which is the whole
 * point of the flow.
 *
 * Body: { designID, premade?, variantId?, metalType?, karat?, finish?, ringSize?, weight?,
 *         sku?, serialNumber?, cost?, retailPrice?, compareAtPrice?, note?,
 *         routing?, actualMaterials?, customerID?, billing? }
 */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const createdBy = session.user.userID || session.user.email || '';

  if (body?.premade === true) {
    if (!body.designID) {
      return NextResponse.json({ error: 'designID is required — a piece is an instance of a design.' }, { status: 400 });
    }
    const design = await DesignsModel.findById(body.designID);
    if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
    if (!canManageDesign(session, design)) {
      return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
    }
    try {
      const database = await db.connect();
      const piece = await intakePremadePiece({ client: db.client, database, design, data: body, actor: createdBy });
      return NextResponse.json(piece, { status: 201 });
    } catch (error) {
      // A spent edition is the caller's answer, not a server fault: the design says there is only
      // one of these and there already is one.
      const status = error instanceof EditionCapacityError ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
  }

  // Producing a piece spawns work orders and commits shop time; that stays with staff.
  if (!isStaff(session)) {
    return NextResponse.json(
      { error: 'Only staff can put a piece into production. To record one that already exists, send premade: true.' },
      { status: 403 },
    );
  }

  try {
    const piece = body?.designID
      ? await createPieceFromDesign(body.designID, { ...body, createdBy })
      : await createDirectPiece({ ...body, createdBy });
    return NextResponse.json(piece, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
