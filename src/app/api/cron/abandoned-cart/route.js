/**
 * Cron: Abandoned cart recovery (Tier 5, marketing)
 * GET /api/cron/abandoned-cart?secret=CRON_SECRET   (hourly — see vercel.json)
 *
 * Emails a one-time recovery nudge for carts idle > IDLE_HOURS with no order placed.
 * DATA-DEPENDENT: requires a persisted `carts` collection ({ userID|email, items,
 * updatedAt, remindedAt, recoveredAt }). Carts may currently be client-only — until they
 * are persisted this is a safe no-op (scanned:0). Idempotent via `remindedAt`.
 * Marketing → honors user_preferences opt-out.
 */
import { db as mongo } from '@/lib/database.js';
import { NotificationService } from '@/lib/notificationService';

const IDLE_HOURS = 4;

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const db = await mongo.connect();
    const now = new Date();
    const cutoff = new Date(now.getTime() - IDLE_HOURS * 60 * 60 * 1000);

    // Guard: if the carts collection doesn't exist yet, this returns [] (safe no-op).
    const carts = await db.collection('carts').find({
      updatedAt: { $lte: cutoff },
      remindedAt: { $in: [null, undefined] },
      recoveredAt: { $in: [null, undefined] },
      $or: [{ items: { $exists: true, $ne: [] } }, { 'items.0': { $exists: true } }],
    }).limit(200).toArray();

    let notified = 0;

    for (const cart of carts) {
      const userID = cart.userID || cart.userId || null;
      const email = cart.email || cart.customerEmail || null;
      // Stamp first for idempotency (even if we skip send) so we don't re-scan the same cart.
      await db.collection('carts').updateOne({ _id: cart._id }, { $set: { remindedAt: now } });
      if (!userID && !email) continue;

      // Marketing consent
      if (userID) {
        const prefs = await db.collection('user_preferences').findOne({ userID });
        if (prefs && prefs.emailNotifications === false && prefs.pushNotifications === false) continue;
      }

      try {
        await NotificationService.createNotification({
          userId: userID || `guest:${email}`,
          type: 'abandoned_cart',
          title: 'You left something behind',
          message: 'Your cart is waiting — complete your order before your picks sell out.',
          channels: userID ? ['inApp', 'email'] : ['email'],
          recipientEmail: email,
          priority: 'normal',
          data: { actionUrl: `${process.env.NEXT_PUBLIC_SHOP_URL || ''}/cart` },
          tags: ['marketing', 'abandoned-cart'],
        });
        notified += 1;
      } catch (e) {
        console.error('[cron:abandoned-cart] notify failed:', e.message);
      }
    }

    return Response.json({ success: true, scanned: carts.length, notified, timestamp: now.toISOString() });
  } catch (error) {
    // A missing `carts` collection surfaces here on some drivers — treat as no-op, not failure.
    console.error('❌ [cron:abandoned-cart] error:', error.message);
    return Response.json({ success: true, scanned: 0, notified: 0, note: error.message });
  }
}
