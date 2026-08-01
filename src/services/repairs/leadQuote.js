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
 * A LEAD STAYS A LEAD UNTIL THE PIECE ARRIVES
 * -------------------------------------------
 * Accepting an estimate is not the same as handing over the jewellery. Nothing
 * can be worked on until the piece is physically on the counter, so acceptance
 * only records agreement — it does not create a repair or move the pipeline.
 * The conversion happens at drop-off: "Arrived" on Bench Day for a booked slot,
 * or "Dropped off" on the leads list for someone who just walks in.
 *
 * A quote's own lifecycle — drafted, sent, accepted, declined — is carried on
 * `repair.quote.status`. Introducing a "QUOTED" repair status would mean every
 * board, filter and report in admin silently gains a bucket it does not know
 * how to render.
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
import RepairsModel from '@/app/api/repairs/model';

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

const titleOf = (t) =>
  String(t?.title || t?.displayName || t?.name || t?.description || 'Repair work').slice(0, 160);

/**
 * Flatten a NewRepairForm submission into the lines a customer should read.
 *
 * The form thinks in tasks, materials and custom items; the customer just wants
 * to know what they are paying for. Fees are folded in as their own lines so the
 * emailed total always reconciles with the figure the jeweler saw — a quote
 * whose parts do not add up to its total is the fastest way to lose trust.
 */
export function itemsFromSubmission(submission = {}) {
  const lines = [];

  for (const t of submission.tasks || []) {
    lines.push({
      taskId: t?.sku || t?._id || null,
      sku: t?.sku ? String(t.sku).slice(0, 40) : null,
      title: titleOf(t),
      qty: Math.max(1, Number(t?.quantity) || 1),
      unitPrice: round2(t?.price ?? t?.retailPrice ?? 0),
    });
  }

  for (const m of submission.materials || []) {
    lines.push({
      taskId: null,
      sku: m?.sku ? String(m.sku).slice(0, 40) : null,
      title: titleOf(m),
      qty: Math.max(1, Number(m?.quantity) || 1),
      unitPrice: round2(m?.price ?? m?.retailPrice ?? 0),
    });
  }

  for (const c of submission.customLineItems || []) {
    if (!c?.description && !Number(c?.price)) continue;
    lines.push({
      taskId: null,
      sku: null,
      title: String(c?.description || 'Additional work').slice(0, 160),
      qty: Math.max(1, Number(c?.quantity) || 1),
      unitPrice: round2(c?.price ?? 0),
    });
  }

  if (Number(submission.rushFee) > 0) {
    lines.push({ taskId: null, sku: null, title: 'Rush service', qty: 1, unitPrice: round2(submission.rushFee) });
  }
  if (Number(submission.deliveryFee) > 0) {
    lines.push({ taskId: null, sku: null, title: 'Delivery', qty: 1, unitPrice: round2(submission.deliveryFee) });
  }
  if (Number(submission.taxAmount) > 0) {
    lines.push({ taskId: null, sku: null, title: 'Sales tax', qty: 1, unitPrice: round2(submission.taxAmount) });
  }

  return lines;
}

function sanitiseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && (i.title || i.taskId))
    .slice(0, 60)
    .map((i) => ({
      taskId: i.taskId ? String(i.taskId) : null,
      sku: i.sku ? String(i.sku).slice(0, 40) : null,
      title: String(i.title || 'Repair work').slice(0, 160),
      qty: Math.max(1, Math.min(Number(i.qty) || 1, 99)),
      unitPrice: Math.max(0, round2(i.unitPrice)),
    }));
}

/**
 * Save (or replace) the draft quote on a lead. Does not contact the customer.
 *
 * Accepts either an explicit `items` array or a whole NewRepairForm submission.
 * The submission is kept alongside the flattened lines so that when the piece is
 * finally dropped off, the repair can be created from exactly what was quoted
 * rather than rebuilt from memory.
 */
export async function saveQuote(repairID, { items, submission, note, createdBy }) {
  const db = await database.connect();
  const repair = await db.collection(REPAIRS).findOne({ repairID });
  if (!repair) throw new Error('Repair not found.');

  const clean = sanitiseItems(items?.length ? items : itemsFromSubmission(submission || {}));
  if (!clean.length) throw new Error('A quote needs at least one line.');

  // Keep the token across re-saves so a link already in someone's inbox still
  // works after the jeweler tweaks a price — the customer sees the new figure.
  const token = repair.quote?.token || crypto.randomBytes(32).toString('hex');

  const quote = {
    items: clean,
    // Trust the form's own total when we have it: it is what the jeweler saw,
    // and it accounts for rounding the flattened lines cannot reproduce exactly.
    total: Number(submission?.totalCost) > 0 ? round2(submission.totalCost) : quoteTotal(clean),
    submission: submission || repair.quote?.submission || null,
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
 * Accepting records agreement and nothing more. The lead stays a lead: we do not
 * have the piece yet, and a repair sitting in READY FOR WORK that nobody can
 * touch would clog the bench list and distort every promise date on the board.
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

/**
 * The piece arrived. Turn the lead into a real repair.
 *
 * This is the only place a lead becomes work. Accepting an estimate does not do
 * it, because agreeing a price is not the same as handing over the jewellery,
 * and a repair nobody can touch would clog the bench list and distort every
 * promise date on the board.
 *
 * When there is a quote, the repair is built from exactly what was quoted —
 * tasks, materials, custom lines and totals — so the bench works to the same
 * figure the customer agreed to rather than someone rebuilding it from memory.
 * Without a quote it is a plain status change, which is what the old Accept
 * button did and remains right for a lead nobody priced.
 *
 * GOES THROUGH RepairsModel, NOT THE DRIVER
 * -----------------------------------------
 * The bench does not read `repairs` — it reads the `workOrders` mirror, and a
 * repair only appears there once WorkOrdersModel.syncFromRepair has run.
 * RepairsModel.updateById does that for us. Writing to the collection directly
 * (as this first did) sets the status correctly and still leaves the job
 * invisible to every jeweler, which is the worst kind of failure: the record
 * looks right and the work never happens.
 */
export async function convertLeadToRepair(repairID, { status = 'READY FOR WORK', promiseDate = null } = {}) {
  const db = await database.connect();
  const repair = await db.collection(REPAIRS).findOne({ repairID });
  if (!repair) throw new Error('Lead not found.');

  const set = { status, droppedOffAt: new Date(), updatedAt: new Date() };
  const submission = repair.quote?.submission;

  if (submission) {
    // Identity and history stay with the lead record. Everything else is the
    // priced work, and that is what we want on the repair.
    const {
      _id, repairID: _rid, quote: _q, status: _s, createdAt: _c, ...priced
    } = submission;
    Object.assign(set, priced);
    set.status = status;
    set.quotedTotal = repair.quote.total;
  }

  // Quotes deliberately carry no promise date — nothing could be promised
  // before the piece existed on the counter. This is where it gets set.
  if (promiseDate) set.promiseDate = promiseDate;

  await RepairsModel.updateById(repairID, set);
  return { repairID, status: set.status, fromQuote: Boolean(submission) };
}
