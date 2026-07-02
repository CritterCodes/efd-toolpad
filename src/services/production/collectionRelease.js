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
