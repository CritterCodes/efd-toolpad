import { describe, it, expect } from 'vitest';
import {
  COLLECTION_STATUS,
  OWNER_TYPE,
  dropStatusToCollectionStatus,
  legacyCollectionStatus,
  membersFromLegacyProducts,
  unifiedFieldsFromLegacy,
  unifiedDocFromDrop,
} from '@/services/production/collectionsUnify';

describe('dropStatusToCollectionStatus', () => {
  it('maps drop lifecycle → unified status', () => {
    expect(dropStatusToCollectionStatus('released')).toBe(COLLECTION_STATUS.RELEASED);
    expect(dropStatusToCollectionStatus('archived')).toBe(COLLECTION_STATUS.ARCHIVED);
    expect(dropStatusToCollectionStatus('planning')).toBe(COLLECTION_STATUS.DRAFT);
    expect(dropStatusToCollectionStatus('in_production')).toBe(COLLECTION_STATUS.DRAFT);
    expect(dropStatusToCollectionStatus(undefined)).toBe(COLLECTION_STATUS.DRAFT);
  });
});

describe('legacyCollectionStatus', () => {
  it('archived wins, then isPublished→released, else draft', () => {
    expect(legacyCollectionStatus({ status: 'archived', isPublished: true })).toBe(COLLECTION_STATUS.ARCHIVED);
    expect(legacyCollectionStatus({ isPublished: true })).toBe(COLLECTION_STATUS.RELEASED);
    expect(legacyCollectionStatus({ isPublished: false })).toBe(COLLECTION_STATUS.DRAFT);
    expect(legacyCollectionStatus({})).toBe(COLLECTION_STATUS.DRAFT);
  });
});

describe('membersFromLegacyProducts', () => {
  it('maps id strings and {productId} objects to positioned members', () => {
    expect(membersFromLegacyProducts(['a', 'b'])).toEqual([
      { productId: 'a', position: 0 },
      { productId: 'b', position: 1 },
    ]);
    expect(membersFromLegacyProducts([{ productId: 'x' }, { id: 'y' }])).toEqual([
      { productId: 'x', position: 0 },
      { productId: 'y', position: 1 },
    ]);
    expect(membersFromLegacyProducts([])).toEqual([]);
    expect(membersFromLegacyProducts(undefined)).toEqual([]);
  });
});

describe('unifiedFieldsFromLegacy', () => {
  it('artisan → artisan ownerType; products → members; unpublished → draft', () => {
    const out = unifiedFieldsFromLegacy({ type: 'artisan', isPublished: false, products: ['p1'] });
    expect(out.ownerType).toBe(OWNER_TYPE.ARTISAN);
    expect(out.status).toBe(COLLECTION_STATUS.DRAFT);
    expect(out.members).toEqual([{ productId: 'p1', position: 0 }]);
    expect(out.migratedFrom).toBe('collection');
  });

  it('admin/drop type → efd ownerType; published → released', () => {
    expect(unifiedFieldsFromLegacy({ type: 'admin', isPublished: true }).ownerType).toBe(OWNER_TYPE.EFD);
    expect(unifiedFieldsFromLegacy({ type: 'drop', isPublished: true }).status).toBe(COLLECTION_STATUS.RELEASED);
  });
});

describe('unifiedDocFromDrop', () => {
  it('builds an efd collection doc with releaseAt from targetReleaseDate + positioned members', () => {
    const drop = { dropID: 'd1', name: 'Winter', slug: 'winter', channel: 'online', status: 'in_production', targetReleaseDate: '2026-08-01' };
    const doc = unifiedDocFromDrop(drop, ['pA', 'pB']);
    expect(doc.ownerType).toBe(OWNER_TYPE.EFD);
    expect(doc.status).toBe(COLLECTION_STATUS.DRAFT); // in_production → draft
    expect(doc.releaseAt).toBe('2026-08-01');
    expect(doc.channel).toBe('online');
    expect(doc.sourceDropID).toBe('d1');
    expect(doc.members).toEqual([{ productId: 'pA', position: 0 }, { productId: 'pB', position: 1 }]);
    expect(doc.migratedFrom).toBe('drop');
  });

  it('a released drop with no linked products → released, empty members', () => {
    const doc = unifiedDocFromDrop({ dropID: 'd2', status: 'released' }, []);
    expect(doc.status).toBe(COLLECTION_STATUS.RELEASED);
    expect(doc.members).toEqual([]);
  });
});
