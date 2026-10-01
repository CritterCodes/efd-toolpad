import { finishUsesKarat, composeMetalKey } from '@/services/production/variantMetal';
import { sumStones, stoneUnit } from '@/services/production/variantPricing';
import { speciesSG } from '@/constants/gemSpecies';
import { csvArr } from './designShared';

/**
 * The design editor's save, as pure functions (moved verbatim out of DesignDetail.save for the max-lines
 * burn-down): what's wrong with the form, if anything, and the PUT /api/production/designs/[designId] body.
 */

/** Pure: the first reason the form can't be saved, or null. */
export function designFormProblem(f) {
  if (!f.name.trim()) return 'Name is required.';
  if (!f.primaryArtisanId) return 'A primary artisan is required.';
  for (const v of f.variants) {
    if (!v.sku.trim()) return 'Every variant needs a SKU.';
    if (f.category === 'ring' && !v.ringSize.trim()) return 'Ring variants need a nominal ring size.';
  }
  const skus = f.variants.map((v) => v.sku.trim());
  if (new Set(skus).size !== skus.length) return 'Variant SKUs must be unique.';
  return null;
}

/** Pure: the save body for `form`. `design` is the stored design (rate-change stamping); `stoneCosts` the catalog. */
export function buildDesignSaveBody(form, { design, stoneCosts }) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    category: form.category || null,
    productionMethod: form.productionMethod,
    status: form.status,
    tags: form.tags,
    primaryArtisanId: form.primaryArtisanId || null,
    edition: { type: form.editionType, ...(form.editionType === 'limited' ? { limit: Number(form.editionLimit) || 1 } : {}) },
    // Gemstone designs: the cut (shape + technique) is a DESIGN detail.
    ...(form.category === 'gemstone' ? { gemstone: { cut: csvArr(form.gemCut), cutStyle: csvArr(form.gemCutStyle) } } : {}),
    pricing: {
      markup: form.pricing.markup ? Number(form.pricing.markup) : null,
      laborTasks: form.pricing.laborTasks.map((t) => ({ description: t.description || '', quantity: Number(t.quantity) || 1, hours: Number(t.hours) || 0, discipline: t.discipline || 'bench_jewelry', cost: Number(t.cost) || 0 })),
      shipping: form.pricing.shipping.map((s) => ({ description: s.description || '', cost: Number(s.cost) || 0 })),
      designFee: { mode: form.pricing.designFee?.mode || 'flat', amount: form.pricing.designFee?.amount ? Number(form.pricing.designFee.amount) : null },
    },
    variants: form.variants.map((v) => ({
      variantId: v.variantId,
      sku: v.sku.trim(),
      ...(v.label.trim() ? { label: v.label.trim() } : {}),
      active: !!v.active,
      finish: v.finish || 'gold',
      karat: finishUsesKarat(v.finish) ? (v.karat || '14') : null,
      metalKey: composeMetalKey(v.finish, v.karat),
      viewerConfig: v.viewerConfig || null,
      ...(form.category === 'ring'
        ? { ringSize: v.ringSize.trim() || null, ...((v.sizingMin || v.sizingMax) ? { sizingAllowance: { min: v.sizingMin, max: v.sizingMax } } : {}) }
        : {}),
      pricing: { retailPrice: v.retailPrice ? Number(v.retailPrice) : null },
      leadTimeDays: v.leadTimeDays ? Number(v.leadTimeDays) : null,
      gemstones: (v.gemstones || []).map((g) => ({
        slot: g.slot || null,
        role: g.role || 'accent',
        qty: Number(g.qty) || 1,
        stoneSkuId: g.stoneSkuId || null,
        stullerSku: g.stullerSku || null,
        label: g.label || '',
        // Store the resolved unit (SKU-linked → current catalog wholesale; else manual).
        unitCost: stoneUnit(g, stoneCosts),
        caratEach: g.caratEach ? Number(g.caratEach) : null,
        sizeMm: g.sizeMm || null,
        cut: g.cut || null,
        creation: g.creation || 'natural',
        gemDesignId: g.gemDesignId || null,
        gemVariantId: g.gemVariantId || null,
        gemColor: g.gemColor || null,
        preset: g.preset || g.gemType || null,
        lengthMm: g.lengthMm ? Number(g.lengthMm) : null,
        widthMm: g.widthMm ? Number(g.widthMm) : null,
        source: g.source || null,
      })),
      // Snapshot the stone total (Σ unit × qty) so external readers don't recompute.
      stonesCost: sumStones(v.gemstones, stoneCosts),
      markupOverride: v.markupOverride ? Number(v.markupOverride) : null,
      // Gemstone-design variants: a species offering (capability) — toggle, carat range,
      // tiered color ROUGH rates (+ yield). lotQty = special-rough fixed quantity; maxPieces =
      // optional per-variant slice of the design edition ("10 total, 2 of this species").
      ...(form.category === 'gemstone' ? (() => {
        const colors = (v.gem?.colors || [])
          .filter((c) => String(c.label || '').trim())
          .map((c) => ({
            label: c.label.trim(),
            rates: (c.rates || [])
              .filter((t) => Number(t.upToCt) > 0 && Number(t.ratePerCarat) > 0)
              .map((t) => ({ upToCt: Number(t.upToCt), ratePerCarat: Number(t.ratePerCarat) }))
              .sort((a, b) => a.upToCt - b.upToCt),
          }));
        // Stamp ratesUpdatedAt ONLY when the rates actually changed — the staleness nag must
        // not be reset by unrelated edits.
        const prev = (design.variants || []).find((x) => x.variantId === v.variantId)?.gemstone;
        const ratesChanged = JSON.stringify(colors) !== JSON.stringify(prev?.colors || []);
        return {
          gemstone: {
            species: v.gem?.species?.trim() || null,
            availability: v.gem?.availability === 'special_request' ? 'special_request' : 'purchase',
            caratMin: v.gem?.caratMin ? Number(v.gem.caratMin) : null,
            caratMax: v.gem?.caratMax ? Number(v.gem.caratMax) : null,
            naturalSynthetic: v.gem?.creation === 'lab' ? 'lab' : 'natural',
            clarity: v.gem?.clarity?.trim() || null,
            treatment: v.gem?.treatment?.trim() || null,
            cutLaborCost: v.gem?.cutLaborCost ? Number(v.gem.cutLaborCost) : null,
            lotQty: v.gem?.lotQty ? Number(v.gem.lotQty) : null,
            maxPieces: v.gem?.maxPieces ? Number(v.gem.maxPieces) : null,
            yield: v.gem?.yield ? Number(v.gem.yield) : null, // null → default 0.25 at price time
            // sg drives carat ⇄ mm (baseCarat = stlVolumeCm3 × sg × 5). The override is
            // kept separately so the form can tell "custom material" from the table value.
            sgOverride: v.gem?.sg ? Number(v.gem.sg) : null,
            sg: v.gem?.sg ? Number(v.gem.sg) : (speciesSG(v.gem?.species) ?? null),
            colors,
            ratesUpdatedAt: ratesChanged ? new Date().toISOString() : (prev?.ratesUpdatedAt ?? null),
          },
        };
      })() : {}),
    })),
  };
}
