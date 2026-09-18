/**
 * Custom LABOR lines on a repair (owner ruling 2026-09-18).
 *
 * A repair has two kinds of ad-hoc lines and they are deliberately different objects:
 *
 *   - `customLineItems[]`  → NON-labor charges (a part we sourced, a fee, a misc charge).
 *                            Description × qty × price. Carries NO labor hours and never
 *                            enters labor credit.
 *   - custom labor         → a TASK. It lives in `tasks[]` with `isCustomLabor: true`, so it
 *                            gets everything a catalog task gets for free: hours × wage
 *                            pricing through the same engine, per-task sign-off stamps,
 *                            hand-off between jewelers, and per-jeweler labor credit at QC.
 *
 * The price is GROUNDED in the hours: default retail = hours × shop wage × business
 * multiplier, wholesale = hours × wage × wholesale markup — identical to a catalog task
 * whose only process is "Custom Labor". The jeweler may still override the unit price
 * (a bulk discount, say); that override is kept on the line as `priceOverridden` so a
 * re-price (wholesale toggle, metal change) doesn't silently undo it.
 */
import { calculateTaskCost } from '@/services/pricing/task.pricing.js';

export const CUSTOM_LABOR_CATEGORY = 'custom_labor';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function isCustomLaborTask(task) {
  return !!(task && task.isCustomLabor === true);
}

/** Per-unit labor hours of a custom labor task (never negative). */
export function customLaborHours(task = {}) {
  const h = Number(task.laborHours);
  return Number.isFinite(h) && h > 0 ? h : 0;
}

/**
 * Run the shop's task pricing engine over a custom labor line. Returns the engine's
 * pricing block (retailPrice / wholesalePrice / laborCost / totalLaborHours …) for ONE unit.
 */
export function priceCustomLabor({ laborHours = 0, adminSettings = {} } = {}) {
  const hours = Number(laborHours) > 0 ? Number(laborHours) : 0;
  const pricing = calculateTaskCost(
    { processes: [{ isCustom: true, name: 'Custom Labor', laborHours: hours, quantity: 1 }], materials: [] },
    adminSettings,
    [],
    [],
    null,
  );
  return { ...pricing, liveCalculated: true };
}

/** The engine-calculated unit price for the pricing context (wholesale or retail). */
export function calculatedCustomLaborPrice(task = {}, { isWholesale = false } = {}) {
  const pricing = task.pricing || {};
  const price = isWholesale ? pricing.wholesalePrice : pricing.retailPrice;
  return round2(price);
}

/**
 * Build a brand-new custom labor task for a repair. Shape mirrors a catalog task closely
 * enough that every task consumer (pricing summary, bench card, sign-off, prints,
 * invoices, labor credit) treats it as a task without special-casing.
 */
export function buildCustomLaborTask({
  id = Date.now(),
  description = '',
  laborHours = 0,
  quantity = 1,
  adminSettings = {},
  isWholesale = false,
} = {}) {
  const hours = Number(laborHours) > 0 ? round2(laborHours) : 0;
  const qty = Math.max(parseInt(quantity, 10) || 1, 1);
  const pricing = priceCustomLabor({ laborHours: hours, adminSettings });
  const price = isWholesale ? pricing.wholesalePrice : pricing.retailPrice;
  return {
    id,
    isCustomLabor: true,
    category: CUSTOM_LABOR_CATEGORY,
    title: description || 'Custom labor',
    description,
    laborHours: hours,
    quantity: qty,
    processes: [{ isCustom: true, name: 'Custom Labor', displayName: 'Custom Labor', laborHours: hours, quantity: 1 }],
    materials: [],
    pricing,
    retailPrice: pricing.retailPrice,
    price: round2(price),
    priceOverridden: false,
  };
}

/**
 * Apply an edit to a custom labor task and keep it consistent:
 *   - description → title follows it
 *   - laborHours  → re-price from the engine and DROP any manual override (hours changed,
 *                    so the old discount no longer means anything)
 *   - quantity    → clamp ≥ 1
 *   - price       → manual override; remembered so re-pricing keeps it
 */
export function updateCustomLaborTask(task, patch = {}, { adminSettings = {}, isWholesale = false } = {}) {
  if (!isCustomLaborTask(task)) return task;
  let next = { ...task };

  if (patch.description !== undefined) {
    next.description = patch.description;
    next.title = patch.description || 'Custom labor';
  }
  if (patch.quantity !== undefined) {
    next.quantity = Math.max(parseInt(patch.quantity, 10) || 1, 1);
  }
  if (patch.laborHours !== undefined) {
    const hours = Number(patch.laborHours) > 0 ? round2(patch.laborHours) : 0;
    next.laborHours = hours;
    next.processes = [{ isCustom: true, name: 'Custom Labor', displayName: 'Custom Labor', laborHours: hours, quantity: 1 }];
    next.priceOverridden = false;
    next = repriceCustomLaborTask(next, { adminSettings, isWholesale });
  }
  if (patch.price !== undefined) {
    const price = round2(patch.price);
    const calculated = calculatedCustomLaborPrice(next, { isWholesale });
    next.price = price;
    next.priceOverridden = price !== calculated;
  }
  return next;
}

/**
 * Re-run pricing for the current context (used when wholesale flips or metal changes).
 * A manual price override survives; a non-overridden line follows the engine.
 */
export function repriceCustomLaborTask(task, { adminSettings = {}, isWholesale = false } = {}) {
  if (!isCustomLaborTask(task)) return task;
  const pricing = priceCustomLabor({ laborHours: customLaborHours(task), adminSettings });
  const calculated = isWholesale ? pricing.wholesalePrice : pricing.retailPrice;
  return {
    ...task,
    pricing,
    retailPrice: pricing.retailPrice,
    price: task.priceOverridden ? round2(task.price) : round2(calculated),
  };
}
