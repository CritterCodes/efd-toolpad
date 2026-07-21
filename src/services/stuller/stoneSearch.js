/**
 * Stuller LOOSE-STONE search — diamonds, lab-grown diamonds, colored gemstones.
 *
 * These live on Stuller's Gem API (`/v2/gem/*`), NOT the `/v2/products` catalog (which is
 * findings/mountings/commodity SKUs). Ported from the standalone `stuller-mcp` package, which
 * already learned the hard lessons on real data:
 *   - Stuller's server-side fit-by-dimensions endpoint 500s, and the gemstone Length/Width
 *     filters match EXACTLY (useless for fitting a setting). So we scan a stone family by shape
 *     and rank locally by how close each stone's measured mm is to the target.
 *   - Round stones report only Length (Width comes back 0) → fall back width = length.
 *   - The gemstone `Colors` server filter is broken; we don't rely on it here (shape+size only).
 *
 * Uses the app's Stuller client (`stullerRequest`), which authenticates from the admin-settings
 * credentials (dev/prod DB) — same base URL + Basic auth the MCP uses.
 */

import { stullerRequest } from './stullerClient';

const DIAMONDS_PATH = '/v2/gem/diamonds';
const LAB_GROWN_PATH = '/v2/gem/labgrowndiamonds';
const GEMSTONES_PATH = '/v2/gem/gemstones';
const PRODUCTS_PATH = '/v2/products';
const FACETS_PATH = '/v2/products/advancedproductfilters';
const MAX_PAGE_SIZE = 100;
const MAX_FIT_TOLERANCE_MM = 5;

const num = (x) => (x == null || x === '' ? null : Number(x));

// Compose a human title from stone attributes (diamonds carry no description field).
function stoneTitle(parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || null;
}

function firstImage(images) {
  if (!Array.isArray(images)) return null;
  const i = images[0];
  return i?.Url || i?.url || (typeof i === 'string' ? i : null);
}

// ── Request builders ─────────────────────────────────────────────────────────
function buildDiamondRequest(opts = {}) {
  const body = {};
  if (opts.caratMin != null || opts.caratMax != null) {
    let lo = Number(opts.caratMin ?? 0);
    let hi = Number(opts.caratMax ?? 100);
    if (lo > hi) [lo, hi] = [hi, lo];
    body.SizeRange = [lo, hi];
  }
  if (opts.priceMin != null || opts.priceMax != null) {
    let lo = Number(opts.priceMin ?? 0);
    let hi = Number(opts.priceMax ?? 1_000_000);
    if (lo > hi) [lo, hi] = [hi, lo];
    body.PriceRange = [lo, hi];
  }
  if (opts.color?.length) body.Color = opts.color;
  if (opts.clarity?.length) body.Clarity = opts.clarity;
  if (opts.cut?.length) body.Cut = opts.cut;
  if (opts.shape?.length) body.Shape = opts.shape;
  body.PageSize = Math.min(opts.pageSize || 25, MAX_PAGE_SIZE);
  if (opts.nextPage) body.NextPage = opts.nextPage;
  return body;
}

// ── Transforms → a single normalized candidate shape ─────────────────────────
function transformDiamond(d = {}, source) {
  const images = d.Images;
  const title = stoneTitle([
    d.CaratWeight != null ? `${d.CaratWeight}ct` : null,
    d.Color, d.Clarity, d.Shape,
    source === 'lab_grown_diamond' ? 'Lab-Grown Diamond' : 'Diamond',
  ]);
  return {
    source,
    serialNumber: d.SerialNumber != null ? String(d.SerialNumber) : null,
    stoneType: source === 'lab_grown_diamond' ? 'Lab-Grown Diamond' : 'Diamond',
    shape: d.Shape ?? null,
    cut: d.Cut ?? null,
    color: d.Color ?? null,
    clarity: d.Clarity ?? null,
    caratWeight: num(d.CaratWeight),
    lengthMm: num(d.Length) || num(d.MMSize) || num(d.MaxDiameter),
    widthMm: num(d.Width) || num(d.MMSize) || num(d.MinDiameter),
    heightMm: num(d.Height),
    measurements: d.Measurements ?? null,
    price: num(d.Price?.Value ?? d.Price),
    currency: d.Price?.CurrencyCode || 'USD',
    certification: d.Certification ?? null,
    certificationNumber: d.CertificationNumber ?? null,
    title,
    primaryImage: firstImage(images),
    stullerUrl: d.SerialNumber != null ? `https://www.stuller.com/products/${d.SerialNumber}` : null,
  };
}

