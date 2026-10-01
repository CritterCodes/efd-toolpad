/**
 * The server's side of the pricing engine: load what a price is calculated from, and describe a task's
 * price for a response. Every task that leaves the API is priced here, by services/pricing/engine.js.
 *
 * NOTHING IS READ FROM A STORED PRICE, AND NOTHING WRITES ONE (owner, 2026-09-30: "There should never be
 * old saved prices … It should always be calculated. If it can't be calculated, it doesn't show"). Task
 * documents used to carry `pricing`, `universalPricing`, `basePrice` and friends — snapshots written by
 * an "Update Prices" button, a settings save, and every task edit (the editor sent the loaded prices back
 * and the store path kept them). Reads fell back to those snapshots whenever the live number failed, so a
 * broken price showed a stale one instead of an error. Now:
 *   - COMPUTED_PRICE_FIELDS are stripped from every task before it is stored AND before it is returned
 *   - a task's price is computed from the catalog on every read
 *   - one that can't be computed carries `pricingStatus` and a message, and no price
 */
import { resolvePricingSettings } from './engine';
import { stockedMetals } from './taskPricing';

export { COMPUTED_PRICE_FIELDS, stripComputedPrices } from './computedFields';

export { stockedMetals, metalsForTask, pricedTaskFields } from './taskPricing';

/**
 * Load everything a price is calculated from. THROWS if the pricing settings are missing or invalid —
 * there is no "price it anyway" path (PricingError 'SETTINGS_INCOMPLETE').
 */
export async function loadPricingContext() {
  const { db } = await import('@/lib/database');
  const dbi = await db.connect();
  const [adminSettings, materials, tools] = await Promise.all([
    dbi.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' }),
    dbi.collection('materials').find({ isActive: { $ne: false } }).toArray(),
    dbi.collection('tools').find({}).toArray(),
  ]);
  const settings = resolvePricingSettings(adminSettings);
  return { adminSettings, settings, materials, tools, metals: stockedMetals(materials) };
}
