import { db } from '@/lib/database';

/**
 * Mongo-backed fixed-window rate limiter (serverless-safe — the counter is shared across all
 * instances, unlike an in-process map). Built for the public `/api/refrakt-price` endpoint
 * (0005 §7 / M3-T5) but generic. A TTL index auto-reaps expired buckets.
 *
 * Fixed-window (not sliding): simple + one atomic `$inc` per call, which is all a
 * debounced-configurator abuse guard needs. Thresholds are the caller's policy (env-tunable).
 */

const COLLECTION = 'apiRateLimits';
let indexed = false;

async function collection() {
  const dbInstance = await db.connect();
  const col = dbInstance.collection(COLLECTION);
  if (!indexed) {
    // TTL reaper: Mongo deletes a bucket doc once `expireAt` passes.
    await col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    indexed = true;
  }
  return col;
}

/** Pure window math — the current bucket + verdict for a given hit `count`. Unit-testable. */
export function evalWindow(now, count, limit, windowMs) {
  const bucket = Math.floor(now / windowMs);
  const resetAt = new Date((bucket + 1) * windowMs);
  return {
    allowed: count <= limit,
    count,
    limit,
    bucket,
    resetAt,
    retryAfterSec: Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000)),
  };
}

/**
 * Record one hit for `key` and report whether it's within `limit` for the current `windowMs`.
 * @returns {Promise<{allowed:boolean, count:number, limit:number, resetAt:Date, retryAfterSec:number}>}
 */
export async function consumeRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const id = `${key}:${bucket}`;
  const col = await collection();
  const res = await col.findOneAndUpdate(
    { _id: id },
    // keep the doc ~2 windows so a late request in the window still counts before the TTL reaps it
    { $inc: { count: 1 }, $setOnInsert: { key, expireAt: new Date((bucket + 2) * windowMs) } },
    { upsert: true, returnDocument: 'after' },
  );
  const doc = res?.value ?? res; // mongodb v4 returns {value}; v5+ returns the doc directly
  const count = Number(doc?.count) || 1;
  return evalWindow(now, count, limit, windowMs);
}
