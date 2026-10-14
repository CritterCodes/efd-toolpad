/**
 * PAY OVER TIME — the admin machinery behind docs/manufacturing/PAY_OVER_TIME_CONTRACT.md.
 *
 * Everything a pay-over-time custom order needs that a full/deposit order does not:
 *   - price history + the paid-gate lock (a stage the customer has paid for never changes price);
 *   - the unpaid mounting following the metal market (owner ruling 2026-10-14, Q22: checked daily,
 *     re-priced only on a move of 5% or more, customer emailed);
 *   - the monthly payment clock: reminders a week and a day before, overdue on the first day past;
 *   - weekly stone-availability checks, recorded by staff and emailed to the customer;
 *   - the owner's list of over-time orders and this week's chores.
 *
 * Pure decisions live in paymentProgress.js (paymentClock, gateLadder, withProductionGate) and are
 * unit-tested there; this file is the I/O around them.
 */
import { db } from '@/lib/database';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import CustomInvoicesModel from '@/app/api/custom-orders/invoices/model';
import {
  computePaymentProgress, invoicesForOrder, withProductionGate, paymentClock, gateLadder,
} from '@/services/customs/paymentProgress';
import { estimateMetalCost } from '@/services/production/designCost';
import { NotificationService, notifyAllAdmins } from '@/lib/notificationService';
import { portalLink, adminLink } from '@/lib/appUrls';

export const REPRICE_THRESHOLD = 0.05; // Q22: re-price only when metal has moved 5% or more
export const STONE_CHECK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED = ['cancelled', 'completed', 'delivered'];

const money = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : '');
const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const orderName = (o) => o.title || o.quote?.mounting?.item || o.customID;

/* ------------------------------------------------------------------ pure helpers */

/** A price-history entry for the quote as it stands now. */
export function priceEntry(quote = {}, reason, at = new Date()) {
  const mountingGate = (quote.gates || []).find((g) => Number(g.n) === 2);
  return {
    at,
    reason,
    pricePerGram: quote.mounting?.metal?.pricePerGram ?? null,
    mountingGate: round(mountingGate?.amount),
    quoteTotal: round(quote.quoteTotal),
    taxAmount: round(quote.taxAmount),
    total: round(quote.total),
  };
}

/**
 * THE PAID-GATE LOCK. Returns the first gate whose amount would change although payments already
 * cover it, or null. A customer who paid for their stone at $2,600 has paid for it at $2,600; a
 * later quote edit (or a metal re-price) must not move that number under them.
 */
export function paidGateConflict(oldGates = [], newGates = [], totalPaid = 0) {
  const cents = (v) => Math.round((Number(v) || 0) * 100);
  let cumulative = 0;
  for (const g of oldGates || []) {
    cumulative += Number(g.amount) || 0;
    if (cents(totalPaid) < cents(cumulative)) break; // this gate and later ones aren't paid
    const next = (newGates || []).find((x) => Number(x.n) === Number(g.n));
    if (!next || cents(next.amount) !== cents(g.amount)) return g;
  }
  return null;
}

/** Does this order need a stone-availability check now? (contract §5) */
export function stoneCheckDue(order = {}, ladder = {}, now = new Date()) {
  const q = order.quote || {};
  if (order.payment?.path !== 'over-time' || CLOSED.includes(order.status)) return false;
  if (!q.quotePublished || !q.acceptedAt) return false;
  if (!(q.centerstone?.item || Number(q.centerstone?.cost) > 0)) return false;
  if (ladder.stoneGatePaid) return false;
  const sc = order.stoneCheck || {};
  if (sc.status === 'purchased') return false;
  if (!sc.checkedAt) return true;
  return new Date(now).getTime() - new Date(sc.checkedAt).getTime() >= STONE_CHECK_DAYS * DAY_MS;
}

/* ------------------------------------------------------------------ loading */

async function openOverTimeOrders(filter = {}) {
  const col = await CustomOrdersModel.collection();
  return col.find({
    'payment.path': 'over-time',
    status: { $nin: CLOSED },
    ...filter,
  }, { projection: { _id: 0 } }).toArray();
}

