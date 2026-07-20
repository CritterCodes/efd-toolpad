import StullerItemService from '@/app/api/stuller/item/service';
import { StonesModel, stoneFromStullerItem } from './model';

/** Re-fetch one stone's wholesale cost from Stuller and update the cached cost. */
export async function refreshStonePrice(stone) {
  if (!stone?.stullerSku) return { stoneSkuId: stone?.stoneSkuId, skipped: true };
  const item = await StullerItemService.fetchItemData(stone.stullerSku);
  const mapped = stoneFromStullerItem(item);
  const updated = await StonesModel.updateCost(stone.stoneSkuId, mapped.cost, mapped.costCurrency);
  return { stoneSkuId: stone.stoneSkuId, stullerSku: stone.stullerSku, cost: updated?.cost };
}

/** Refresh the cached wholesale cost of every Stuller-linked stone in the catalog. */
export async function refreshAllStonePrices() {
  const stones = await StonesModel.allWithSku();
  let updated = 0;
  let failed = 0;
  const errors = [];
  for (const stone of stones) {
    try {
      await refreshStonePrice(stone);
      updated += 1;
    } catch (e) {
      failed += 1;
      errors.push({ stullerSku: stone.stullerSku, error: e.message });
    }
  }
  return { total: stones.length, updated, failed, errors };
}
