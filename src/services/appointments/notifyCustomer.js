/**
 * Tell the customer their booking changed.
 *
 * The branded templates and NotificationService live in efd-shop, so this posts
 * to it rather than growing a second, differently-styled set of customer emails
 * in admin — admin's own mail utility only handles auth (verify, reset, invite).
 *
 * BEST-EFFORT BY DESIGN
 * ---------------------
 * Never throws. The appointment change has already happened by the time this
 * runs, and a mail server hiccup must not roll it back or block the person at
 * the counter. A confirmed booking that failed to email is a phone call; a
 * booking that could not be confirmed because email was down is a lost
 * customer. Callers surface `sent` so the UI can say plainly whether the
 * customer was actually told.
 */

import { shopBase } from '@/lib/appUrls';

/**
 * @param {'confirmed'|'rescheduled'|'cancelled'} kind
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function notifyCustomer(kind, appointment, extra = {}) {
  const key = process.env.EFD_ADMIN_API_KEY;
  if (!key) return { sent: false, reason: 'not-configured' };

  try {
    const res = await fetch(`${shopBase().replace(/\/$/, '')}/api/appointments/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-efd-admin-key': key },
      body: JSON.stringify({
        kind,
        appointmentID: appointment?.appointmentID || null,
        clientName: appointment?.clientName || '',
        clientEmail: appointment?.clientEmail || '',
        ...extra,
      }),
      // A slow shop must not hold the counter hostage.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { sent: false, reason: `http-${res.status}` };
    const json = await res.json().catch(() => ({}));
    return { sent: Boolean(json?.sent), reason: json?.reason };
  } catch (error) {
    console.error('appointment notification failed (non-fatal):', error?.message);
    return { sent: false, reason: 'unreachable' };
  }
}
