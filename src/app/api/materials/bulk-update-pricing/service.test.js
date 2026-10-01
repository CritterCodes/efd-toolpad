import { describe, it, expect, vi, beforeEach } from 'vitest';

// The 2026-09-01 incident: the sync REPLACED each stullerProducts entry with a
// 4-field object, deleting portionsPerUnit/unitCost. The pricing engine divides
// stullerPrice by portionsPerUnit, so losing it multiplied sizing-stock costs
// by the portion count (8x). These tests pin the merge behavior.

const bulkWrite = vi.fn(async () => ({ modifiedCount: 1 }));
let materialsFixture = [];

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => {}),
    dbMaterials: vi.fn(async () => ({
      find: () => ({ toArray: async () => materialsFixture }),
      bulkWrite,
    })),
    dbAdminSettings: vi.fn(async () => ({
      findOne: async () => ({
        _id: 'repair_task_admin_settings',
        stuller: { enabled: true, username: 'u', password: 'p', apiUrl: 'https://stuller.test' },
      }),
    })),
  },
}));
vi.mock('@/utils/encryption', () => ({
  isDataEncrypted: () => false,
  decryptSensitiveData: (v) => v,
}));

import { runMaterialPriceSync } from './service';

const stullerResponse = (sku, price) => ({
  ok: true,
  json: async () => ({ Products: [{ SKU: sku, Price: { Value: price } }] }),
});

beforeEach(() => {
  bulkWrite.mockClear();
  global.fetch = vi.fn(async (url) => {
    const sku = decodeURIComponent(String(url).split('SKU=')[1]);
    return stullerResponse(sku, 200);
  });
});

describe('runMaterialPriceSync product updates', () => {
  it('merges the fresh price into the product, preserving every other field', async () => {
    materialsFixture = [{
      _id: 'mat1',
      displayName: '3x2 mm Flat Sizing Stock',
      portionsPerUnit: 1,
      stullerProducts: [{
        id: 'p1',
        stullerItemNumber: 'SIZING-14Y',
        metalType: 'yellow_gold',
        karat: '14K',
        stullerPrice: 145.31,
        unitCost: 145.31,
        portionsPerUnit: 8,
        weight: 1.2,
        description: 'kept',
      }],
    }];

    const result = await runMaterialPriceSync();
    expect(result.status).toBe(200);
    expect(bulkWrite).toHaveBeenCalledTimes(1);

    const [product] = bulkWrite.mock.calls[0][0][0].updateOne.update.$set.stullerProducts;
    expect(product.stullerPrice).toBe(200);          // refreshed
    expect(product.portionsPerUnit).toBe(8);         // the field the incident deleted
    expect(product.unitCost).toBe(145.31);
    expect(product.id).toBe('p1');
    expect(product.weight).toBe(1.2);
    expect(product.description).toBe('kept');
    expect(product.metalType).toBe('yellow_gold');
    expect(product.karat).toBe('14K');
  });

  it('keeps a product untouched when Stuller returns no usable price', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ Products: [] }) }));
    materialsFixture = [{
      _id: 'mat2',
      displayName: 'Wire',
      stullerProducts: [{ stullerItemNumber: 'W-1', metalType: 'yellow_gold', karat: '14K', stullerPrice: 10, portionsPerUnit: 4 }],
    }];

    await runMaterialPriceSync();
    // no price -> no update op at all for this material
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  // EFD-DEFECTS P23
  it("honours a variant's auto-update switch, unless forced", async () => {
    materialsFixture = [{
      _id: 'mat3', displayName: 'Solder',
      stullerProducts: [
        { stullerItemNumber: 'S-ON', stullerPrice: 10 },
        { stullerItemNumber: 'S-OFF', stullerPrice: 10, autoUpdatePricing: false },
      ],
    }];
    await runMaterialPriceSync();
    const products = bulkWrite.mock.calls[0][0][0].updateOne.update.$set.stullerProducts;
    expect(products.map((p) => p.stullerPrice)).toEqual([200, 10]);

    bulkWrite.mockClear();
    await runMaterialPriceSync(null, { force: true });
    expect(bulkWrite.mock.calls[0][0][0].updateOne.update.$set.stullerProducts.map((p) => p.stullerPrice)).toEqual([200, 200]);
  });

  it("skips a material switched off, and never switches it back on", async () => {
    materialsFixture = [{ _id: 'mat4', displayName: 'Off', auto_update_pricing: false, stullerProducts: [{ stullerItemNumber: 'X', stullerPrice: 1 }] }];
    await runMaterialPriceSync();
    expect(bulkWrite).not.toHaveBeenCalled();

    materialsFixture = [{ _id: 'mat5', displayName: 'On', stullerProducts: [{ stullerItemNumber: 'Y', stullerPrice: 1 }] }];
    await runMaterialPriceSync();
    expect(bulkWrite.mock.calls[0][0][0].updateOne.update.$set).not.toHaveProperty('auto_update_pricing');
  });

  it('one SKU Stuller cannot answer skips only that SKU — and is reported', async () => {
    global.fetch = vi.fn(async (url) => {
      const sku = decodeURIComponent(String(url).split('SKU=')[1]);
      if (sku === 'BAD') return { ok: false, status: 404, text: async () => 'nope' };
      return stullerResponse(sku, 200);
    });
    materialsFixture = [{ _id: 'mat6', displayName: 'Stock', stullerProducts: [
      { stullerItemNumber: 'BAD', stullerPrice: 5 },
      { stullerItemNumber: 'GOOD', stullerPrice: 5 },
    ] }];
    const result = await runMaterialPriceSync();
    expect(bulkWrite.mock.calls[0][0][0].updateOne.update.$set.stullerProducts.map((p) => p.stullerPrice)).toEqual([5, 200]);
    expect(result.payload.failed).toBe(1);
    expect(result.payload.failures[0]).toMatchObject({ sku: 'BAD' });
  });
});
