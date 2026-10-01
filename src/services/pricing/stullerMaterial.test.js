import { describe, expect, it } from 'vitest';
import {
  stullerMaterialPrices,
  buildStullerRepairMaterial,
  repriceStullerMaterialForRepair,
  repairIsWholesale,
} from './stullerMaterial';
import { resolvePricingSettings } from './engine';

// Prod's live pricing block on 2026-09-21: fees sum to a 2.0× business multiplier, wholesale 1.2×,
// and a deprecated materialMarkup of 2 that must NOT be applied.
const PROD_SETTINGS = resolvePricingSettings({
  pricing: {
    wage: 50, materialMarkup: 2, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25,
    wholesaleMarkup: 1.2, wholesaleConfig: { minimumMultiplier: 1.2 },
    rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095, minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
  },
});

describe('Stuller part pricing on a repair', () => {
  it('retail = cost × business multiplier, wholesale = cost × wholesale markup (no material markup)', () => {
    const p = stullerMaterialPrices({ basePrice: 40, settings: PROD_SETTINGS });
    expect(p).toMatchObject({ retail: 80, wholesale: 48, price: 80, businessMultiplier: 2, wholesaleMarkup: 1.2 });
    expect(stullerMaterialPrices({ basePrice: 40, isWholesale: true, settings: PROD_SETTINGS }).price).toBe(48);
  });

  it('refuses raw settings — there is no default markup', () => {
    expect(() => stullerMaterialPrices({ basePrice: 10, settings: { pricing: { wholesaleMarkup: 1.2 } } })).toThrow(/resolvePricingSettings/);
  });

  it('builds the material line priced for the ticket it is going on', () => {
    const item = { data: { price: 25, description: 'Prong, 14K yellow', longDescription: 'Replacement prong', weight: 0.1 } };
    const retail = buildStullerRepairMaterial({ item, sku: 'ABC-1', settings: PROD_SETTINGS, id: 7 });
    const trade = buildStullerRepairMaterial({ item, sku: 'ABC-1', isWholesale: true, settings: PROD_SETTINGS, id: 8 });
    expect(retail).toMatchObject({ id: 7, price: 50, retailPrice: 50, stullerPrice: 25, unitCost: 25, isStullerItem: true, quantity: 1, stuller_item_number: 'ABC-1' });
    expect(retail.stullerData.pricedAs).toBe('retail');
    expect(trade).toMatchObject({ price: 30, retailPrice: 50 });
    expect(trade.stullerData).toMatchObject({ pricedAs: 'wholesale', wholesaleMarkup: 1.2 });
    expect(trade.description).toBe('Replacement prong (Stuller: ABC-1)');
  });

  it('server re-price follows the repair billing mode, ignoring the browser price', () => {
    const fromBrowser = { isStullerItem: true, stullerPrice: 40, price: 80, retailPrice: 80, name: 'Head', quantity: 1 };
    const trade = repriceStullerMaterialForRepair(fromBrowser, { repair: { billing: { mode: 'wholesale' } }, settings: PROD_SETTINGS });
    expect(trade).toMatchObject({ price: 48, retailPrice: 80 });
    const legacyFlag = repriceStullerMaterialForRepair(fromBrowser, { repair: { isWholesale: true }, settings: PROD_SETTINGS });
    expect(legacyFlag.price).toBe(48);
    const retail = repriceStullerMaterialForRepair(fromBrowser, { repair: { billing: { mode: 'retail' } }, settings: PROD_SETTINGS });
    expect(retail.price).toBe(80);
  });

  it('leaves manual parts alone, and REFUSES a Stuller part with no cost (it kept the browser price)', () => {
    const manual = { isStullerItem: false, price: 12, name: 'Spring bar' };
    expect(repriceStullerMaterialForRepair(manual, { repair: { isWholesale: true }, settings: PROD_SETTINGS })).toBe(manual);
    const noCost = { isStullerItem: true, price: 12, name: 'Mystery' };
    expect(() => repriceStullerMaterialForRepair(noCost, { repair: { isWholesale: true }, settings: PROD_SETTINGS })).toThrow(/no cost/);
  });

  it('repairIsWholesale reads billing.mode first, then the legacy flag', () => {
    expect(repairIsWholesale({ billing: { mode: 'wholesale' } })).toBe(true);
    expect(repairIsWholesale({ isWholesale: true })).toBe(true);
    expect(repairIsWholesale({ billing: { mode: 'retail' } })).toBe(false);
    expect(repairIsWholesale({})).toBe(false);
  });
});
