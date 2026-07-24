import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { StonesModel } from '../model';
import { rankCatalogMatches } from '../matcher';
import { searchStonesByMm, findStonesByDimensions } from '@/services/stuller/stoneSearch';
import DesignsModel from '@/app/api/designs/model';
import { rankGemDesignCandidates } from '@/services/production/gemDesignMatch';

// Below this footprint a stone is melee/calibrated (sold by mm, per stone). Above it, offer
// serialized certified center stones too (a little grace on size).
const CENTER_MM = 3.5;

/**
 * POST /api/products/stones/match
 * Body: { gemType?, cut?, carat?, lengthMm?, widthMm?, lab?, includeStuller?, limit? }
 *
 * Returns the best reusable stones for a measured gem slot, matched BY MM (the bench key):
 *   - `catalog`: ranked stoneSkus matches (the flywheel — instant, reliable). The top one is
 *     flagged `exact` when type + shape + size all line up (the design page auto-links those).
 *   - `stuller`: live Stuller candidates. PRIMARY path is melee/calibrated `/v2/products` by the
 *     StoneSize facet (per-stone price, `kind:'melee'`, persist via from-stuller). For center-size
 *     stones it also adds serialized certified stones (`kind:'serialized'`, persist via from-gem).
 *     Best-effort — degrades to [] if Stuller is unreachable.
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const measured = {
    gemType: body.gemType || '',
    cut: body.cut || '',
    creation: body.creation === 'lab' ? 'lab' : 'natural',
    carat: body.carat != null && body.carat !== '' ? Number(body.carat) : null,
    lengthMm: body.lengthMm != null && body.lengthMm !== '' ? Number(body.lengthMm) : null,
    widthMm: body.widthMm != null && body.widthMm !== '' ? Number(body.widthMm) : null,
  };

  // Catalog match (pure, always available).
  let catalog = [];
  try {
    const pool = await StonesModel.matchCandidates({ gemType: measured.gemType });
    catalog = rankCatalogMatches(measured, pool, { limit: body.limit || 6 });
  } catch (e) {
    // A catalog read failure shouldn't kill the whole suggestion — fall through with [].
    catalog = [];
  }

  // Gem-design lane (Phase 2): the shop's OWN gemstone Designs compete — species match + carat
  // range guard, priced per color at the row's carat. Linking pins species + COLOR and couples
  // the jewelry to the gem's edition (enforcement in Phase 3).
  let gemDesigns = [];
  try {
    const pool = await DesignsModel.list({ category: 'gemstone', status: { $nin: ['retired'] } });
    gemDesigns = rankGemDesignCandidates(measured, pool, { limit: body.limit || 6 });
  } catch (e) {
    gemDesigns = [];
  }

  // Live Stuller (best-effort). Only when a size is known and the caller opts in.
  const stuller = [];
  const stullerErrors = [];
  const limit = body.limit || 8;
  const isDiamond = !measured.gemType || String(measured.gemType).toLowerCase() === 'diamond';
  const big = measured.lengthMm >= CENTER_MM;
  if (body.includeStuller !== false && measured.lengthMm) {
    // PRIMARY: melee/calibrated by mm (covers the bulk + colored stones), filtered to the
    // requested creation. Melee must be EXACT (a 2mm slot needs a 2mm stone); centers get grace.
    try {
      const res = await searchStonesByMm({ gemType: measured.gemType, cut: measured.cut, creation: measured.creation, lengthMm: measured.lengthMm, widthMm: measured.widthMm, tolerance: big ? 0.5 : 0.2, maxSizes: big ? 3 : 2, maxResults: limit });
      stuller.push(...(res.matches || []));
      if (!res.matches?.length && res.note) stullerErrors.push(res.note);
    } catch (e) { stullerErrors.push(e.message || 'Melee search failed'); }

    // SECONDARY: serialized certified center stones (diamonds only — the gem API carries no
    // small/colored inventory), when the stone is center-sized. Creation picks the endpoint.
    if (big && isDiamond) {
      try {
        const res = await findStonesByDimensions({ gemType: measured.gemType, cut: measured.cut, lengthMm: measured.lengthMm, widthMm: measured.widthMm, lab: measured.creation === 'lab', maxResults: limit });
        stuller.push(...(res.matches || []).map((m) => ({ ...m, kind: 'serialized', creation: measured.creation })));
      } catch (e) { stullerErrors.push(e.message || 'Serialized search failed'); }
    }
  }

  // Melee (exact-mm) first, then serialized, each by closeness of fit.
  stuller.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'melee' ? -1 : 1) || (a.deviationMm ?? 9) - (b.deviationMm ?? 9));

  return NextResponse.json({ success: true, measured, catalog, gemDesigns, stuller, stullerError: stullerErrors[0] || null }, { status: 200 });
};
