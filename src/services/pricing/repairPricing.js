/**
 * The SERVER prices every repair it saves — the browser's numbers are a preview, never stored
 * (EFD-DEFECTS P12/S5; owner, 2026-09-30: "Prices should always be calculated the same").
 *
 * Same function as intake (repairLines.priceRepairLines), from the same context (loadPricingContext),
 * against the catalog tasks as they are now. Line prices and the totals (subtotal, rush, delivery,
 * tax, total) are overwritten with the engine's. A line that can't be priced refuses the save
 * (PricingError UNPRICED) — unless the store asked EFD to quote it, which carries no tasks.
 */
import { loadPricingContext } from './catalog';
import { PricingError, metalKey } from './engine';
import { priceRepairLines, repairMetal, honorTicketLines, releaseTicketPrice, asTicketLines } from './repairLines';
import { normalizeWholesalerPricingSettings } from '@/app/api/wholesale/account-settings/wholesaleAccountSettings.helpers';

/** Fields whose change means the repair must be re-priced. */
export const PRICING_INPUT_FIELDS = Object.freeze([
  'tasks', 'materials', 'customLineItems', 'isRush', 'includeDelivery', 'includeTax',
  'metalType', 'karat', 'goldColor', 'compRepair', 'includedWithSale', 'isWholesale', 'storeId',
]);

async function storeMarkupFor(dbi, repair) {
  const storeId = String(repair?.storeId || '');
  if (!repair?.isWholesale || !storeId || storeId === 'engel-fine-design') return null;
  const store = await dbi.collection('users').findOne({ userID: storeId }, { projection: { wholesalerPricingSettings: 1 } });
  const stored = store?.wholesalerPricingSettings;
  if (!stored) return null;
  return normalizeWholesalerPricingSettings(stored, stored.retailMarkups || {}).retailMarkupMultiplier;
}

/**
 * @param {object} repair     the repair as it will be saved (for an edit: the saved one merged with the edit)
 * @param {object} [opts.saved]  the saved repair, when editing — its unchanged lines keep their price
 * @param {boolean} [opts.quoteRequested]  a store's quote request (no tasks): nothing to refuse
 * @returns the fields to write: tasks, materials, customLineItems and the totals
 */
export async function priceRepairForSave(repair, { saved = null, quoteRequested = false } = {}) {
  const ctx = await loadPricingContext(); // throws PricingError SETTINGS_INCOMPLETE
  const { db } = await import('@/lib/database');
  const dbi = await db.connect();
  const [catalogTasks, storeMarkup] = await Promise.all([
    dbi.collection('tasks').find({}).toArray(),
    storeMarkupFor(dbi, repair),
  ]);

  const metal = repairMetal(repair);
  const sameContext = Boolean(saved)
    && metalKey(repairMetal(saved)) === metalKey(metal)
    && Boolean(saved.isWholesale) === Boolean(repair.isWholesale);

  const result = priceRepairLines({
    ...repair,
    ...metal,
    tasks: honorTicketLines(repair.tasks, saved?.tasks, { sameContext }),
    materials: honorTicketLines(repair.materials, saved?.materials, { sameContext }),
  }, { ...ctx, tasks: catalogTasks, storeMarkup });

  if (result.unpriced.length > 0 && !quoteRequested) {
    const first = result.unpriced[0];
    throw new PricingError('UNPRICED', `${first.title}: ${first.message}`, { unpriced: result.unpriced });
  }

  const { subtotal, rushFee, deliveryFee, taxRate, taxAmount, total } = result.totals;
  return {
    tasks: result.tasks.map(releaseTicketPrice),
    materials: result.materials.map(releaseTicketPrice),
    customLineItems: result.customLineItems,
    subtotal, rushFee, deliveryFee, taxRate, taxAmount,
    totalCost: total,
  };
}

/**
 * A part added to a saved ticket (My Bench "needs parts", mark-waiting-parts): every line already on the
 * ticket keeps its written price, the new part is priced by the engine, and the totals are the engine's
 * — the parts routes used to re-add the lines by hand and carry the old rush fee unchanged.
 */
export async function priceRepairWithAddedMaterial(repair, material) {
  return priceRepairForSave({
    ...repair,
    tasks: asTicketLines(repair.tasks || []),
    materials: [...asTicketLines(repair.materials || []), material],
  }, { saved: repair });
}

/** A route's answer for a PricingError: 503 when settings are missing, 400 when a line can't be priced. */
export function pricingErrorResponseInit(error) {
  return error?.code === 'SETTINGS_INCOMPLETE' ? 503 : 400;
}
