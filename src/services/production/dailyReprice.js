/**
 * Daily listing repricer (owner ruling, 2026-08-25):
 *
 *   "All products should be live prices. RTS/made pieces should be a formula using COGS.
 *    Literally everything for sale is updated daily."
 *
 * Two formulas, because the two kinds of cost mean different things:
 *
 *   NOT YET MADE (design-backed, `costBasisSource:'estimated'`)
 *     The metal has not been bought, so today's metal IS the cost. Recompute the whole
 *     recipe from the day's rates → cost and price both move. `costBasis` is rewritten.
 *
 *   ALREADY MADE (piece-backed, `costBasisSource:'actual'`)
 *     The money is spent; that COGS is a historical fact and is NEVER rewritten — doing so
 *     would falsify what the piece cost. Price is a FORMULA on that fixed COGS, so it holds
 *     steady unless the markup changes.
 *
 * WHY IT PRICES OFF THE DAY'S FROZEN SNAPSHOT, not the live tick: `/api/refrakt-price`
 * already prices the configurator off `metalPriceSnapshots` for the day (decision 0005 §8 —
 * "displayed = charged within the day"). Using the same snapshot means a listing price and a
 * configured price computed on the same day agree, instead of disagreeing by whatever the
 * market did between two reads.
 *
 * FAIL CLOSED. Every guard here exists to avoid the one catastrophic outcome: writing a
 * wrong price to a live storefront. No metal rates → write nothing. A design with no STL
 * volume → skip it (its mounting cost is unknowable, and a price missing its metal is worse
 * than a stale one). A computed price of zero → skip. Anything skipped is REPORTED, never
 * silently passed over, so a listing can't quietly stop being repriced.
 */
import { db } from '@/lib/database';
import { getDailyMetalSnapshot, currentPriceDay } from '@/services/production/dailyMetalSnapshot';
import { estimateMetalCost, estimateDesignCost, gemstoneFromPrice } from '@/services/production/designCost';
import { variantPricing, sharedCostsFor, hasSharedLabor } from '@/services/production/variantPricing';
import { priceSelection, resolveMetalVolumes } from '@/services/production/pricing';
import { resolveSelectionBindings } from '@/services/production/customizableBindings';
import { METAL_TYPES } from '@/constants/metalTypes';
import { getTaskSuggestions } from '@/services/customs/customTasks';

const DEFAULT_MARKUP = 2.5;
const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const n = (v) => Number(v) || 0;

/** Products the storefront will actually sell — the same visibility test checkout applies. */
const SELLABLE = { $or: [{ status: 'published' }, { isPublic: true }] };

/** Live wholesale cost per stone SKU. Read straight from the catalog (no 50-row API cap). */
async function loadStoneCosts(dbi) {
  const rows = await dbi.collection('stoneSkus')
    .find({}, { projection: { _id: 0, stoneSkuId: 1, cost: 1 } })
    .toArray();
  const map = {};
  for (const s of rows) if (s.stoneSkuId) map[s.stoneSkuId] = n(s.cost);
  return map;
}

/** Current cost for the auto-labor tasks (casting cleanup + carat-band stone setting). */
async function loadTaskCosts() {
  const out = {};
  for (const q of ['casting', 'set stone']) {
    try {
      const rows = await getTaskSuggestions(q, 40, 'custom');
      for (const t of (Array.isArray(rows) ? rows : [])) {
        if (t.label && t.cost != null) out[t.label] = n(t.cost);
      }
    } catch { /* fall back to the built-in band defaults */ }
  }
  return out;
}

/** designFee falls back to the primary artisan's custom design fee when left blank. */
async function loadArtisanFees(dbi) {
  const rows = await dbi.collection('users')
    .find(
      { 'artisanApplication.customDesignFee': { $exists: true } },
      { projection: { _id: 0, userID: 1, 'artisanApplication.customDesignFee': 1 } },
    )
    .toArray();
  const map = {};
  for (const u of rows) if (u.userID) map[u.userID] = n(u.artisanApplication?.customDesignFee);
  return map;
}

/**
 * Price every variant of a jewelry design off today's rates.
 * @returns {{ ok: true, variants: Array } | { ok: false, reason: string }}
 */