function transformGemstone(g = {}) {
  const images = g.Images;
  const title = g.Description || stoneTitle([
    g.CaratWeight != null ? `${g.CaratWeight}ct` : null,
    g.Color, g.Shape, g.StoneType ?? g.GemType,
  ]);
  return {
    source: 'gemstone',
    serialNumber: g.SerialNumber != null ? String(g.SerialNumber) : null,
    stoneType: g.StoneType ?? g.GemType ?? null,
    shape: g.Shape ?? null,
    cut: g.Cut ?? null,
    color: g.Color ?? null,
    clarity: g.Clarity ?? null,
    caratWeight: num(g.CaratWeight),
    lengthMm: num(g.Length),
    widthMm: num(g.Width),
    heightMm: num(g.Height) || num(g.Depth),
    measurements: null,
    price: num(g.Price?.Value ?? g.Price),
    currency: g.Price?.CurrencyCode || 'USD',
    certification: g.Certification ?? null,
    certificationNumber: g.CertificationNumber ?? null,
    title,
    primaryImage: firstImage(images),
    stullerUrl: g.SerialNumber != null ? `https://www.stuller.com/products/${g.SerialNumber}` : null,
  };
}

// Diamond/gemstone responses nest the list + paging under varying casings; accept them all.
function unwrap(payload, listKeys) {
  if (Array.isArray(payload)) return { items: payload, nextPage: null };
  for (const key of listKeys) {
    if (Array.isArray(payload?.[key])) {
      return { items: payload[key], nextPage: payload.NextPage ?? payload.nextPage ?? null };
    }
  }
  return { items: [], nextPage: null };
}

async function diamondPage(path, source, opts) {
  const body = buildDiamondRequest(opts);
  const payload = await stullerRequest(path, { method: 'POST', body });
  const { items, nextPage } = unwrap(payload, ['Diamonds', 'diamonds', 'LabGrownDiamonds', 'labGrownDiamonds']);
  return { items: items.map((d) => transformDiamond(d, source)), nextPage };
}

async function gemstonePage(opts) {
  const body = {};
  if (opts.stoneTypes?.length) body.StoneTypes = opts.stoneTypes;
  if (opts.shapes?.length) body.Shapes = opts.shapes;
  body.PageSize = Math.min(opts.pageSize || 25, MAX_PAGE_SIZE);
  if (opts.nextPage) body.NextPage = opts.nextPage;
  const payload = await stullerRequest(GEMSTONES_PATH, { method: 'POST', body });
  const { items, nextPage } = unwrap(payload, ['Gemstones', 'gemstones', 'GemStones']);
  return { items: items.map(transformGemstone), nextPage };
}

// ── Fit-by-dimensions (client-side ranking) ──────────────────────────────────
// Round stones report only Length (Width 0); a missing/zero width falls back to length.
function parseMeasurements(str) {
  if (typeof str !== 'string') return null;
  const nums = str.match(/[\d.]+/g);
  if (!nums || nums.length < 2) return null;
  return { length: Number(nums[0]), width: Number(nums[1]) };
}
function candidateDims(stone) {
  let length = Number(stone.lengthMm) || 0;
  let width = Number(stone.widthMm) || 0;
  if (!length) {
    const parsed = parseMeasurements(stone.measurements);
    if (parsed) { length = parsed.length; width = parsed.width; }
  }
  if (!length) return null;
  if (!(width > 0)) width = length;
  return { length, width };
}

