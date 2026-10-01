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
import { priceCustomLabor as engineCustomLabor } from '@/services/pricing/engine';

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
 * THE engine's price for ONE unit of custom labor (services/pricing/engine.js). `settings` must come
 * from resolvePricingSettings — there is no default wage. Returns the pricing block a line carries, or
 * null when there are no hours (nothing to price).
 */
export function priceCustomLabor({ laborHours = 0, settings } = {}) {
  const r = engineCustomLabor({ laborHours, settings });
  if (!r.ok) return null;
  return {
    laborCost: r.laborCost,
    totalLaborHours: r.laborHours,
    baseCost: r.baseCost,
    retailPrice: r.retail.listUnit,
    wholesalePrice: r.wholesale.listUnit,
  };
}

/** The engine-calculated unit price for the pricing context (wholesale or retail); null if unpriced. */
export function calculatedCustomLaborPrice(task = {}, { isWholesale = false } = {}) {
  const pricing = task.pricing || {};
  const price = isWholesale ? pricing.wholesalePrice : pricing.retailPrice;
  return price == null ? null : round2(price);
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
  settings,
  isWholesale = false,
} = {}) {
  const hours = Number(laborHours) > 0 ? round2(laborHours) : 0;
  const qty = Math.max(parseInt(quantity, 10) || 1, 1);
  const pricing = priceCustomLabor({ laborHours: hours, settings });
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
    retailPrice: pricing ? pricing.retailPrice : null,
    price: pricing ? (isWholesale ? pricing.wholesalePrice : pricing.retailPrice) : null,
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
export function updateCustomLaborTask(task, patch = {}, { settings, isWholesale = false } = {}) {
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
    next = repriceCustomLaborTask(next, { settings, isWholesale });
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
export function repriceCustomLaborTask(task, { settings, isWholesale = false } = {}) {
  if (!isCustomLaborTask(task)) return task;
  const pricing = priceCustomLabor({ laborHours: customLaborHours(task), settings });
  const calculated = pricing ? (isWholesale ? pricing.wholesalePrice : pricing.retailPrice) : null;
  return {
    ...task,
    pricing,
    retailPrice: pricing ? pricing.retailPrice : null,
    price: task.priceOverridden ? round2(task.price) : calculated,
  };
}
