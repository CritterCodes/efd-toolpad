/**
 * Pure catalog-match engine (no DB, no network) — score a measured stone (from a REFRAKT gem
 * slot: gemType + cut + carat + mm) against the reorderable `stoneSkus` catalog and rank the
 * best reusable candidates. This is the "flywheel": every SKU sourced once becomes an instant
 * suggestion for every future design with a matching stone.
 *
 * Confidence tiers gate the UI: 'exact' auto-links on seed; 'close' is a one-click suggestion;
 * 'loose' shows only when nothing better exists.
 */

const normShape = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const lc = (s) => String(s || '').trim().toLowerCase();

// Pull an (L, W) in mm out of a Stuller dimensions string. Must be mm-AWARE: melee dims come as
// ".03 Ct :: 2 Mm" — a naive number grab reads the carat (.03) as a dimension. Prefer an explicit
// "L x W [x H] mm" footprint; else a single "N mm" value (round/square).
export function parseDimsMm(str) {
  if (!str) return null;
  const s = String(str);
  const pair = s.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (pair) { const a = Number(pair[1]); const b = Number(pair[2]); if (a > 0 && b > 0) return { l: Math.max(a, b), w: Math.min(a, b) }; }
  const single = s.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (single) { const v = Number(single[1]); if (v > 0) return { l: v, w: v }; }
  return null;
}

// Same species? Empty on either side is not a mismatch (unknown), but two known-different types are.
function typeMatches(mType, sType) {
  const a = lc(mType); const b = lc(sType);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Score one catalog stone against the measured spec. Returns null when the species clearly
 * differs (a diamond row must never match an amethyst SKU); otherwise a candidate object.
 *
 * @param {{ gemType?, cut?, carat?, lengthMm?, widthMm? }} measured
 * @param {object} stone  a stoneSkus record
 */
export function scoreCatalogMatch(measured = {}, stone = {}) {
  const sType = stone.gemType || stone.species;
  if (!typeMatches(measured.gemType, sType)) return null;

  const mShape = normShape(measured.cut);
  const sShape = normShape(stone.shape || stone.cut);
  const shapeMatch = Boolean(mShape && sShape && mShape === sShape);
  const shapeKnown = Boolean(mShape && sShape);

  // Size signal — prefer mm (the trade spec), fall back to carat proximity.
  let sizeDev = Infinity;         // 0 = identical; used for ranking + tiering
  const mDims = (measured.lengthMm && measured.widthMm)
    ? { l: Number(measured.lengthMm), w: Number(measured.widthMm) }
    : null;
  const sDims = parseDimsMm(stone.dimensions);
  if (mDims && sDims) {
    sizeDev = Math.max(Math.abs(mDims.l - sDims.l), Math.abs(mDims.w - sDims.w)); // mm
  } else if (measured.carat != null && stone.caratEach != null) {
    const mc = Number(measured.carat); const sc = Number(stone.caratEach);
    if (mc > 0 && sc > 0) sizeDev = (Math.abs(mc - sc) / Math.max(mc, sc)) * 5; // scale rel→~mm units
  }
  const sizeExact = sizeDev <= 0.3;
  const sizeClose = sizeDev <= 0.75;
  const sizeKnown = Number.isFinite(sizeDev);

  let confidence;
  if (shapeMatch && sizeExact) confidence = 'exact';
  else if ((shapeMatch && sizeClose) || (sizeExact && !shapeKnown)) confidence = 'close';
  else if (shapeMatch || sizeClose) confidence = 'loose';
  else confidence = 'loose';

  // Rank weight: lower is better. Shape mismatch + unknown size penalized so real fits float up.
  const rank = (shapeMatch ? 0 : 1) + (sizeKnown ? Math.min(sizeDev, 5) : 3) + (Number(stone.cost) > 0 ? 0 : 0.1);

  const reasons = [];
  if (shapeMatch) reasons.push('shape');
  if (sizeExact) reasons.push('size');
  else if (sizeClose) reasons.push('~size');
  if (typeMatches(measured.gemType, sType) && lc(measured.gemType) && lc(sType)) reasons.push('type');

  return { stone, confidence, rank, sizeDev: Number.isFinite(sizeDev) ? Number(sizeDev.toFixed(2)) : null, reasons };
}

const TIER = { exact: 0, close: 1, loose: 2 };

/**
 * Rank the whole catalog against a measured spec. Returns candidates best-first.
 * @returns {Array<{ stone, confidence, rank, sizeDev, reasons }>}
 */
export function rankCatalogMatches(measured = {}, stones = [], { limit = 6 } = {}) {
  return stones
    .map((s) => scoreCatalogMatch(measured, s))
    .filter(Boolean)
    .sort((a, b) => (TIER[a.confidence] - TIER[b.confidence]) || (a.rank - b.rank))
    .slice(0, limit);
}