/**
 * Map a REFRAKT gem preset + measured cut to a Stuller source + shape.
 * @returns {{ source: 'diamond'|'lab_grown_diamond'|'gemstone', stoneType?: string, shape?: string }}
 */
export function resolveStullerSource({ gemType, cut, lab } = {}) {
  const t = String(gemType || '').toLowerCase();
  const shape = cut ? cut.charAt(0).toUpperCase() + cut.slice(1).toLowerCase() : undefined;
  if (t === 'diamond' || t === '') {
    return { source: lab ? 'lab_grown_diamond' : 'diamond', shape };
  }
  // Any colored stone → gemstone search, StoneType is the capitalized preset.
  const stoneType = gemType ? gemType.charAt(0).toUpperCase() + gemType.slice(1) : undefined;
  return { source: 'gemstone', stoneType, shape };
}

/**
 * Find loose stones that fit a target size, ranked by closeness. Scans the stone family by
 * shape, filters to a mm tolerance window, sorts by total deviation. Best for center stones
 * (Stuller's serialized inventory rarely holds sub-2mm melee — source those by SKU/catalog).
 *
 * @param {{ gemType?:string, cut?:string, lengthMm:number, widthMm?:number, lab?:boolean,
 *   tolerance?:number, maxResults?:number, maxScan?:number }} opts
 * @returns {Promise<{ target, source, scanned, count, matches }>}
 */
export async function findStonesByDimensions(opts = {}) {
  const { gemType, cut, lengthMm, widthMm, lab, tolerance = 0.4, maxResults = 12, maxScan = 300 } = opts;
  if (!lengthMm) throw new Error('lengthMm (target stone length in mm) is required.');

  const { source, stoneType, shape } = resolveStullerSource({ gemType, cut, lab });
  const tol = Math.min(Number(tolerance) || 0.4, MAX_FIT_TOLERANCE_MM);
  const targetL = Number(lengthMm);
  const targetW = widthMm != null ? Number(widthMm) : targetL;

  const candidates = [];
  let nextPage;
  let scanned = 0;
  let pages = 0;
  do {
    let page;
    if (source === 'gemstone') {
      page = await gemstonePage({ shapes: shape ? [shape] : undefined, stoneTypes: stoneType ? [stoneType] : undefined, pageSize: MAX_PAGE_SIZE, nextPage });
    } else {
      const path = source === 'lab_grown_diamond' ? LAB_GROWN_PATH : DIAMONDS_PATH;
      // Bracket the carat filter TIGHTLY from the mm tolerance window — the gem API filters by
      // CaratWeight, not mm, and lab-grown inventory is huge, so a loose range pushes the
      // target-size stones past the scan cap. carat = 0.00364·L·W²; ±10% slack for the size↔ct
      // approximation vs each stone's real measured mm.
      const caratOf = (l, w) => 0.00364 * Math.max(l, 0.1) * Math.max(w, 0.1) * Math.max(w, 0.1);
      const loCt = Math.max(0, caratOf(targetL - tol, targetW - tol) * 0.9);
      const hiCt = caratOf(targetL + tol, targetW + tol) * 1.1;
      page = await diamondPage(path, source, { shape: shape ? [shape] : undefined, caratMin: loCt, caratMax: hiCt, pageSize: MAX_PAGE_SIZE, nextPage });
    }
    candidates.push(...page.items);
    scanned += page.items.length;
    nextPage = page.nextPage;
    pages += 1;
  } while (nextPage && scanned < maxScan && pages < 6);

  const matches = candidates
    .map((stone) => {
      const dims = candidateDims(stone);
      if (!dims) return null;
      const dL = Math.abs(dims.length - targetL);
      const dW = Math.abs(dims.width - targetW);
      return { ...stone, lengthMm: dims.length, widthMm: dims.width, deviationMm: Number((dL + dW).toFixed(3)), _dL: dL, _dW: dW };
    })
    .filter((c) => c && c._dL <= tol && c._dW <= tol && c.price != null)
    .sort((a, b) => a.deviationMm - b.deviationMm || (a.price || 0) - (b.price || 0))
    .slice(0, maxResults)
    .map(({ _dL, _dW, ...c }) => c); // eslint-disable-line no-unused-vars

  return {
    target: { gemType: gemType ?? null, cut: cut ?? null, shape: shape ?? null, lengthMm: targetL, widthMm: targetW, toleranceMm: tol, lab: Boolean(lab) },
    source,
    scanned,
    count: matches.length,
    matches,
  };
}