export function priceDesignVariants({ design, rates, stoneCosts, taskCosts, artisanFee, defaultMarkup }) {
  const volume = n(design.stlVolumeCm3);
  if (!(volume > 0)) {
    // Mounting is the largest line in most pieces. Without volume we'd price a ring as if it
    // were made of nothing — cheaper than its own metal. Refuse.
    return { ok: false, reason: 'design has no STL volume, so mounting cost is unknowable' };
  }

  const pricing = design.pricing || {};
  const shared = sharedCostsFor(pricing, {
    artisanFee,
    editionType: design.edition?.type ?? design.editionType ?? null,
    editionLimit: design.edition?.limit ?? design.editionLimit ?? null,
  });
  const sharedLabor = hasSharedLabor(pricing);
  const baseMarkup = n(pricing.markup) > 0 ? n(pricing.markup) : defaultMarkup;

  // Price each distinct metal once — a design's variants are the same geometry in different
  // metals, so this is per-metalKey work, not per-variant work.
  const mountingByMetal = new Map();
  const mountingFor = (metalKey) => {
    if (!metalKey) return 0;
    if (!mountingByMetal.has(metalKey)) {
      let cost = 0;
      try {
        cost = n(estimateMetalCost({ volumeCm3: volume, metalKey, metalPrices: rates }).metalCost);
      } catch {
        cost = 0; // unknown metalKey — surfaces below as a zero price and gets skipped
      }
      mountingByMetal.set(metalKey, cost);
    }
    return mountingByMetal.get(metalKey);
  };

  const out = [];
  for (const variant of (design.variants || [])) {
    if (variant.active === false) continue;
    const mounting = mountingFor(variant.metalKey);
    if (!(mounting > 0)) {
      out.push({ variantId: variant.variantId, ok: false, reason: `no metal cost for ${variant.metalKey || 'unset metal'}` });
      continue;
    }
    const priced = variantPricing({
      variant, mounting, sharedCosts: shared, sharedLabor, baseMarkup,
      productionMethod: design.productionMethod || 'cad_cast',
      taskCosts, stoneCosts,
    });
    if (!(priced.retail > 0)) {
      out.push({ variantId: variant.variantId, ok: false, reason: 'computed a zero price' });
      continue;
    }
    out.push({ variantId: variant.variantId, ok: true, ...priced });
  }
  return { ok: true, variants: out };
}

/**
 * The design's DEFAULT configuration expressed as a `resolvedMeshMap` — what the
 * configurator shows the moment it opens. Each customizable slot takes its authored
 * `default` (falling back to the first option), fixed slots keep what they were built as.
 */
export function defaultResolvedMeshMap(meshMap = []) {
  return (Array.isArray(meshMap) ? meshMap : [])
    .filter((s) => s && s.nameContains && (s.type === 'metal' || s.type === 'gem'))
    .map((s) => {
      const key = s.type === 'gem' ? 'gemPreset' : 'finish';
      const opts = s.customizable?.options || [];
      const chosen = s.customizable ? (s.customizable.default ?? opts[0]?.[key] ?? s[key]) : s[key];
      return { nameContains: s.nameContains, type: s.type, [key]: chosen, ...(s.qty ? { qty: s.qty } : {}) };
    })
    .filter((s) => s.finish || s.gemPreset);
}

/**
 * Design-level cost for a listing with NO variants — a customizable piece. The
 * configurator prices the shopper's real selection live; the product record only carries
 * the headline number the grid/PDP shows, which is what goes stale.
 *
 * Priced through the SAME engine as `/api/refrakt-price` (priceSelection + the authored
 * `binding.metalKey`, per-slot volumes, one print fee, gems off behind the same switch),
 * so the listing price and the configurator's opening price are the same number rather
 * than two estimates that happen to be close. Falls back to the design-estimate path used
 * by the manual refresh-price button when a design has no meshMap.
 * @returns {{ ok: true, cost: number } | { ok: false, reason: string }}
 */
export function priceDesignBase({ design, rates, gemPrices = {} }) {
  const volume = n(design.stlVolumeCm3);
  if (!(volume > 0)) return { ok: false, reason: 'design has no STL volume, so mounting cost is unknowable' };

  const meshMap = design.viewer?.meshMap || [];
  const findingsCost = (design.bom?.findings || [])
    .reduce((s, f) => s + n(f.estUnitCost) * Math.max(n(f.qty) || 1, 1), 0);

  if (meshMap.some((s) => s?.type === 'metal')) {
    const resolved = defaultResolvedMeshMap(meshMap);
    const { metalKeyByFinish } = resolveSelectionBindings(meshMap, resolved);
    // Gems stay OFF unless the configurator has them on — a listing must not advertise a
    // stone the configurator prices at zero (owner #4 / 0005 §6).
    const gemEnabled = process.env.CUSTOMIZER_GEM_ENABLED === 'true';
    const priced = priceSelection({
      resolvedMeshMap: resolved,
      stlVolumeCm3: volume,
      metalPrices: rates,
      resolveMetalKey: (finish) => metalKeyByFinish[finish] || (METAL_TYPES[finish] ? finish : (design.metalOptions?.[0] || null)),
      resolveSlotVolumeCm3: resolveMetalVolumes({ resolvedMeshMap: resolved, designMeshMap: meshMap, stlVolumeCm3: volume }),
      gemUnitPrice: (preset) => (gemEnabled ? n(gemPrices[preset]) : 0),
      findingsCost,
      markup: 1, // markup is applied by the caller, so cost and price stay separable
    });
    if (n(priced.costBasis) > 0) return { ok: true, cost: round(priced.costBasis) };
    return { ok: false, reason: 'customizable design has no priced metal binding on its default option' };
  }

  const metalKey = design.metalOptions?.[0] || null;
  if (!metalKey) return { ok: false, reason: 'design has no variants and no metal option to price from' };
  try {
    const est = estimateDesignCost({ stlVolumeCm3: volume, metalKey, metalPrices: rates, bom: design.bom || {} });
    if (!(n(est.estCost) > 0)) return { ok: false, reason: `no metal cost for ${metalKey}` };
    return { ok: true, cost: round(est.estCost) };
  } catch {
    return { ok: false, reason: `no metal cost for ${metalKey}` };
  }
}

