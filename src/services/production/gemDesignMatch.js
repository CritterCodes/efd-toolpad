import { estimateGemstoneCost, gemTierRate } from '@/services/production/designCost';

/**
 * Gemstone Phase 2 — the gem-design MATCH LANE: when sourcing a stone for a jewelry design, the
 * shop's OWN gemstone Designs compete alongside the stoneSkus catalog and live Stuller. A jewelry
 * stone slot that links a gem design pins **species + COLOR** (the color carries the rate) and is
 * bounded by the gem's edition — the no-oversell coupling (enforcement lands in Phase 3).
 *
 * Matching is species-first with the carat-range guard. The row's carat is the REFRAKT
 * diamond-equivalent estimate; species SG refinement arrives with the Phase-4 SG table — final
 * precision comes at cut time anyway (cutter trues up).
 */

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Score one gemstone Design's variants against a measured stone. PURE.
 * @param {{ gemType?: string, carat?: number }} measured  the jewelry stone row's spec
 * @param {object} design  a category:'gemstone' Design
 * @returns {Array} candidates — one per matching variant, with per-color prices at the carat
 */
export function gemDesignCandidates(measured = {}, design = {}) {
  if (design.category !== 'gemstone') return [];
  const wantSpecies = norm(measured.gemType);
  const carat = Number(measured.carat) || 0;
  const out = [];

  for (const v of design.variants || []) {
    const g = v.gemstone;
    if (!g || v.active === false) continue;
    const species = norm(g.species);
    if (wantSpecies && species && species !== wantSpecies && !species.includes(wantSpecies) && !wantSpecies.includes(species)) continue;

    const lo = Number(g.caratMin) || 0;
    const hi = Number(g.caratMax) || 0;
    const inRange = carat > 0 && hi > 0 ? carat >= lo && carat <= hi : true;

    // Per-color price at the row's carat (the cutter's material+labor — the jewelry COG input).
    const colors = (g.colors || [])
      .map((c) => {
        const rate = carat > 0 ? gemTierRate(c.rates, carat) : null;
        if (rate == null && carat > 0) return { label: c.label, price: null }; // beyond tiers → request
        const { estCost } = carat > 0
          ? estimateGemstoneCost({ carat, roughRatePerCarat: rate, yield: g.yield, cutLaborCost: g.cutLaborCost })
          : { estCost: null };
        return { label: c.label, price: estCost };
      })
      .filter((c) => c.label);

    const remaining = design.edition?.type === 'unlimited'
      ? null // uncapped
      : Math.max(0, (design.edition?.type === 'one_of_one' ? 1 : Number(design.edition?.limit) || 0)
          - (Number(design.edition?.allocated) || 0) - (Number(design.edition?.committed) || 0));

    out.push({
      kind: 'gemDesign',
      designID: design.designID,
      designName: design.name || species,
      variantId: v.variantId,
      species: g.species,
      creation: g.naturalSynthetic === 'lab' ? 'lab' : 'natural',
      treatment: g.treatment || null,
      availability: g.availability === 'special_request' ? 'special_request' : 'purchase',
      caratMin: lo || null,
      caratMax: hi || null,
      inRange,
      colors,
      editionType: design.edition?.type || 'unlimited',
      remaining,
      cutterId: design.primaryArtisanId || null,
    });
  }
  return out;
}

/** Edition slots left on a design (null = unlimited). */
export function editionRemaining(design = {}) {
  const e = design.edition || {};
  if (e.type === 'unlimited' || !e.type) return null;
  const cap = e.type === 'one_of_one' ? 1 : Number(e.limit) || 0;
  return Math.max(0, cap - (Number(e.allocated) || 0) - (Number(e.committed) || 0));
}

/**
 * The no-oversell rollup (display now; Phase-3 enforces at claim): how many pieces of a jewelry
 * variant its gem-linked stone rows allow — min over finite gems of ⌊gem remaining ÷ qty⌋.
 * @param {Array} rows      the variant's stone rows (gemDesignId + qty)
 * @param {Object} gemDocs  { [designID]: gem Design doc }
 * @returns {{ cap: number|null, limiting: string|null }} cap null = uncapped by gems
 */
export function gemBuildableForRows(rows = [], gemDocs = {}) {
  let cap = null;
  let limiting = null;
  for (const r of rows) {
    if (!r?.gemDesignId) continue;
    const doc = gemDocs[r.gemDesignId];
    if (!doc) continue;
    const remaining = editionRemaining(doc);
    if (remaining == null) continue; // unlimited gem never caps
    const per = Math.floor(remaining / Math.max(1, Number(r.qty) || 1));
    if (cap == null || per < cap) { cap = per; limiting = doc.name || r.gemDesignId; }
  }
  return { cap, limiting };
}

/** Rank candidates: in-range purchasable first, then in-range requests, then out-of-range. */
export function rankGemDesignCandidates(measured, designs = [], { limit = 6 } = {}) {
  const all = designs.flatMap((d) => gemDesignCandidates(measured, d));
  const tier = (c) => (c.inRange ? (c.availability === 'purchase' ? 0 : 1) : 2);
  return all
    .filter((c) => c.remaining === null || c.remaining > 0) // sold-out finite gems don't compete
    .sort((a, b) => tier(a) - tier(b))
    .slice(0, limit);
}
