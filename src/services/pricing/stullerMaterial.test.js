import { describe, expect, it } from 'vitest';
import {
  stullerMaterialPrices,
  buildStullerRepairMaterial,
  repriceStullerMaterialForRepair,
  repairIsWholesale,
} from './stullerMaterial';

// Prod's live pricing block on 2026-09-21: fees sum to a 2.0× business multiplier, wholesale 1.2×,
// and a deprecated materialMarkup of 2 that must NOT be applied.
const PROD_SETTINGS = {
  pricing: {
    wage: 50, materialMarkup: 2, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25,
    wholesaleMarkup: 1.2, wholesaleConfig: { minimumMultiplier: 1.2 },
  },
};

describe('Stuller part pricing on a repair', () => {
  it('retail = cost × business multiplier, wholesale = cost × wholesale markup (no material markup)', () => {
    const p = stullerMaterialPrices({ basePrice: 40, adminSettings: PROD_SETTINGS });
    expect(p).toMatchObject({ retail: 80, wholesale: 48, price: 80, businessMultiplier: 2, wholesaleMarkup: 1.2 });
    expect(stullerMaterialPrices({ basePrice: 40, isWholesale: true, adminSettings: PROD_SETTINGS }).price).toBe(48);
  });

  it('accepts a bare pricing block too (the intake hook passes { pricing } or the block itself)', () => {
    expect(stullerMaterialPrices({ basePrice: 10, isWholesale: true, adminSettings: PROD_SETTINGS.pricing }).price).toBe(12);
  });

  it('builds the material line priced for the ticket it is going on', () => {
    const item = { data: { price: 25, description: 'Prong, 14K yellow', longDescription: 'Replacement prong', weight: 0.1 } };
    const retail = buildStullerRepairMaterial({ item, sku: 'ABC-1', adminSettings: PROD_SETTINGS, id: 7 });
    const trade = buildStullerRepairMaterial({ item, sku: 'ABC-1', isWholesale: true, adminSettings: PROD_SETTINGS, id: 8 });
    expect(retail).toMatchObject({ id: 7, price: 50, retailPrice: 50, stullerPrice: 25, unitCost: 25, isStullerItem: true, quantity: 1, stuller_item_number: 'ABC-1' });
    expect(retail.stullerData.pricedAs).toBe('retail');
    expect(trade).toMatchObject({ price: 30, retailPrice: 50 });
    expect(trade.stullerData).toMatchObject({ pricedAs: 'wholesale', wholesaleMarkup: 1.2 });
    expect(trade.description).toBe('Replacement prong (Stuller: ABC-1)');
  });

  it('server re-price follows the repair billing mode, ignoring the browser price', () => {
    const fromBrowser = { isStullerItem: true, stullerPrice: 40, price: 80, retailPrice: 80, name: 'Head', quantity: 1 };
    const trade = repriceStullerMaterialForRepair(fromBrowser, { repair: { billing: { mode: 'wholesale' } }, adminSettings: PROD_SETTINGS });
    expect(trade).toMatchObject({ price: 48, retailPrice: 80 });
    const legacyFlag = repriceStullerMaterialForRepair(fromBrowser, { repair: { isWholesale: true }, adminSettings: PROD_SETTINGS });
    expect(legacyFlag.price).toBe(48);
    const retail = repriceStullerMaterialForRepair(fromBrowser, { repair: { billing: { mode: 'retail' } }, adminSettings: PROD_SETTINGS });
    expect(retail.price).toBe(80);
  });

  it('leaves manual parts and cost-less lines alone', () => {
    const manual = { isStullerItem: false, price: 12, name: 'Spring bar' };
    expect(repriceStullerMaterialForRepair(manual, { repair: { isWholesale: true }, adminSettings: PROD_SETTINGS })).toBe(manual);
    const noCost = { isStullerItem: true, price: 12, name: 'Mystery' };
    expect(repriceStullerMaterialForRepair(noCost, { repair: { isWholesale: true }, adminSettings: PROD_SETTINGS })).toBe(noCost);
  });

  it('repairIsWholesale reads billing.mode first, then the legacy flag', () => {
    expect(repairIsWholesale({ billing: { mode: 'wholesale' } })).toBe(true);
    expect(repairIsWholesale({ isWholesale: true })).toBe(true);
    expect(repairIsWholesale({ billing: { mode: 'retail' } })).toBe(false);
    expect(repairIsWholesale({})).toBe(false);
  });
});
