import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import { METAL_TYPES } from '@/constants/metalTypes';
import { priceSelection, resolveMetalVolumes } from '@/services/production/pricing';
import { resolveSelectionBindings } from '@/services/production/customizableBindings';
import { getDailyMetalSnapshot, currentPriceDay } from '@/services/production/dailyMetalSnapshot';
import { consumeRateLimit } from '@/lib/rateLimit';

/**
 * POST /api/refrakt-price — the A1 live-pricing endpoint (decision 0005, LOCKED).
 * PUBLIC + gated (the storefront product page is unauthenticated). Admin is the SOLE
 * pricing brain — refrakt/shop never price. Prices the selection's `resolvedMeshMap`
 * and returns { currency, subtotal (pre-tax retail), taxRate, taxAmount, total,
 * availability?, breakdown? (retail only), priceSource, pricedAt, selectionHash }.
 *
 * §6 STRICT metal bindings live (M3-T2): each customizable slot's chosen finish resolves to its
 * authored `binding.metalKey` (on `design.viewer.meshMap`), joined by `nameContains`; a selected
 * customizable slot with NO binding → **422** (0005 §10). Non-customizable/fixed slots price via
 * the design-metal fallback.
 * DEFERRED (documented follow-ups, all in 0005):
 *  - §6 BOUND GEM pricing (gemPreset → gemstoneId/materialRef): needs the owner cost-vs-retail
 *    clarification (products.pricing.retailPrice is RETAIL; the estimate path applies markup to a
 *    COST — feeding retail through ×markup over-prices ~2.5×). Bound-gem slots still price via the
 *    settings gemPrices fallback until 0005 §6 pins the gem-price semantics. Flagged in-thread.
 *  - §6 per-slot GLB volumes (per-part metal) — extraction step / refrakt export (#125); whole-piece
 *    stlVolume fallback until then.
 *  - §5 custom-base (customs `computeQuote`) + gemstone dispatch — design-estimate only for now.
 *  - §7 per-IP rate-limit util (admin has none yet) + §8 TTL caches — origin gate + s2s
 *    secret are in; rate-limit/cache are the next hardening.
 */

const ALLOWED_ORIGIN = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)|(engelfinedesign\.com$)/i;

// §7 per-IP rate limit (M3-T5) — env-tunable; default 120/min per IP (a debounced configurator user
// stays well under, scripted abuse trips it). s2s callers (shared key) are exempt.
const RL_WINDOW_MS = Number(process.env.REFRAKT_PRICE_RL_WINDOW_MS) || 60_000;
const RL_LIMIT = Number(process.env.REFRAKT_PRICE_RL_LIMIT) || 120;

function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

function originAllowed(req) {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (!origin) return true; // same-origin / server-side fetch (no Origin header)
  try { return ALLOWED_ORIGIN.test(new URL(origin).host ? origin : origin); } catch { return false; }
}