/** Everything the screens and crons need about one over-time order, from one invoice read. */
export function describeOrder(order, invoices, now = new Date()) {
  const mine = invoicesForOrder(invoices, order.customID);
  const projectTotal = order.quote?.total ?? order.quote?.quoteTotal ?? 0;
  const progress = withProductionGate(order, computePaymentProgress(projectTotal, mine));
  const ladder = gateLadder(order, progress.totalPaid);
  const clock = paymentClock(order, mine, { now, remaining: progress.remainingAmount });
  return { order, progress, ladder, clock, stoneDue: stoneCheckDue(order, ladder, now) };
}

/** The owner's view: every open over-time order, described, plus the chores they imply. */
export async function listOverTime({ now = new Date() } = {}) {
  const orders = await openOverTimeOrders();
  const invoices = await CustomInvoicesModel.listByCustomMany(orders.map((o) => o.customID));
  return orders.map((o) => {
    const d = describeOrder(o, invoices, now);
    return { ...d, chores: choresFor(d) };
  });
}

/** What the owner has to DO for this order, in priority order. */
export function choresFor({ order, progress, ladder, clock, stoneDue }) {
  const chores = [];
  const sc = order.stoneCheck || {};
  if (order.payment?.overdueSince || clock.overdue) {
    chores.push({ key: 'overdue', label: `Payment overdue since ${fmtDate(order.payment?.overdueSince || clock.dueBy)} — contact the client` });
  }
  if (sc.status === 'sold' && !ladder.stoneGatePaid) chores.push({ key: 'replace-stone', label: 'Stone sold — source a replacement and update the quote' });
  else if (stoneDue) chores.push({ key: 'check-stone', label: 'Check the stone is still available' });
  if (ladder.stoneGatePaid && sc.status !== 'purchased' && (order.quote?.centerstone?.item || Number(order.quote?.centerstone?.cost) > 0)) {
    chores.push({ key: 'buy-stone', label: 'Stone stage paid — buy the stone, then mark it bought' });
  }
  if (progress.readyForProduction && order.status === 'deposit') {
    chores.push({ key: 'start-production', label: 'Production stage paid — start production' });
  }
  if (!order.quote?.mounting?.metal && !ladder.mountingGatePaid && Number(order.quote?.mounting?.cost) > 0) {
    chores.push({ key: 'no-metal-snapshot', label: 'Mounting was typed by hand — it won\'t follow the metal market. Re-run Estimate on the quote.' });
  }
  return chores;
}

/* ------------------------------------------------------------------ price history + lock */

/** Append a price-history entry and stamp pricedAt. */
export async function recordPrice(customID, quote, reason, at = new Date()) {
  const col = await CustomOrdersModel.collection();
  await col.updateOne(
    { customID },
    { $push: { 'quote.priceHistory': priceEntry(quote, reason, at) }, $set: { 'quote.pricedAt': at } },
  );
}

/** Amount already paid toward an order (its share of paid invoices). */
export async function totalPaidFor(customID) {
  const invoices = await CustomInvoicesModel.listByCustom(customID);
  return computePaymentProgress(0, invoicesForOrder(invoices, customID)).totalPaid;
}

/* ------------------------------------------------------------------ metal re-pricing (Q22) */

async function liveMetalPrices() {
  const doc = await (await db.connect()).collection('metalPrices').findOne({});
  return {
    gold: Number(doc?.gold) || 0,
    silver: Number(doc?.silver) || 0,
    platinum: Number(doc?.platinum) || 0,
    palladium: Number(doc?.palladium) || 0,
  };
}

/**
 * Daily: an over-time order's UNPAID mounting follows the metal market. Re-priced only when the
 * per-gram price has moved ≥ 5% since it was last priced, so daily wobble never churns the number a
 * customer is saving toward; a real move is passed on and explained by email. A mounting typed by
 * hand (no `mounting.metal` snapshot) can't be re-priced and is left alone — the owner's list flags it.
 */