// ── Melee / calibrated stones by mm (Stuller /v2/products, StoneSize facet) ──────────
// Melee (and calibrated colored stones) are commodity products sold BY THE MILLIMETER —
// filterable via the StoneSize facet (values are literal mm, e.g. "2.00 x 2.00 mm"), priced
// per stone. This is the bench workflow: a 2mm stone in the CAD needs a 2mm stone ordered.
// The serialized /v2/gem API above only covers center-size certified stones (~2mm+), so it
// misses melee entirely — this fills that gap.

// Facet vocabulary is slow-changing; cache it (module memo, 1h TTL) so repeated matches
// don't re-fetch the whole StoneFamily/StoneShape list.
let _facetCache = null;
async function getFacetVocab() {
  const now = Date.now();
  if (_facetCache && now - _facetCache.at < 60 * 60 * 1000) return _facetCache.vocab;
  const payload = await stullerRequest(FACETS_PATH, { method: 'POST', body: {} });
  const raw = payload?.AdvancedProductFilter || payload?.AdvancedProductFilters || payload?.advancedProductFilters || [];
  const vocab = {};
  for (const f of raw) vocab[f.Type] = (f.Values || []).map((v) => ({ displayValue: v.DisplayValue, value: v.Value }));
  _facetCache = { at: now, vocab };
  return vocab;
}

// Case-insensitive exact/starts-with match of a measured name against a facet's values.
function matchFacetValue(values = [], name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  return values.find((v) => v.displayValue.toLowerCase() === n)
    || values.find((v) => v.displayValue.toLowerCase().startsWith(n))
    || values.find((v) => n.startsWith(v.displayValue.toLowerCase()))
    || null;
}

// Sorted (L≥W) mm from a StoneSize facet label ("3.20 x 2.30 mm", "2.00 x 2.00 x 1.50 mm").
function parseFacetSizeMm(label) {
  const nums = String(label || '').match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 1) return null;
  const n = nums.map(Number).filter((x) => x > 0 && x < 100);
  if (!n.length) return null;
  const l = Math.max(n[0], n[1] ?? n[0]);
  const w = Math.min(n[0], n[1] ?? n[0]);
  return { l, w };
}

function facetProductToCandidate(p = {}, mm, gemType) {
  const price = num(p.Price?.Value ?? p.Price);
  const sku = p.SKU || p.itemNumber || p.Sku || null;
  const imgs = p.Images || p.images;
  return {
    kind: 'melee',
    source: 'products',
    itemNumber: sku ? String(sku) : null,   // real products SKU → persist via from-stuller, cron-refreshable
    title: p.Description || p.description || sku,
    gemType: gemType || null,
    shape: mm?.shape || null,
    lengthMm: mm ? mm.l : null,
    widthMm: mm ? mm.w : null,
    price,
    currency: p.Price?.CurrencyCode || 'USD',
    unitOfSale: p.UnitOfSale || 'Each',
    primaryImage: firstImage(imgs),
    deviationMm: mm?.dev ?? null,
    stullerUrl: sku ? `https://www.stuller.com/products/${sku}` : null,
  };
}

