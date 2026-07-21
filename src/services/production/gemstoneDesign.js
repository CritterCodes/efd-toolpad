import { randomUUID } from 'crypto';
import { estimateGemstoneCost } from '@/services/production/designCost';
import { suggestedRetailFromCOGS } from '@/services/products/productContract';

const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const num = (v) => (v == null || v === '' ? null : Number(v));

/** "7.2 x 6.9 x 4.1 mm" from a {length,width,height} (whatever's present). */
export function formatDimsMm(d = {}) {
  const parts = [d.length, d.width, d.height].map((x) => (x == null || x === '' ? null : Number(x))).filter((x) => x != null);
  return parts.length ? `${parts.join(' x ')} mm` : null;
}

/**
 * Build a DesignsModel.create-ready gemstone Design from a gem-shaped authoring payload.
 * PURE (no DB). Prices with the owner's recipe (carat × rate + cut labor); retail defaults to a
 * markup on cost unless given. Its single variant is the rough/cut lot (roughQty from edition).
 *
 * @param {object} input authoring form values
 * @returns {object} spec for DesignsModel.create
 */
export function buildGemstoneDesignSpec(input = {}) {
  const species = (input.species || '').trim();
  if (!species) throw new Error('species is required');

  const carat = num(input.carat);
  const editionType = ['one_of_one', 'limited', 'unlimited'].includes(input.editionType) ? input.editionType : 'one_of_one';
  const limit = editionType === 'limited' ? Math.max(1, parseInt(input.editionLimit, 10) || 1) : undefined;
  const roughQty = editionType === 'one_of_one' ? 1 : editionType === 'limited' ? limit : null; // null = unlimited

  const cost = estimateGemstoneCost({
    carat,
    ratePerCarat: num(input.ratePerCarat),
    cutLaborHours: num(input.cutLaborHours),
    laborRate: num(input.laborRate),
    extraCost: num(input.extraCost),
  });
  const retailPrice = num(input.retailPrice) ?? suggestedRetailFromCOGS(cost.estCost);

  const gemstone = {
    species,
    subspecies: input.subspecies || '',
    carat,
    dimensions: input.dimensions || null,
    cut: asArray(input.cut),
    cutStyle: asArray(input.cutStyle),
    treatment: asArray(input.treatment),
    color: asArray(input.color),
    clarity: input.clarity || '',
    locale: input.locale || '',
    naturalSynthetic: input.naturalSynthetic === 'lab' ? 'lab' : 'natural',
    certification: input.certification || null,
  };

  const variant = {
    variantId: input.variantId || randomUUID(),
    sku: input.sku || `GEM-${randomUUID().slice(0, 8)}`,
    active: input.active !== false,
    quality: input.clarity || null,
    caratEach: carat,
    sizeMm: formatDimsMm(input.dimensions || {}),
    roughQty,
    pricing: { retailPrice },
    leadTimeDays: num(input.leadTimeDays),
  };

  const edition = {
    type: editionType,
    ...(limit ? { limit } : {}),
    allocated: 0,
    committed: 0,
    nextNumber: 1,
  };

  return {
    name: (input.name || species).trim(),
    description: input.description ?? null,
    category: 'gemstone',
    productionMethod: 'handmade',
    status: input.status || 'draft',
    edition,
    variants: [variant],
    gemstone,
    estCost: cost.estCost,
    suggestedRetail: retailPrice,
    primaryArtisanId: input.primaryArtisanId || null,
    referenceImages: asArray(input.images),
    metadata: { gemPricing: { ratePerCarat: num(input.ratePerCarat), cutLaborHours: num(input.cutLaborHours), laborRate: num(input.laborRate), extraCost: num(input.extraCost) } },
    // computed cost breakdown echoed for the caller/UI (not persisted by create; informational).
    _cost: cost,
  };
}