export async function repriceOverTimeMountings({ now = new Date(), dryRun = false } = {}) {
  const orders = await openOverTimeOrders({ 'quote.quotePublished': true, 'quote.mounting.metal': { $exists: true } });
  if (!orders.length) return { scanned: 0, repriced: [] };
  const prices = await liveMetalPrices();
  const invoices = await CustomInvoicesModel.listByCustomMany(orders.map((o) => o.customID));
  const repriced = [];

  for (const order of orders) {
    const q = order.quote || {};
    const metal = q.mounting?.metal;
    if (!q.acceptedAt || !metal?.metalKey || !(Number(metal.volumeCm3) > 0) || !(Number(metal.pricePerGram) > 0)) continue;
    const { ladder, progress } = describeOrder(order, invoices, now);
    if (ladder.mountingGatePaid) continue; // locked — the customer has paid for it

    let est;
    try {
      est = estimateMetalCost({ volumeCm3: Number(metal.volumeCm3), metalKey: metal.metalKey, metalPrices: prices });
    } catch (e) {
      console.error(`[reprice] ${order.customID}: ${e.message}`);
      continue;
    }
    if (!(est.pricePerGram > 0)) continue;
    const move = est.pricePerGram / Number(metal.pricePerGram) - 1;
    if (Math.abs(move) < REPRICE_THRESHOLD) continue;

    const before = { mountingGate: priceEntry(q).mountingGate, total: round(q.total) };
    const mounting = {
      ...q.mounting,
      cost: round(est.metalCost),
      metal: { ...metal, metalWeightG: est.metalWeightG, pricePerGram: est.pricePerGram, metalCost: round(est.metalCost), pricedAt: now },
    };
    const preview = await CustomOrdersModel.normalizeQuote({ ...q, mounting });
    const conflict = paidGateConflict(q.gates, preview.gates, progress.totalPaid);
    if (conflict) {
      console.error(`[reprice] ${order.customID}: would move paid gate "${conflict.name}" — skipped`);
      continue;
    }
    const after = { mountingGate: priceEntry(preview).mountingGate, total: round(preview.total) };
    repriced.push({ customID: order.customID, move: Math.round(move * 1000) / 10, before, after });
    if (dryRun) continue;

    const updated = await CustomOrdersModel.updateById(order.customID, { quote: { mounting } });
    await recordPrice(order.customID, updated.quote, 'metal-market', now);

    if (order.clientID) {
      const up = after.mountingGate > before.mountingGate;
      await NotificationService.createNotification({
        userId: order.clientID,
        type: 'custom-price-change',
        title: up ? 'Your mounting price has gone up' : 'Good news: your mounting price has come down',
        message: `The ${metal.metalKey.toLowerCase().includes('plat') ? 'platinum' : 'gold'} market has moved ${Math.abs(Math.round(move * 1000) / 10)}% since your mounting was priced, so the unpaid mounting on your custom piece is now ${money(after.mountingGate)} (was ${money(before.mountingGate)}). Your new total is ${money(after.total)}. Anything you've already paid for is unchanged, and the price locks for good once the mounting stage is paid.`,
        channels: ['inApp', 'email'],
        data: { customID: order.customID, actionUrl: portalLink(order.customID, 'quote'), actionLabel: 'See your quote' },
      }).catch((e) => console.error(`[reprice] notify ${order.customID} failed:`, e.message));
    }
  }
  return { scanned: orders.length, repriced };
}

/* ------------------------------------------------------------------ payment clock (rules §9, §17) */

/**
 * Daily: reminders 7 days and 1 day before each order's monthly due date — ONE digest email per
 * client covering all their orders (rules §17: per-order emails irritate exactly the customer trying
 * hardest) — and, on the first day past due, mark the order overdue, tell the client once and alert
 * the admins. A payment moves the due date forward; the next run clears `overdueSince`.
 * Forfeiture is never automatic: it is the owner's call.
 */
