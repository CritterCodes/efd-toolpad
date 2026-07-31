/**
 * Quoting a repair lead.
 *
 * WHY THIS EXISTS
 * ---------------
 * A lead's only action was "Accept", which jumped it straight to READY FOR WORK
 * with no price ever agreed. NEEDS QUOTE existed as a status but nothing set it
 * and nothing acted on it. So every web lead was either worked without a price
 * or chased by phone off-system.
 *
 * WHY THE REPAIR STATUS DOES NOT CHANGE
 * -------------------------------------
 * A quote has its own lifecycle — drafted, sent, accepted, declined — and that
 * does not map onto the repair pipeline. Introducing a "QUOTED" repair status
 * would mean every board, filter and report in admin silently gains a bucket it
 * does not know how to render. So the repair stays `lead` until the customer
 * accepts, and `repair.quote.status` carries the rest. Acceptance moves it to
 * READY FOR WORK, exactly what the old Accept button did.
 *
 * PRICES ARE ESTIMATES
 * --------------------
 * Nobody has seen the piece when a web quote goes out. Line prices come from the
 * catalogue but stay editable, because a jeweler reading a photo knows things
 * the task list does not, and the customer-facing copy says subject to
 * inspection throughout.
 */

import crypto from 'node:crypto';
import { db as database } from '@/lib/database';
import { REPAIR_STATUS } from '@/services/repairWorkflow';

const REPAIRS = 'repairs';

/**
 * How long an emailed quote stays acceptable.
 *
 * Metal moves and the catalogue changes. A link that still buys an 18k sizing at
 * last quarter's gold price is a liability, and an unbounded token is one more
 * thing that never expires sitting in an inbox.
 */
export const QUOTE_TTL_DAYS = 30;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Total the lines. Quantity defaults to 1 so a malformed line can't zero the bill. */
export function quoteTotal(items = []) {
  return round2(
    items.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * (Number(i.qty) || 1), 0)
  );
}

function sanitiseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && (i.title || i.taskId))
    .slice(0, 40)
    .map((i) => ({
      taskId: i.taskId ? String(i.taskId) : null,
      sku: i.sku ? String(i.sku).slice(0, 40) : null,
      title: String(i.title || 'Repair work').slice(0, 160),
      qty: Math.max(1, Math.min(Number(i.qty) || 1, 99)),
      unitPrice: Math.max(0, round2(i.unitPrice)),
    }));
}

/** Save (or replace) the draft quote on a lead. Does not contact the customer. */
export async function saveQuote(repairID, { items, note, createdBy }) {
  const db = await database.connect();
  const repair = await db.collection(REPAIRS).findOne({ repairID });
  if (!repair) throw new Error('Repair not found.');

  const clean = sanitiseItems(items);
  if (!clean.length) throw new Error('A quote needs at least one line.');

  // Keep the token across re-saves so a link already in someone's inbox still
  // works after the jeweler tweaks a price — the customer sees the new figure.
  const token = repair.quote?.token || crypto.randomBytes(32).toString('hex');

  const quote = {
    items: clean,
    total: quoteTotal(clean),
    note: String(note || '').slice(0, 600),
    status: repair.quote?.status === 'accepted' ? 'accepted' : 'draft',
    token,
    createdBy: createdBy || repair.quote?.createdBy || null,
    createdAt: repair.quote?.createdAt || new Date(),
    updatedAt: new Date(),
    sentAt: repair.quote?.sentAt || null,
    acceptedAt: repair.quote?.acceptedAt || null,
    declinedAt: repair.quote?.declinedAt || null,
  };

  await db.collection(REPAIRS).updateOne({ repairID }, { $set: { quote, updatedAt: new Date() } });
  return quote;
}

/**
 * Mark the quote as sent and stamp its expiry.
 *
 * The actual email is the caller's job — it goes through efd-shop, where the
 * templates live — so this stays a pure state change and can be retried without
 * sending twice.
 */
export async function markQuoteSent(repairID) {
  const db = await database.connect();
  const repair = await db.collection(REPAIRS).findOne({ repairID });
  if (!repair?.quote) throw new Error('There is no quote to send.');
  if (!repair.quote.items?.length) throw new Error('A quote needs at least one line.');

  // Re-sending an accepted quote would let the customer decline something they
  // already agreed to, leaving the repair sitting in READY FOR WORK against a
  // declined estimate. If a price has to move after acceptance that is a phone
  // call, not a silent second quote.
  if (repair.quote.status === 'accepted') {
    throw new Error('This estimate was already accepted — call the customer if the price needs to change.');
  }

  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + QUOTE_TTL_DAYS * 86_400_000);

  await db.collection(REPAIRS).updateOne(
    { repairID },
    {
      $set: {
        'quote.status': 'sent',
        'quote.sentAt': sentAt,
        'quote.expiresAt': expiresAt,
        'quote.updatedAt': sentAt,
        updatedAt: sentAt,
      },
    }
  );

  return { ...repair.quote, status: 'sent', sentAt, expiresAt };
}

/**
 * Look a quote up by its emailed token.
 *
 * Returns why it is unusable rather than a bare null, because the customer-
 * facing page has to say something better than "not found" to someone clicking
 * a link we sent them.
 */
export async function findQuoteByToken(token) {
  if (!token || String(token).length < 32) return { ok: false, reason: 'invalid' };

  const db = await database.connect();
  const repair = await db.collection(REPAIRS).findOne({ 'quote.token': String(token) });
  if (!repair) return { ok: false, reason: 'invalid' };

  const quote = repair.quote;
  if (quote.status === 'accepted') return { ok: false, reason: 'already-accepted', repair, quote };
  if (quote.status === 'declined') return { ok: false, reason: 'declined', repair, quote };
  if (quote.status !== 'sent') return { ok: false, reason: 'not-sent' };
  if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
    return { ok: false, reason: 'expired', repair, quote };
  }

  return { ok: true, repair, quote };
}

/**
 * The customer answered.
 *
 * Accepting is the moment a lead becomes work, so it moves the repair to READY
 * FOR WORK — the same destination the old Accept button used, reached with a
 * price both sides agreed to.
 *
 * The update is guarded on the quote still being `sent`, so two taps on the
 * email link cannot accept twice or resurrect a quote that was just declined.
 */
export async function respondToQuote(token, { accept, name }) {
  const found = await findQuoteByToken(token);
  if (!found.ok) return found;

  const db = await database.connect();
  const now = new Date();
  const repairID = found.repair.repairID;

  const result = await db.collection(REPAIRS).updateOne(
    { repairID, 'quote.token': String(token), 'quote.status': 'sent' },
    {
      $set: accept
        ? {
            'quote.status': 'accepted',
            'quote.acceptedAt': now,
            'quote.acceptedBy': String(name || '').slice(0, 120) || null,
            status: REPAIR_STATUS.READY_FOR_WORK,
            updatedAt: now,
          }
        : {
            'quote.status': 'declined',
            'quote.declinedAt': now,
            updatedAt: now,
          },
    }
  );

  if (result.matchedCount === 0) return { ok: false, reason: 'already-answered' };
  return { ok: true, repair: found.repair, quote: found.quote, accepted: Boolean(accept) };
}
