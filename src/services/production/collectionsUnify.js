/**
 * Collection≡Drop unification (Pipeline M1-T5). Pure mapping helpers shared by the
 * `pp1-collections-unify` migration and the unified CollectionsModel. No DB access —
 * the migration reads/writes; these just compute the unified shape from legacy docs.
 *
 * Two legacy sources converge onto ONE `collections` collection (see data-model.md):
 *  - legacy `collections` ({ type, isPublished, products[] }) → additive unified fields.
 *  - legacy `drops` ({ status, targetReleaseDate, channel }) → a new `collections` doc.
 */

export const COLLECTION_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RELEASED: 'released',
  ARCHIVED: 'archived',
};

export const OWNER_TYPE = { EFD: 'efd', ARTISAN: 'artisan' };

/** Drop lifecycle → unified collection status (planning/in_production → draft). */
export function dropStatusToCollectionStatus(status) {
  switch (status) {
    case 'released': return COLLECTION_STATUS.RELEASED;
    case 'archived': return COLLECTION_STATUS.ARCHIVED;
    default: return COLLECTION_STATUS.DRAFT; // planning | in_production | unknown
  }
}

/** Legacy collection (isPublished/status) → unified status. */
export function legacyCollectionStatus(doc = {}) {
  if (doc.status === 'archived') return COLLECTION_STATUS.ARCHIVED;
  if (doc.isPublished) return COLLECTION_STATUS.RELEASED;
  return COLLECTION_STATUS.DRAFT;
}

/** Legacy `products[]` (ids or {productId}) → unified `members[]` ({ productId, position }). */
export function membersFromLegacyProducts(products = []) {
  return (Array.isArray(products) ? products : [])
    .map((p, i) => ({
      productId: (p && typeof p === 'object') ? (p.productId ?? p.id ?? null) : p,
      position: i,
    }))
    .filter((m) => m.productId != null);
}

/**
 * Additive `$set` fields to bring an existing legacy `collections` doc onto the
 * unified shape. Preserves ownerId/ownerInfo/slug/seo/image/thumbnail/timestamps
 * (untouched by the migration); only adds the new normalized facets.
 */
export function unifiedFieldsFromLegacy(doc = {}) {
  return {
    ownerType: doc.type === 'artisan' ? OWNER_TYPE.ARTISAN : OWNER_TYPE.EFD,
    status: legacyCollectionStatus(doc),
    members: Array.isArray(doc.members) ? doc.members : membersFromLegacyProducts(doc.products),
    releaseAt: doc.releaseAt ?? null,
    migratedFrom: 'collection',
  };
}

/**
 * A unified `collections` doc built from a legacy `drops` doc. `memberProductIds` are
 * the productIds of products linked to designs in this drop (the migration resolves
 * them). `collectionId`/slug-uniqueness are assigned by the migration, not here.
 */
export function unifiedDocFromDrop(drop = {}, memberProductIds = []) {
  return {
    name: drop.name ?? '',
    slug: drop.slug ?? null,
    theme: drop.theme ?? null,
    description: drop.description ?? null,
    ownerType: OWNER_TYPE.EFD,
    channel: drop.channel ?? null,
    status: dropStatusToCollectionStatus(drop.status),
    releaseAt: drop.targetReleaseDate ?? null,
    members: (Array.isArray(memberProductIds) ? memberProductIds : [])
      .filter(Boolean)
      .map((productId, i) => ({ productId, position: i })),
    sourceDropID: drop.dropID ?? null,
    migratedFrom: 'drop',
  };
}