/**
 * Reprice every sellable listing for `priceDay`.
 * @param {{ dryRun?: boolean, priceDay?: string }} opts
 */
export async function repriceListings({ dryRun = false, priceDay: dayIn } = {}) {
  const dbi = await db.connect();
  const priceDay = dayIn || currentPriceDay();
  const snapshot = await getDailyMetalSnapshot(dbi, priceDay);
  const rates = snapshot.rates || {};

  // No rates = no prices. Writing here would zero out a live storefront.
  if (!Object.values(rates).some((r) => n(r) > 0)) {
    return { ok: false, priceDay, reason: 'no metal rates available for this day — nothing repriced', scanned: 0, updated: 0, skipped: [] };
  }

  const [settings, stoneCosts, taskCosts, artisanFees] = await Promise.all([
    dbi.collection('adminSettings').findOne({}),
    loadStoneCosts(dbi),
    loadTaskCosts(),
    loadArtisanFees(dbi),
  ]);
  const defaultMarkup = n(settings?.financial?.cogMarkup) > 0 ? n(settings.financial.cogMarkup) : DEFAULT_MARKUP;

  const products = await dbi.collection('products').find(SELLABLE).toArray();
  const designIds = [...new Set(products.map((p) => p.references?.designId).filter(Boolean))];
  const designs = designIds.length
    ? await dbi.collection('designs').find({ designID: { $in: designIds } }).toArray()
    : [];
  const designById = new Map(designs.map((d) => [d.designID, d]));

  const stamp = { pricedAt: new Date(), priceDay, priceSource: 'auto-daily' };
  const report = { ok: true, priceDay, scanned: products.length, updated: 0, unchanged: 0, skipped: [], changes: [] };
  const skip = (product, reason) => report.skipped.push({ productId: product.productId, title: product.title || null, reason });

  for (const product of products) {
    const design = product.references?.designId ? designById.get(product.references.designId) : null;
    const markup = n(design?.pricing?.markup) > 0 ? n(design.pricing.markup) : defaultMarkup;
    const current = n(product.pricing?.retailPrice);

    // ── Already made: price is a formula on the piece's REAL COGS, which stays frozen.
    if (product.pricing?.costBasisSource === 'actual') {
      const cogs = n(product.pricing?.costBasis);
      if (!(cogs > 0)) { skip(product, 'piece-backed but has no recorded COGS'); continue; }
      const retail = round(cogs * markup);
      if (!(retail > 0)) { skip(product, 'COGS formula produced a zero price'); continue; }
      if (retail === current) { report.unchanged += 1; continue; }
      if (!dryRun) {
        await dbi.collection('products').updateOne(
          { productId: product.productId },
          { $set: { 'pricing.retailPrice': retail, 'pricing.pricedAt': stamp.pricedAt, 'pricing.priceDay': priceDay, 'pricing.priceSource': stamp.priceSource, updatedAt: new Date() } },
        );
      }
      report.updated += 1;
      report.changes.push({ productId: product.productId, title: product.title || null, kind: 'actual-cogs', from: current, to: retail, cogs, markup });
      continue;
    }

    if (!design) { skip(product, 'no design and no recorded COGS to price from'); continue; }

    // ── Gemstone design: the customer picks the carat, so the listing carries a live
    //    "from" floor computed off the cutter's current rough rates — WITH shared costs,
    //    the same recipe the editor and the price-at-carat endpoint use.
    if (design.category === 'gemstone') {
      const gemShared = sharedCostsFor(design.pricing || {}, {
        artisanFee: artisanFees[design.primaryArtisanId] ?? 0,
        editionType: design.edition?.type ?? design.editionType ?? null,
        editionLimit: design.edition?.limit ?? design.editionLimit ?? null,
      });
      const from = gemstoneFromPrice(design, { defaultMarkup, sharedCosts: gemShared });
      if (!(n(from) > 0)) { skip(product, 'gemstone design has no priceable variant/tier'); continue; }
      const retail = round(from);
      if (retail === current) { report.unchanged += 1; continue; }
      if (!dryRun) {
        await dbi.collection('products').updateOne(
          { productId: product.productId },
          { $set: { 'pricing.retailPrice': retail, 'pricing.priceIsFrom': true, 'pricing.pricedAt': stamp.pricedAt, 'pricing.priceDay': priceDay, 'pricing.priceSource': stamp.priceSource, updatedAt: new Date() } },
        );
      }
      report.updated += 1;
      report.changes.push({ productId: product.productId, title: product.title || null, kind: 'gemstone-from', from: current, to: retail });
      continue;
    }

    // ── Customizable listing with no variants: the configurator prices the shopper's real
    //    selection live, so this only keeps the headline "from" number on the grid/PDP
    //    current — otherwise it advertises last quarter's metal.
    if (!(design.variants || []).some((v) => v.active !== false)) {
      const base = priceDesignBase({ design, rates, gemPrices: settings?.pricing?.gemPrices || {} });
      if (!base.ok) { skip(product, base.reason); continue; }
      const retail = round(base.cost * markup);
      if (!(retail > 0)) { skip(product, 'computed a zero price'); continue; }
      if (retail === current && n(product.pricing?.costBasis) === base.cost) { report.unchanged += 1; continue; }
      if (!dryRun) {
        await dbi.collection('products').updateOne(
          { productId: product.productId },
          {
            $set: {
              'pricing.retailPrice': retail,
              'pricing.costBasis': base.cost,
              'pricing.costBasisSource': 'estimated',
              'pricing.pricedAt': stamp.pricedAt,
              'pricing.priceDay': priceDay,
              'pricing.priceSource': stamp.priceSource,
              updatedAt: new Date(),
            },
          },
        );
      }
      report.updated += 1;
      report.changes.push({ productId: product.productId, title: product.title || null, kind: 'design-base', from: current, to: retail, cog: base.cost, markup });
      continue;
    }

    // ── Not yet made: today's metal IS the cost. Recompute cost and price together.
    const priced = priceDesignVariants({
      design, rates, stoneCosts, taskCosts,
      artisanFee: artisanFees[design.primaryArtisanId] || 0,
      defaultMarkup,
    });
    if (!priced.ok) { skip(product, priced.reason); continue; }

    const good = priced.variants.filter((v) => v.ok);
    if (!good.length) {
      skip(product, priced.variants[0]?.reason || 'no variant could be priced');
      continue;
    }

    // Write each variant's own price. The storefront's MTO resolver charges the FLAT
    // `variant.price`; the admin UI and product projection read `variant.pricing.retailPrice`.
    // Both are written so the two agree — they have been separate shapes until now.
    for (const v of good) {
      const before = (design.variants || []).find((x) => x.variantId === v.variantId);
      if (n(before?.price) === v.retail && n(before?.pricing?.retailPrice) === v.retail) continue;
      if (!dryRun) {
        await dbi.collection('designs').updateOne(
          { designID: design.designID },
          {
            $set: {
              'variants.$[v].price': v.retail,
              'variants.$[v].pricing.retailPrice': v.retail,
              'variants.$[v].pricing.costBasis': v.cog,
              'variants.$[v].pricing.pricedAt': stamp.pricedAt,
              updatedAt: new Date(),
            },
          },
          { arrayFilters: [{ 'v.variantId': v.variantId }] },
        );
      }
      report.changes.push({
        productId: product.productId, designID: design.designID, variantId: v.variantId,
        kind: 'design-variant', from: n(before?.price), to: v.retail, cog: v.cog, markup: v.markup,
      });
    }

    // The product headline price follows its default variant (what the grid/PDP shows).
    const primary = good.find((v) => v.variantId === product.defaultVariantId) || good[0];
    const changedHeadline = round(primary.retail) !== current || n(product.pricing?.costBasis) !== primary.cog;
    if (changedHeadline) {
      if (!dryRun) {
        await dbi.collection('products').updateOne(
          { productId: product.productId },
          {
            $set: {
              'pricing.retailPrice': primary.retail,
              'pricing.costBasis': primary.cog,
              'pricing.costBasisSource': 'estimated',
              'pricing.pricedAt': stamp.pricedAt,
              'pricing.priceDay': priceDay,
              'pricing.priceSource': stamp.priceSource,
              updatedAt: new Date(),
            },
          },
        );
      }
      report.updated += 1;
    } else {
      report.unchanged += 1;
    }
  }

  return report;
}
