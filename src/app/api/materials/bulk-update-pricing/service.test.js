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
});
