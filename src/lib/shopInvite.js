/**
 * Account-claim invites via the shop — the admin side of the seam specced in
 * efd-shop docs/ACCOUNT-CLAIM-INVITES.md.
 *
 * Admin creates clients with no password; the shop's claim flow (set-password
 * link, completing it also verifies) is how they get in. The shop owns the
 * endpoint: POST {shop}/api/auth/invite, authenticated with the existing
 * admin↔shop shared secret. It is SAFE TO FIRE UNCONDITIONALLY — a user who
 * already has a password gets { alreadyClaimed: true } and no email, and the
 * shop rate-limits per address (3/24h), so double-fired hooks can't spam.
 *
 * reason picks the email copy: 'account' (client created — "our studio set up
 * an account for your custom work") | 'quote' (quote published — "set your
 * password, view your quote, choose how you'd like to pay").
 *
 * Best-effort BY CONTRACT: never throws, never blocks the caller's save.
 * Await it inside an existing best-effort block (serverless freezes in-flight
 * work once the response is sent, so un-awaited fires can be silently killed).
 */
import { shopBase } from '@/lib/appUrls';

export async function sendShopAccountInvite(userID, reason = 'account') {
  if (!userID) return { sent: false, skipped: 'no-user' };
  const key = process.env.EFD_PRICING_KEY;
  if (!key) {
    console.warn('[shopInvite] EFD_PRICING_KEY unset — account-claim invite skipped');
    return { sent: false, skipped: 'no-key' };
  }
  try {
    const res = await fetch(`${shopBase()}/api/auth/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-efd-internal-key': key },
      body: JSON.stringify({ userID, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[shopInvite] ${reason} invite for ${userID} → ${res.status}: ${data?.error ?? ''}`);
      return { sent: false, status: res.status };
    }
    console.log(`[shopInvite] ${reason} invite for ${userID}: sent=${!!data.sent}${data.alreadyClaimed ? ' (already claimed)' : ''}`);
    return { sent: !!data.sent, alreadyClaimed: !!data.alreadyClaimed };
  } catch (e) {
    console.warn(`[shopInvite] ${reason} invite for ${userID} failed: ${e.message}`);
    return { sent: false, error: e.message };
  }
}
