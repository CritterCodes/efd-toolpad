import { describe, expect, it } from 'vitest';
import {
  buildCustomLaborTask,
  updateCustomLaborTask,
  repriceCustomLaborTask,
  isCustomLaborTask,
  calculatedCustomLaborPrice,
} from './customLabor';

// Shop settings as they sit in prod (2026-09-18): $50 wage, fees sum to a 2× business
// multiplier, 1.2× wholesale markup. 0.2h → $10 labor → $20 retail / $12 wholesale, which
// is exactly what a catalog "Set Stone < 0.49ct" task prices to.
const adminSettings = {
  pricing: { wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25, wholesaleMarkup: 1.2, materialMarkup: 2 },
};

describe('custom labor lines (tasks grounded in hours)', () => {
  it('prices a new line from hours through the task engine, retail and wholesale', () => {
    const retail = buildCustomLaborTask({ id: 1, description: 'Laser weld', laborHours: 0.2, quantity: 20, adminSettings });
    expect(isCustomLaborTask(retail)).toBe(true);
    expect(retail.title).toBe('Laser weld');
    expect(retail.quantity).toBe(20);
    expect(retail.laborHours).toBe(0.2);
    expect(retail.pricing.laborCost).toBe(10);
    expect(retail.pricing.totalLaborHours).toBe(0.2);
    expect(retail.retailPrice).toBe(20);
    expect(retail.price).toBe(20);
    expect(retail.priceOverridden).toBe(false);

    const wholesale = buildCustomLaborTask({ id: 2, description: 'Laser weld', laborHours: 0.2, adminSettings, isWholesale: true });
    expect(wholesale.price).toBe(12);
    expect(wholesale.retailPrice).toBe(20);
  });

  it('carries a "Custom Labor" process so generic task consumers see the hours', () => {
    const t = buildCustomLaborTask({ laborHours: 0.5, adminSettings });
    expect(t.processes).toEqual([{ isCustom: true, name: 'Custom Labor', displayName: 'Custom Labor', laborHours: 0.5, quantity: 1 }]);
    expect(t.materials).toEqual([]);
  });

  it('a manual price is kept as an override and survives a re-price', () => {
    let t = buildCustomLaborTask({ laborHours: 0.2, adminSettings, isWholesale: true });
    t = updateCustomLaborTask(t, { price: 15 }, { adminSettings, isWholesale: true }); // bulk discount off $12? no — discount off retail; still an override
    expect(t.price).toBe(15);
    expect(t.priceOverridden).toBe(true);

    const repriced = repriceCustomLaborTask(t, { adminSettings, isWholesale: false });
    expect(repriced.price).toBe(15); // override wins
    expect(repriced.retailPrice).toBe(20); // but the engine numbers stay current
  });

  it('typing the calculated price back clears the override', () => {
    let t = buildCustomLaborTask({ laborHours: 0.2, adminSettings });
    t = updateCustomLaborTask(t, { price: 18 }, { adminSettings });
    expect(t.priceOverridden).toBe(true);
    t = updateCustomLaborTask(t, { price: 20 }, { adminSettings });
    expect(t.priceOverridden).toBe(false);
  });

  it('changing the hours re-prices and drops a stale override', () => {
    let t = buildCustomLaborTask({ laborHours: 0.2, adminSettings });
    t = updateCustomLaborTask(t, { price: 15 }, { adminSettings });
    t = updateCustomLaborTask(t, { laborHours: 0.4 }, { adminSettings });
    expect(t.laborHours).toBe(0.4);
    expect(t.processes[0].laborHours).toBe(0.4);
    expect(t.price).toBe(40);
    expect(t.priceOverridden).toBe(false);
    expect(calculatedCustomLaborPrice(t)).toBe(40);
  });

  it('description edits follow through to the title; quantity clamps to ≥ 1', () => {
    let t = buildCustomLaborTask({ description: 'x', laborHours: 0.1, adminSettings });
    t = updateCustomLaborTask(t, { description: 'Re-tip prong' });
    expect(t.title).toBe('Re-tip prong');
    t = updateCustomLaborTask(t, { quantity: 0 });
    expect(t.quantity).toBe(1);
  });

  it('a non-overridden line follows the engine when the context flips to wholesale', () => {
    const t = buildCustomLaborTask({ laborHours: 0.2, adminSettings });
    expect(repriceCustomLaborTask(t, { adminSettings, isWholesale: true }).price).toBe(12);
  });

  it('leaves catalog tasks alone', () => {
    const catalog = { title: 'Size ring', price: 45 };
    expect(updateCustomLaborTask(catalog, { price: 1 })).toBe(catalog);
    expect(repriceCustomLaborTask(catalog)).toBe(catalog);
  });
});