/**
 * Find melee / calibrated stones that match a measured size, BY MM (the bench key).
 * Resolves StoneFamily + StoneShape, picks the closest calibrated StoneSize facet value(s)
 * within tolerance, and pulls the orderable per-stone SKUs at that size.
 *
 * @param {{ gemType?:string, cut?:string, lengthMm:number, widthMm?:number,
 *   tolerance?:number, maxSizes?:number, maxResults?:number }} opts
 * @returns {Promise<{ target, count, matches, note? }>}
 */
export async function searchStonesByMm(opts = {}) {
  const { gemType, cut, lengthMm, widthMm, tolerance = 0.2, maxSizes = 2, maxResults = 12 } = opts;
  if (!lengthMm) throw new Error('lengthMm is required.');
  const targetL = Number(lengthMm);
  const targetW = widthMm != null ? Number(widthMm) : targetL;
  const tol = Math.min(Number(tolerance) || 0.2, MAX_FIT_TOLERANCE_MM);

  const vocab = await getFacetVocab();
  const family = matchFacetValue(vocab.StoneFamily, gemType || 'Diamond');
  const shape = matchFacetValue(vocab.StoneShape, cut);
  if (!family) return { target: { gemType, lengthMm: targetL, widthMm: targetW }, count: 0, matches: [], note: `No Stuller StoneFamily for "${gemType}".` };

  // Scope the StoneSize facet to this family+shape so we rank only the sizes that actually
  // exist for it, then pick the closest calibrated size(s) to the measured footprint.
  const scopeFilters = [{ Type: 'StoneFamily', Values: [{ DisplayValue: family.displayValue, Value: family.value }] }];
  if (shape) scopeFilters.push({ Type: 'StoneShape', Values: [{ DisplayValue: shape.displayValue, Value: shape.value }] });
  const scoped = await stullerRequest(FACETS_PATH, { method: 'POST', body: { AdvancedProductFilters: scopeFilters } });
  const sraw = scoped?.AdvancedProductFilter || scoped?.AdvancedProductFilters || [];
  const sizeVals = (sraw.find((f) => f.Type === 'StoneSize')?.Values || []).map((v) => ({ displayValue: v.DisplayValue, value: v.Value }));

  const sized = sizeVals
    .map((v) => { const d = parseFacetSizeMm(v.displayValue); if (!d) return null; return { ...v, ...d, dev: Math.max(Math.abs(d.l - targetL), Math.abs(d.w - targetW)) }; })
    .filter(Boolean)
    .sort((a, b) => a.dev - b.dev);
  const chosen = sized.filter((s) => s.dev <= tol).slice(0, maxSizes);
  if (!chosen.length) {
    const nearest = sized[0];
    return { target: { gemType, cut, lengthMm: targetL, widthMm: targetW, toleranceMm: tol }, count: 0, matches: [], note: nearest ? `No calibrated ${family.displayValue}${shape ? ' ' + shape.displayValue : ''} within ${tol}mm; nearest is ${nearest.displayValue}.` : 'No calibrated sizes found.' };
  }

  // Pull orderable per-stone SKUs at the chosen size(s). One product search per size so each
  // result keeps its exact mm (the facet size we asked for).
  const matches = [];
  for (const size of chosen) {
    const filters = [...scopeFilters, { Type: 'StoneSize', Values: [{ DisplayValue: size.displayValue, Value: size.value }] }];
    const payload = await stullerRequest(PRODUCTS_PATH, { method: 'POST', body: { AdvancedProductFilters: filters, Filter: ['Orderable'], Include: ['All'], PageSize: Math.min(maxResults, MAX_PAGE_SIZE) } });
    const prods = payload?.Products || payload?.products || [];
    for (const p of prods) matches.push(facetProductToCandidate(p, { l: size.l, w: size.w, dev: Number(size.dev.toFixed(2)), shape: shape?.displayValue }, family.displayValue));
    if (matches.length >= maxResults) break;
  }

  return {
    target: { gemType: family.displayValue, cut: shape?.displayValue || cut || null, lengthMm: targetL, widthMm: targetW, toleranceMm: tol },
    count: matches.length,
    matches: matches.slice(0, maxResults),
  };
}