export async function runPaymentClock({ now = new Date(), dryRun = false } = {}) {
  const orders = await openOverTimeOrders({ 'quote.quotePublished': true });
  if (!orders.length) return { scanned: 0, reminders: 0, overdue: 0, cleared: 0 };
  const invoices = await CustomInvoicesModel.listByCustomMany(orders.map((o) => o.customID));
  const col = await CustomOrdersModel.collection();
  const digests = new Map(); // clientID → [{ order, clock, kind }]
  let overdue = 0;
  let cleared = 0;

  for (const order of orders) {
    const { clock, progress } = describeOrder(order, invoices, now);
    const set = {};
    const unset = {};
    if (!clock.dueBy) {
      if (order.payment?.overdueSince) { unset['payment.overdueSince'] = ''; cleared += 1; }
    } else {
      const dueIso = clock.dueBy.toISOString();
      const rem = order.payment?.reminders?.dueBy === dueIso ? order.payment.reminders : { dueBy: dueIso };
      if (order.payment?.reminders?.dueBy !== dueIso) set['payment.reminders'] = rem;
      const msLeft = clock.dueBy.getTime() - new Date(now).getTime();

      if (clock.overdue) {
        if (!order.payment?.overdueSince) set['payment.overdueSince'] = clock.dueBy;
        if (!rem.overdueSentAt) {
          set['payment.reminders.overdueSentAt'] = now;
          set['payment.reminders.dueBy'] = dueIso;
          overdue += 1;
          if (!dryRun) await notifyOverdue(order, clock, progress);
        }
      } else {
        if (order.payment?.overdueSince) { unset['payment.overdueSince'] = ''; cleared += 1; }
        const kind = msLeft <= DAY_MS ? (rem.daySentAt ? null : 'day') : msLeft <= 7 * DAY_MS ? (rem.weekSentAt ? null : 'week') : null;
        if (kind && order.clientID) {
          if (!digests.has(order.clientID)) digests.set(order.clientID, []);
          digests.get(order.clientID).push({ order, clock, kind, progress });
          set['payment.reminders.dueBy'] = dueIso;
          set[`payment.reminders.${kind}SentAt`] = now;
        }
      }
    }
    if (!dryRun && (Object.keys(set).length || Object.keys(unset).length)) {
      // `payment.reminders` (whole) and `payment.reminders.x` can't both be $set; the whole-object
      // reset only happens when dueBy changed, in which case write the sub-keys onto the fresh object.
      if (set['payment.reminders']) {
        const fresh = { ...set['payment.reminders'] };
        for (const k of Object.keys(set)) {
          if (k.startsWith('payment.reminders.')) { fresh[k.slice('payment.reminders.'.length)] = set[k]; delete set[k]; }
        }
        set['payment.reminders'] = fresh;
      }
      const ops = {};
      if (Object.keys(set).length) ops.$set = set;
      if (Object.keys(unset).length) ops.$unset = unset;
      await col.updateOne({ customID: order.customID }, ops);
    }
  }

  let reminders = 0;
  for (const [clientID, items] of digests) {
    reminders += 1;
    if (dryRun) continue;
    const soonest = items.reduce((a, b) => (a.clock.dueBy < b.clock.dueBy ? a : b));
    const lines = items.map(({ order, clock, progress }) => `• ${orderName(order)}: at least ${money(clock.minimumDue)} by ${fmtDate(clock.dueBy)} (balance ${money(progress.remainingAmount)})`).join('\n');
    await NotificationService.createNotification({
      userId: clientID,
      type: 'custom-payment-reminder',
      title: soonest.kind === 'day' ? 'Your monthly payment is due tomorrow' : 'Your monthly payment is due next week',
      message: `A friendly reminder to keep your custom ${items.length > 1 ? 'pieces' : 'piece'} on track:\n${lines}\n\nAny amount from $10 keeps ${items.length > 1 ? 'each order' : 'it'} in good standing, and more brings your piece closer.`,
      channels: ['inApp', 'email'],
      data: { customID: soonest.order.customID, actionUrl: portalLink(soonest.order.customID, 'overview'), actionLabel: 'Make a payment' },
    }).catch((e) => console.error(`[payment-clock] reminder to ${clientID} failed:`, e.message));
  }
  return { scanned: orders.length, reminders, overdue, cleared };
}

