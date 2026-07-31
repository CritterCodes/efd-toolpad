/**
 * Email a repair quote to the customer.
 *
 * Same arrangement as appointment mail: the branded templates and
 * NotificationService live in efd-shop, so admin posts the data across rather
 * than growing a second set of customer emails here.
 *
 * Never throws. The quote is already saved and its accept link is already live
 * by the time this runs; a mail failure should tell staff to phone, not undo the
 * quote they just built.
 */

import { db as database } from '@/lib/database';
import { shopBase } from '@/lib/appUrls';

/** @returns {Promise<{sent: boolean, reason?: string, url?: string}>} */
export async function sendQuoteEmail(repairID, quote) {
  const key = process.env.EFD_ADMIN_API_KEY;
  if (!key) return { sent: false, reason: 'not-configured' };

  let repair;
  try {
    const db = await database.connect();
    repair = await db
      .collection('repairs')
      .findOne({ repairID }, { projection: { clientName: 1, clientEmail: 1, description: 1 } });
  } catch (error) {
    console.error('quote email lookup failed (non-fatal):', error?.message);
    return { sent: false, reason: 'lookup-failed' };
  }

  if (!repair?.clientEmail) return { sent: false, reason: 'no-email' };

  const url = `${shopBase().replace(/\/$/, '')}/repair/estimate/${quote.token}`;

  try {
    const res = await fetch(`${shopBase().replace(/\/$/, '')}/api/repair-leads/quote-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-efd-admin-key': key },
      body: JSON.stringify({
        repairID,
        clientName: repair.clientName || '',
        clientEmail: repair.clientEmail,
        total: quote.total,
        items: quote.items,
        note: quote.note || '',
        acceptUrl: url,
        expiresAt: quote.expiresAt,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { sent: false, reason: `http-${res.status}`, url };
    const json = await res.json().catch(() => ({}));
    return { sent: Boolean(json?.sent), reason: json?.reason, url };
  } catch (error) {
    console.error('quote email failed (non-fatal):', error?.message);
    return { sent: false, reason: 'unreachable', url };
  }
}
