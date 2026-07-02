/**
 * Web Push helper (efd-admin, server-side)
 *
 * Configures web-push with the VAPID keypair and delivers push messages to a user's
 * registered browser subscriptions in the SHARED `pushSubscriptions` collection.
 *
 * IMPORTANT — shared keypair with efd-shop:
 * Push subscriptions are bound to the VAPID applicationServerKey, NOT the origin. efd-admin
 * reuses the SAME VAPID keypair as efd-shop (same env values) so both apps share one
 * `pushSubscriptions` pool: admin advancing a repair/custom order can push the customer's
 * shop-origin subscription, and admins/jewelers subscribe via the admin origin. Do NOT
 * generate a separate admin keypair — that would split the pool.
 *
 * Env required (see .env.push.example): NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 * VAPID_SUBJECT (mailto:/https: contact). Generate once: npx web-push generate-vapid-keys.
 *
 * Delivery keys on the canonical `userID` string (same value the notifications collection and
 * NextAuth session use) — never the mongo _id.
 */

import webpush from 'web-push';
import { db as mongo } from '../src/lib/database.js';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:critter@engelfinedesign.com';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — admin push disabled');
    return false;
  }
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
    return true;
  } catch (err) {
    console.error('[push] Failed to set VAPID details:', err.message);
    return false;
  }
}

export function isPushConfigured() {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

/**
 * Send a push message to every subscription a user has registered (shared pool).
 * @param {string} userID  canonical userID string
 * @param {{title:string, body:string, url?:string, icon?:string, badge?:string, tag?:string, data?:object}} payload
 * @returns {Promise<{success:boolean, sent:number, pruned:number, reason?:string}>}
 */
export async function sendPushToUser(userID, payload) {
  if (!ensureConfigured()) return { success: false, sent: 0, pruned: 0, reason: 'VAPID not configured' };
  if (!userID) return { success: false, sent: 0, pruned: 0, reason: 'No userID' };

  const db = await mongo.connect();
  const subs = await db.collection('pushSubscriptions').find({ userID }).toArray();
  if (subs.length === 0) return { success: false, sent: 0, pruned: 0, reason: 'No subscriptions' };

  const body = JSON.stringify({
    title: payload.title || 'Engel Fine Design',
    body: payload.body || '',
    url: payload.url || '/',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    tag: payload.tag,
    data: payload.data || {},
  });

  let sent = 0;
  const stale = [];

  await Promise.all(subs.map(async (record) => {
    try {
      await webpush.sendNotification({ endpoint: record.endpoint, keys: record.keys }, body);
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) stale.push(record.endpoint);
      else console.error('[push] send failed:', err.statusCode || '', err.message);
    }
  }));

  let pruned = 0;
  if (stale.length) {
    try {
      const res = await db.collection('pushSubscriptions').deleteMany({ endpoint: { $in: stale } });
      pruned = res.deletedCount || 0;
    } catch (err) {
      console.error('[push] prune failed:', err.message);
    }
  }

  return { success: sent > 0, sent, pruned };
}
