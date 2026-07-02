/**
 * Cron: Birthday offers (Tier 5, marketing)
 * GET /api/cron/birthday-offers?secret=CRON_SECRET   (daily — see vercel.json)
 *
 * Notifies users whose birthday is today. DATA-DEPENDENT: requires `users.dateOfBirth`
 * (not yet captured at registration) — until that exists this is a safe no-op (matched:0).
 * Idempotent via `users.lastBirthdayOfferYear`. Marketing → honors user_preferences opt-out.
 *
 * Timezone: matches on UTC month/day (documented simplification; refine if DOB gains tz).
 */
import { db as mongo } from '@/lib/database.js';
import { NotificationService } from '@/lib/notificationService';

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const db = await mongo.connect();
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const year = now.getUTCFullYear();

    // Match birthday by month/day regardless of birth year. dateOfBirth stored as Date or ISO.
    const candidates = await db.collection('users').find({
      dateOfBirth: { $exists: true, $ne: null },
      lastBirthdayOfferYear: { $ne: year },
    }).toArray();

    let matched = 0;
    let notified = 0;

    for (const user of candidates) {
      const dob = new Date(user.dateOfBirth);
      if (Number.isNaN(dob.getTime())) continue;
      if (dob.getUTCMonth() + 1 !== month || dob.getUTCDate() !== day) continue;
      matched += 1;

      // Marketing consent: skip if the user opted out of email notifications.
      const prefs = await db.collection('user_preferences').findOne({ userID: user.userID });
      const optedOut = prefs && prefs.emailNotifications === false && prefs.pushNotifications === false;
      // Stamp first (idempotent) so a mid-run failure can't double-send next run.
      await db.collection('users').updateOne({ _id: user._id }, { $set: { lastBirthdayOfferYear: year } });
      if (optedOut) continue;

      try {
        await NotificationService.createNotification({
          userId: user.userID,
          type: 'birthday_offer',
          title: '🎉 Happy Birthday from Engel Fine Design!',
          message: 'Celebrate with a little something special from us — happy birthday!',
          channels: ['inApp', 'email'],
          recipientEmail: user.email,
          priority: 'normal',
          data: { actionUrl: `${process.env.NEXT_PUBLIC_SHOP_URL || ''}/collections`, recipientName: user.firstName || '' },
          tags: ['marketing', 'birthday'],
        });
        notified += 1;
      } catch (e) {
        console.error('[cron:birthday] notify failed for', user.userID, e.message);
      }
    }

    return Response.json({ success: true, candidates: candidates.length, matched, notified, timestamp: now.toISOString() });
  } catch (error) {
    console.error('❌ [cron:birthday] error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
