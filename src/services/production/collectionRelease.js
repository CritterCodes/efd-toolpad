/**
 * Drop release engine (Pipeline M1-T6) — mechanism (a): admin scheduled publish-flip
 * (decision 0003, accepted by Lead Shop). Products are staged as draft members of a
 * Collection; at `releaseAt` (or a manual go-live) the whole batch flips to published
 * AT ONCE. Shop visibility stays exactly `published || isPublic` — no time-based read
 * rule (one source of truth; no clock logic spread across read paths).
 *
 * Pure decision helpers here; the DB writes live in the service below.
 */
import CollectionsModel from '@/app/api/collections/model';
import { db } from '@/lib/database';
import { COLLECTION_STATUS } from '@/services/production/collectionsUnify';
import { isRevisedMtoProduct, isHandmadeDesign, loadMtoCapabilityRecord, checkMtoCapabilityRecord } from '@/lib/mtoCapabilityGate';

/** A collection is due when it's scheduled and its releaseAt has arrived. */
export function isDue(collection = {}, now = new Date()) {
  if (collection.status !== COLLECTION_STATUS.SCHEDULED) return false;
  if (!collection.releaseAt) return false;
  return new Date(collection.releaseAt).getTime() <= new Date(now).getTime();
}

/** The member productIds to publish + the collection patch, for a release. */
export function releasePlan(collection = {}, now = new Date()) {
  const releasedAt = new Date(now);
  const memberProductIds = (collection.members || []).map((m) => m.productId).filter(Boolean);
  return {
    memberProductIds,
    collectionUpdate: { status: COLLECTION_STATUS.RELEASED, releasedAt },
  };
}

/**
 * Release a collection NOW (go-live) or when a scheduler fires it. Flips every member
 * product to `published` in one `updateMany`, then flips the collection to `released`.
 * (Mongo standalone has no cross-doc txn; the member flip is atomic, the collection
 * flip is a immediate follow — a scheduler should call this once per due collection.)
 */
export async function releaseCollection(collectionId, { now = new Date() } = {}) {
  const collection = await CollectionsModel.findById(collectionId);
  if (!collection) throw new Error('Collection not found.');
  if (collection.status === COLLECTION_STATUS.RELEASED) {
    return { collection, publishedCount: 0, alreadyReleased: true };
  }

  const { memberProductIds, collectionUpdate } = releasePlan(collection, now);
  const dbInstance = await db.connect();

  // MTO capability gate: before publishing any products, check whether any are revised
  // made-to-order (Design-backed, non-handmade, with an active MTO offer). If so, the
  // mtoCheckoutCapacity capability must be active or the release is blocked outright.
  if (memberProductIds.length) {
    const mtoProducts = await dbInstance.collection('products').find(
      {
        productId: { $in: memberProductIds },
        designId: { $exists: true, $ne: null },
        variants: { $elemMatch: { active: true, 'offers.madeToOrder.enabled': true } },
      },
      { projection: { productId: 1, designId: 1, variants: 1 } },
    ).toArray();

    const mtoProductsFiltered = mtoProducts.filter(isRevisedMtoProduct);

    if (mtoProductsFiltered.length > 0) {
      const designIds = [...new Set(mtoProductsFiltered.map((p) => p.designId).filter(Boolean))];
      const designs = await dbInstance.collection('designs').find(
        { designID: { $in: designIds } },
        { projection: { designID: 1, productionMethod: 1 } },
      ).toArray();
      const designByID = Object.fromEntries(designs.map((d) => [d.designID, d]));

      const hasNonHandmadeMTO = mtoProductsFiltered.some(
        (p) => !isHandmadeDesign(designByID[p.designId]),
      );

      if (hasNonHandmadeMTO) {
        const capabilityRecord = await loadMtoCapabilityRecord(dbInstance);
        const { allowed, reason } = checkMtoCapabilityRecord(capabilityRecord);
        if (!allowed) {
          throw new Error(`Collection release blocked: made-to-order products cannot be published — ${reason}`);
        }
      }
    }
  }

  if (memberProductIds.length) {
    await dbInstance.collection('products').updateMany(
      { productId: { $in: memberProductIds } },
      { $set: { status: 'published', 'publishing.visible': true, 'publishing.publishedAt': collectionUpdate.releasedAt, updatedAt: new Date() } },
    );
  }
  const updated = await CollectionsModel.updateById(collectionId, collectionUpdate);
  return { collection: updated, publishedCount: memberProductIds.length };
}

/** Collections whose scheduled release time has arrived (the cron/scheduler hook). */
export async function findDueReleases(now = new Date()) {
  const scheduled = await CollectionsModel.list({ status: COLLECTION_STATUS.SCHEDULED });
  return scheduled.filter((c) => isDue(c, now));
}
