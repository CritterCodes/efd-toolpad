import { db } from '@/lib/database';

/**
 * Reorderable stone SKUs — commodity stones (Stuller melee, standard sizes, etc.) used as
 * COMPONENTS in design variants and repairs. Distinct from:
 *   - products/productType:'gemstone' (sellable loose-stone listings), and
 *   - materials (bench consumables + metal stock).
 * Deduped by Stuller SKU so one SKU is a single reusable record everywhere. Cost is the
 * Stuller WHOLESALE price, cached with a refresh timestamp.
 */
const COLLECTION = 'stoneSkus';

async function collection() {
  const dbInstance = await db.connect();
  return dbInstance.collection(COLLECTION);
}

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const StonesModel = {
  async list({ search } = {}) {
    const col = await collection();
    const q = {};
    if (search && search.trim()) {
      const rx = new RegExp(escapeRx(search.trim()), 'i');
      q.$or = [{ label: rx }, { stullerSku: rx }, { gemType: rx }, { species: rx }, { shape: rx }];
    }
    return col.find(q).sort({ updatedAt: -1 }).limit(50).toArray();
  },

  async findBySku(stullerSku) {
    if (!stullerSku) return null;
    const col = await collection();
    return col.findOne({ stullerSku });
  },

  async findById(stoneSkuId) {
    if (!stoneSkuId) return null;
    const col = await collection();
    return col.findOne({ stoneSkuId });
  },

  /** Every stone that carries a Stuller SKU (candidates for a price refresh). */
  async allWithSku() {
    const col = await collection();
    return col.find({ stullerSku: { $exists: true, $nin: [null, ''] } }).toArray();
  },

  /** Update just the cached wholesale cost + refresh timestamp. */
  async updateCost(stoneSkuId, cost, costCurrency) {
    const col = await collection();
    const now = new Date();
    await col.updateOne({ stoneSkuId }, { $set: { cost: Number(cost) || 0, costCurrency: costCurrency || 'USD', costUpdatedAt: now, updatedAt: now } });
    return col.findOne({ stoneSkuId });
  },

  async deleteById(stoneSkuId) {
    if (!stoneSkuId) return false;
    const col = await collection();
    const res = await col.deleteOne({ stoneSkuId });
    return res.deletedCount > 0;
  },

  /** Upsert by Stuller SKU (manual stones with no SKU always insert a new record). */
  async upsertBySku(data = {}) {
    const col = await collection();
    const now = new Date();
    if (data.stullerSku) {
      const existing = await col.findOne({ stullerSku: data.stullerSku });
      if (existing) {
        await col.updateOne({ _id: existing._id }, { $set: { ...data, updatedAt: now } });
        return col.findOne({ _id: existing._id });
      }
    }
    const stoneSkuId = data.stoneSkuId || `stone_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const doc = { ...data, stoneSkuId, createdAt: now, updatedAt: now };
    await col.insertOne(doc);
    return doc;
  },
};

/** Case-insensitive lookup of a Stuller descriptive-element spec by candidate names. */
function pickSpec(specs = {}, names = []) {
  const keys = Object.keys(specs);
  for (const n of names) {
    const exact = keys.find((k) => k.toLowerCase() === n.toLowerCase());
    if (exact) return specs[exact]?.displayValue || specs[exact]?.value || null;
  }
  for (const n of names) {
    const partial = keys.find((k) => k.toLowerCase().includes(n.toLowerCase()));
    if (partial) return specs[partial]?.displayValue || specs[partial]?.value || null;
  }
  return null;
}

/** Map a normalized Stuller item (from /api/stuller/item) into a stone-SKU record. */
export function stoneFromStullerItem(item = {}) {
  const specs = item.specifications || {};
  const species = pickSpec(specs, ['Gemstone', 'Stone Type', 'Gem Type', 'Material']) || '';
  const creation = pickSpec(specs, ['Stone Creation Method', 'Creation Method', 'Origin']) || '';
  const naturalSynthetic = /lab|created|synth|grown/i.test(creation) ? 'lab' : (creation ? 'natural' : null);
  const caratRaw = pickSpec(specs, ['Carat Weight', 'Total Carat Weight', 'Carat']);
  return {
    stullerSku: item.itemNumber || '',
    source: 'stuller',
    label: item.description || species || item.itemNumber || 'Stone',
    gemType: (species || '').toLowerCase() || null, // → REFRAKT preset hint (diamond/amethyst/…)
    species: species || null,
    shape: pickSpec(specs, ['Stone Shape', 'Shape', 'Cut Style']),
    cut: pickSpec(specs, ['Stone Cut', 'Cut Grade', 'Cut']),
    color: pickSpec(specs, ['Stone Color', 'Color']),
    clarity: pickSpec(specs, ['Stone Clarity', 'Clarity']),
    caratEach: caratRaw != null ? Number(String(caratRaw).replace(/[^\d.]/g, '')) || null : null,
    naturalSynthetic,
    dimensions: item.dimensions?.formatted || pickSpec(specs, ['Stone Size', 'Size', 'Millimeter Size']) || null,
    cost: Number(item.price) || 0,
    costCurrency: item.currency || 'USD',
    costUpdatedAt: new Date(),
    stullerUrl: item.itemNumber ? `https://www.stuller.com/products/${item.itemNumber}` : null,
    imageUrl: Array.isArray(item.images) ? (item.images[0]?.url || item.images[0] || null) : null,
  };
}