async function getInputs() {
  const dbInstance = await db.connect();
  // Daily pricing (0005 §8 amended, owner #3 / #169): price off the day's FROZEN metal snapshot
  // (captured-on-first-read from `metalPrices`), not the live tick, and echo `priceDay`.
  const priceDay = currentPriceDay();
  const [snapshot, settings] = await Promise.all([
    getDailyMetalSnapshot(dbInstance, priceDay),
    dbInstance.collection('adminSettings').findOne({}),
  ]);
  return {
    metalPrices: snapshot.rates,
    priceDay: snapshot.priceDay,
    cogMarkup: Number(settings?.financial?.cogMarkup) || 2.5,
    taxRate: Number(settings?.pricing?.taxRate) || 0,
    gemPrices: settings?.pricing?.gemPrices || {},
  };
}

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const POST = async (req) => {
  // §7 guard: server-to-server (shared secret) bypasses origin AND rate limit; else origin allowlist + per-IP limit.
  const s2s = process.env.EFD_PRICING_KEY && req.headers.get('x-efd-pricing-key') === process.env.EFD_PRICING_KEY;
  if (!s2s && !originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed.' }, { status: 403 });
  }
  if (!s2s) {
    const rl = await consumeRateLimit({ key: `refrakt-price:${clientIp(req)}`, limit: RL_LIMIT, windowMs: RL_WINDOW_MS });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limited — too many pricing requests. Slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const selection = body?.selection || {};
  const resolvedMeshMap = Array.isArray(selection.resolvedMeshMap) ? selection.resolvedMeshMap : [];
  const designID = body.designID || null;
  const baseProductId = body.baseProductId || selection.baseProductId || null;
  if (!designID && !baseProductId) {
    return NextResponse.json({ error: 'baseProductId or designID is required.' }, { status: 400 });
  }

  // Resolve base product (for dispatch) + design (source of volume/bom/metal).
  const dbInstance = await db.connect();
  let product = null;
  if (baseProductId) product = await dbInstance.collection('products').findOne({ productId: baseProductId }, { projection: { productType: 1, references: 1, pricing: 1 } });
  const dsnId = designID || product?.references?.designId || null;
  const design = dsnId ? await DesignsModel.findById(dsnId) : null;
  const productType = product?.productType || (design ? 'concept' : null);

  // §5 gemstone dispatch: trivial direct retail (no design needed).
  if (productType === 'gemstone') {
    const subtotal = round(product?.pricing?.retailPrice || 0);
    return NextResponse.json(finalize({ subtotal, breakdown: { metal: 0, stones: subtotal, labor: 0 }, priceSource: 'gemstone', selection }));
  }

  if (!design) return NextResponse.json({ error: 'Base product/design not found or not customizable.' }, { status: 404 });

  // §6 strict resolution: join each resolved slot → the design's authored `customizable` binding
  // by `nameContains`. A selected customizable slot with no binding = authoring incomplete → 422.
  const { metalKeyByFinish, unbound } = resolveSelectionBindings(design.viewer?.meshMap || [], resolvedMeshMap);
  if (unbound.length) {
    return NextResponse.json(
      { error: `Customizable slot(s) missing a cost binding: ${unbound.join(', ')}. Complete Customizer authoring (0005 §6/§10).`, unbound },
      { status: 422 },
    );
  }

  // §5 concept/jewelry → design-estimate. Wrap the money path so a pricing-input failure returns a
  // clean 500 (not an unstyled throw). Metal per-slot: bound `metalKey` (customizable) wins, else the
  // design's declared metal (fixed); each metal slot priced off its OWN `volumeCm3` (#187).
  let inputs;
  try {
    inputs = await getInputs();
  } catch (e) {
    return NextResponse.json({ error: 'Pricing temporarily unavailable.', detail: e?.message }, { status: 500 });
  }
  const { metalPrices, cogMarkup, taxRate, gemPrices, priceDay } = inputs;
  const gemEnabled = process.env.CUSTOMIZER_GEM_ENABLED === 'true'; // owner #4 / 0006: default OFF until real gem cost data
  const primaryMetalKey = Array.isArray(design.metalOptions) && design.metalOptions.find((k) => METAL_TYPES[k]);
  const bom = design.bom || {};
  const findingsCost = (bom.findings || []).reduce((s, f) => s + (Number(f.estUnitCost) || 0) * Math.max(Number(f.qty) || 1, 1), 0);

  let cost;
  try {
    cost = priceSelection({
      resolvedMeshMap,
      stlVolumeCm3: design.stlVolumeCm3 || 0,
      metalPrices,
      resolveMetalKey: (finish) => metalKeyByFinish[finish] || (METAL_TYPES[finish] ? finish : (primaryMetalKey || null)),
      // Per-slot metal volume: each metal slot off its own authored volumeCm3 (whole-model only as a
      // single-slot fallback) — fixes the multi-metal double-count (#187).
      resolveSlotVolumeCm3: resolveMetalVolumes({ resolvedMeshMap, designMeshMap: design.viewer?.meshMap || [], stlVolumeCm3: design.stlVolumeCm3 || 0 }),
      // Bound gems stay OFF behind the switch until real gem cost data lands (owner #4 / 0005 §6).
      gemUnitPrice: (preset) => (gemEnabled ? (Number(gemPrices[preset]) || 0) : 0),
      findingsCost,
      markup: 1, // apply markup below so the retail breakdown mirrors 0005 (retail, never COGS)
    });
  } catch (e) {
    return NextResponse.json({ error: 'Pricing failed for this selection.', detail: e?.message }, { status: 500 });
  }

  // Retail breakdown = cost components × markup (0005: breakdown is retail, NEVER costBasis).
  const breakdown = {
    metal: round(cost.breakdown.metal * cogMarkup),
    stones: round(cost.breakdown.gems * cogMarkup),
    labor: round((cost.breakdown.findings + cost.breakdown.labor) * cogMarkup),
  };
  const subtotal = round(breakdown.metal + breakdown.stones + breakdown.labor);
  return NextResponse.json(finalize({ subtotal, taxRate, breakdown, priceSource: 'design-estimate', availability: 'made-to-order', selection, priceDay }));
};

/** Assemble the 0005 §4 response (tax split + hash + pricedAt + priceDay). costBasis/COGS never included. */
function finalize({ subtotal, taxRate = 0, breakdown, priceSource, availability, selection, priceDay }) {
  const taxAmount = round(subtotal * taxRate);
  const selectionHash = 'sha256:' + createHash('sha256').update(JSON.stringify(selection || {})).digest('hex');
  return {
    currency: 'USD',
    subtotal: round(subtotal),
    taxRate,
    taxAmount,
    total: round(subtotal + taxAmount),
    priceDay: priceDay || currentPriceDay(),   // daily-pricing marker (0005 §8): displayed = charged within the day
    ...(availability ? { availability } : {}),
    breakdown,
    priceSource,
    pricedAt: new Date().toISOString(),
    selectionHash,
  };
}
