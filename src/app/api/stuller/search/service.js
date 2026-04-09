import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';

export default class StullerSearchService {
  static normalizeSearchItem(item = {}) {
    const sku = item.sku || item.itemNumber || item.SKU || item.itemNo || '';
    return {
      sku,
      itemNumber: sku,
      description: item.title || item.description || item.name || sku,
      category: item.category || item.productType || 'supplies',
      unitCost: parseFloat(item.price || item.unitCost || item.retailPrice || 0),
      inStock: item.inStock !== false,
      metalType: item.metalType || item.metal || null,
      karat: item.karat || item.purity || null,
      unit: item.unit || 'each',
      imageUrl: item.imageUrl || item.thumbnail || null
    };
  }

  static buildGroupingKey(product = {}) {
    const desc = String(product.description || '').toLowerCase();
    const normalized = desc
      .replace(/\b(10k|14k|18k|22k|24k|925|950|999)\b/g, '')
      .replace(/\b(yellow|white|rose)\s+gold\b/g, 'gold')
      .replace(/\b(yg|wg|rg|pt|ss)\b/g, '')
      .replace(/\b(gold|silver|platinum|palladium)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${normalized || desc || 'misc'}::${product.category || 'supplies'}`;
  }

  static groupByProductFamily(products = []) {
    const groups = new Map();

    for (const product of products) {
      const key = StullerSearchService.buildGroupingKey(product);
      if (!groups.has(key)) {
        groups.set(key, {
          itemNumber: product.itemNumber,
          description: product.description,
          category: product.category,
          unitCost: product.unitCost,
          inStock: product.inStock,
          metalType: product.metalType,
          karat: product.karat,
          unit: product.unit,
          imageUrl: product.imageUrl,
          variants: []
        });
      }

      groups.get(key).variants.push({
        sku: product.sku || product.itemNumber,
        itemNumber: product.itemNumber,
        metalType: product.metalType,
        karat: product.karat,
        unitCost: product.unitCost,
        unit: product.unit,
        inStock: product.inStock
      });
    }

    return Array.from(groups.values()).map(group => {
      const variantCosts = group.variants
        .map(v => parseFloat(v.unitCost || 0))
        .filter(cost => !Number.isNaN(cost));

      return {
        ...group,
        unitCost: variantCosts.length ? Math.min(...variantCosts) : 0
      };
    });
  }

  static async searchProducts(query = '') {
    if (!query || !query.trim()) {
      const err = new Error('Search query is required');
      err.status = 400;
      throw err;
    }

    // Get Stuller credentials from admin settings
    await db.connect();
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    const stullerConfig = adminSettings?.stuller;

    // If Stuller is not configured, return mock results for dev
    if (!stullerConfig?.enabled || !stullerConfig?.username || !stullerConfig?.password) {
      return StullerSearchService.getMockResults(query);
    }

    let decryptedPassword = stullerConfig.password;
    if (isDataEncrypted(stullerConfig.password)) {
      try {
        decryptedPassword = decryptSensitiveData(stullerConfig.password);
      } catch (error) {
        console.error('Failed to decrypt Stuller password:', error);
        return StullerSearchService.getMockResults(query);
      }
    }

    const stullerApiUrl = stullerConfig.apiUrl || 'https://api.stuller.com';
    const credentials = Buffer.from(`${stullerConfig.username}:${decryptedPassword}`).toString('base64');
    const encodedQuery = encodeURIComponent(query.trim());

    try {
      const response = await fetch(
        `${stullerApiUrl}/v2/products?search=${encodedQuery}&pageSize=25`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.warn(`Stuller search failed (${response.status}), falling back to mock`);
        return StullerSearchService.getMockResults(query);
      }

      const data = await response.json();
      const items = Array.isArray(data?.products || data?.items || data) ? (data?.products || data?.items || data) : [];

      const normalized = items.map(item => StullerSearchService.normalizeSearchItem(item));
      return StullerSearchService.groupByProductFamily(normalized);
    } catch (error) {
      console.error('Stuller API search error:', error);
      return StullerSearchService.getMockResults(query);
    }
  }

  static getMockResults(query = '') {
    const q = query.toLowerCase();
    const catalog = [
      { itemNumber: 'SOL-EZ-YG', description: 'Easy Solder Yellow Gold 14k', category: 'solder', unitCost: 12.50, metalType: 'yellow_gold', karat: '14k', unit: 'piece', inStock: true },
      { itemNumber: 'SOL-EZ-WG', description: 'Easy Solder White Gold 14k', category: 'solder', unitCost: 13.00, metalType: 'white_gold', karat: '14k', unit: 'piece', inStock: true },
      { itemNumber: 'SOL-HRD-YG', description: 'Hard Solder Yellow Gold 14k', category: 'solder', unitCost: 14.00, metalType: 'yellow_gold', karat: '14k', unit: 'piece', inStock: true },
      { itemNumber: 'SOL-SS', description: 'Silver Solder Easy', category: 'solder', unitCost: 4.50, metalType: 'silver', karat: '925', unit: 'piece', inStock: true },
      { itemNumber: 'FLUX-GNL', description: 'General Purpose Flux', category: 'flux', unitCost: 8.00, unit: 'bottle', inStock: true },
      { itemNumber: 'FLUX-PT', description: 'Platinum Flux', category: 'flux', unitCost: 15.00, metalType: 'platinum', unit: 'bottle', inStock: true },
      { itemNumber: 'POL-RRR', description: 'Red Rouge Polishing Compound', category: 'polish', unitCost: 6.50, unit: 'bar', inStock: true },
      { itemNumber: 'POL-WRE', description: 'White Polishing Compound (Pre-polish)', category: 'polish', unitCost: 5.00, unit: 'bar', inStock: true },
      { itemNumber: 'RHO-1G', description: 'Rhodium Solution 1g/L', category: 'plating', unitCost: 45.00, unit: 'bottle', inStock: true },
      { itemNumber: 'PRON-4-YG', description: '4-Prong Head Yellow Gold 14k 6mm', category: 'findings', unitCost: 18.00, metalType: 'yellow_gold', karat: '14k', unit: 'each', inStock: true },
      { itemNumber: 'PRON-6-YG', description: '6-Prong Head Yellow Gold 14k 6.5mm', category: 'findings', unitCost: 22.00, metalType: 'yellow_gold', karat: '14k', unit: 'each', inStock: true },
      { itemNumber: 'PRON-4-WG', description: '4-Prong Head White Gold 14k 6mm', category: 'findings', unitCost: 19.00, metalType: 'white_gold', karat: '14k', unit: 'each', inStock: true },
      { itemNumber: 'SHANK-SZ-PT', description: 'Sizing Stock Platinum Flat', category: 'sizing', unitCost: 25.00, metalType: 'platinum', unit: 'piece', inStock: true },
      { itemNumber: 'SHANK-SZ-YG', description: 'Sizing Stock Yellow Gold 14k', category: 'sizing', unitCost: 20.00, metalType: 'yellow_gold', karat: '14k', unit: 'piece', inStock: true },
      { itemNumber: 'POLPAD-GRN', description: 'Green Polishing Pad (Fine)', category: 'polish', unitCost: 2.50, unit: 'each', inStock: true },
      { itemNumber: 'LASER-WIRE-YG14-030', description: 'Laser Wire Yellow Gold 14k 0.30mm', category: 'wire', unitCost: 48.00, metalType: 'yellow_gold', karat: '14k', unit: 'coil', inStock: true },
      { itemNumber: 'LASER-WIRE-YG18-030', description: 'Laser Wire Yellow Gold 18k 0.30mm', category: 'wire', unitCost: 55.00, metalType: 'yellow_gold', karat: '18k', unit: 'coil', inStock: true },
      { itemNumber: 'LASER-WIRE-WG14-030', description: 'Laser Wire White Gold 14k 0.30mm', category: 'wire', unitCost: 50.00, metalType: 'white_gold', karat: '14k', unit: 'coil', inStock: true },
      { itemNumber: 'LASER-WIRE-PT-030', description: 'Laser Wire Platinum 0.30mm', category: 'wire', unitCost: 62.00, metalType: 'platinum', karat: '950', unit: 'coil', inStock: true }
    ];

    const keywords = q.split(/\s+/).filter(Boolean);
    const matches = catalog.filter(item =>
      keywords.some(kw =>
        item.description.toLowerCase().includes(kw) ||
        item.category.toLowerCase().includes(kw) ||
        (item.metalType || '').toLowerCase().includes(kw) ||
        (item.karat || '').toLowerCase().includes(kw)
      )
    );

    const normalized = (matches.length > 0 ? matches : catalog.slice(0, 5))
      .map(item => StullerSearchService.normalizeSearchItem(item));
    return StullerSearchService.groupByProductFamily(normalized);
  }
}