async function notifyOverdue(order, clock, progress) {
  if (order.clientID) {
    await NotificationService.createNotification({
      userId: order.clientID,
      type: 'custom-payment-overdue',
      title: 'Your monthly payment is overdue',
      message: `We haven't received a payment toward ${orderName(order)} since ${fmtDate(clock.lastPaymentAt || order.payment?.pathChosenAt)}. Any amount from ${money(clock.minimumDue)} brings it back into good standing. If something has changed, just reply and talk to us; we'd much rather work it out together.`,
      channels: ['inApp', 'email'],
      priority: 'high',
      data: { customID: order.customID, actionUrl: portalLink(order.customID, 'overview'), actionLabel: 'Make a payment' },
    }).catch((e) => console.error(`[payment-clock] overdue notice ${order.customID} failed:`, e.message));
  }
  await notifyAllAdmins({
    type: 'custom-payment-overdue-admin',
    title: `Pay-over-time order overdue: ${order.customID}`,
    message: `${orderName(order)} has had no payment since ${fmtDate(clock.lastPaymentAt || order.payment?.pathChosenAt)} (due ${fmtDate(clock.dueBy)}). Paid ${money(progress.totalPaid)} of ${money(progress.projectTotal)}. The client has been emailed. Under the terms, a fully paid stone is theirs to collect; other partial payments are forfeit — your call.`,
    relatedId: order.customID,
    actionUrl: adminLink(`/dashboard/customs/${order.customID}`),
    priority: 'high',
  });
}

/* ------------------------------------------------------------------ stone checks (rules §13) */

export const STONE_STATUSES = ['available', 'sold', 'purchased'];

/**
 * Staff record a stone check. 'available' / 'sold' email the client straight away — the owner asked
 * that the customer hear it as soon as it is confirmed. 'purchased' ends the checks (the stone is
 * bought and held for them) and tells the client too.
 */
export async function recordStoneCheck(customID, { status, note = '', by = null, now = new Date() } = {}) {
  if (!STONE_STATUSES.includes(status)) throw Object.assign(new Error(`status must be one of ${STONE_STATUSES.join(', ')}`), { code: 'BAD_REQUEST' });
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return null;
  const col = await CustomOrdersModel.collection();
  const entry = { status, at: now, by, note: String(note || '').slice(0, 500) };
  await col.updateOne({ customID }, {
    $set: { 'stoneCheck.status': status, 'stoneCheck.checkedAt': now, 'stoneCheck.checkedBy': by, updatedAt: now },
    $push: { 'stoneCheck.history': entry },
  });

  const stone = order.quote?.centerstone?.item || 'your stone';
  const copy = {
    available: { title: 'Good news: your stone is still available', message: `We checked today: ${stone} is still available. It isn't held until the stone stage is paid, so we'll keep checking every week and tell you either way.` },
    sold: { title: 'Your stone has sold', message: `We're sorry: ${stone} has sold to another buyer. We're finding you a comparable stone and will be in touch with options. Nothing you've paid is affected.` },
    purchased: { title: 'Your stone is secured', message: `Your stone stage is paid and we've bought ${stone}. It's secured and held for your piece.` },
  }[status];
  if (order.clientID) {
    await NotificationService.createNotification({
      userId: order.clientID,
      type: `custom-stone-${status}`,
      title: copy.title,
      message: note ? `${copy.message}\n\n${note}` : copy.message,
      channels: ['inApp', 'email'],
      data: { customID, actionUrl: portalLink(customID, 'overview'), actionLabel: 'View your project' },
    }).catch((e) => console.error(`[stone-check] notify ${customID} failed:`, e.message));
  }
  return CustomOrdersModel.findById(customID);
}

/* ------------------------------------------------------------------ weekly digest for the owner */

/** Monday: email the admins this week's pay-over-time chores. Silent when there's nothing to do. */
export async function sendWeeklyChores({ now = new Date(), dryRun = false } = {}) {
  const rows = (await listOverTime({ now })).filter((r) => r.chores.length);
  if (!rows.length) return { orders: 0, sent: false };
  const lines = rows.map((r) => `${r.order.customID} (${orderName(r.order)}):\n${r.chores.map((c) => `  • ${c.label}`).join('\n')}`).join('\n\n');
  if (!dryRun) {
    await notifyAllAdmins({
      type: 'custom-over-time-weekly',
      title: `Pay over time: ${rows.length} order${rows.length > 1 ? 's' : ''} need${rows.length > 1 ? '' : 's'} you this week`,
      message: lines,
      actionUrl: adminLink('/dashboard/customs/pay-over-time'),
      actionLabel: 'Open pay over time',
    });
  }
  return { orders: rows.length, sent: !dryRun };
}
