/**
 * S7b — Migrate legacy `customTickets` → new `customOrders` (+ embedded invoices → `customInvoices`).
 *
 * WHY: after cutover the legacy customs UI is gone, so legacy tickets (history + anything recorded
 * in prod's legacy system pre-cutover) would be orphaned. This lifts them into the new system so
 * they stay visible/billable. The legacy `customTickets` collection is NOT deleted — this is
 * additive + idempotent (safe to re-run; picks up newly-drained tickets each time).
 *
 * SAFETY / FIDELITY:
 *   - Historical financials are PRESERVED, not recomputed: we carry the legacy `quoteTotal` as-billed
 *     and do NOT run CustomOrdersModel.normalizeQuote (recompute could change past numbers if the
 *     markup/tax settings differ today).
 *   - Idempotent: keyed by `migratedFromTicketID`; a ticket already migrated is skipped.
 *   - Deterministic IDs: customID = `CO-mig-<ticketID>`, invoiceID = `INV-mig-<ticketID>-<idx>`.
 *   - DRY-RUN emits a landscape report (counts, distinct legacy statuses, quote shape, invoice totals,
 *     and any UNMAPPED statuses) so we finalize STATUS_MAP against real cloned-prod data before apply.
 *
 * Run (rehearsal, against the prod clone):
 *   MIGRATE_DB=efd-db-migrate node --env-file=.env.local scripts/migrations/s7b-customtickets-to-customorders.mjs --dry-run
 *   MIGRATE_DB=efd-db-migrate node --env-file=.env.local scripts/migrations/s7b-customtickets-to-customorders.mjs
 */
import { runMigration } from './_lib.mjs';

// Legacy ticket.status  →  CUSTOM_ORDER_STATUS.
// The bottom block is confirmed against real prod data (s7b dry-run on the prod clone, 2026-06-30).
const STATUS_MAP = {
  pending: 'pending',
  new: 'pending',
  consultation: 'consultation',
  'in-consultation': 'consultation',
  design: 'design',
  'in-design': 'design',
  quote: 'quote',
  quoted: 'quote',
  'quote-sent': 'quote',
  deposit: 'deposit',
  'deposit-paid': 'deposit',
  'in-progress': 'in_production',
  'in_production': 'in_production',
  production: 'in_production',
  qc: 'qc',
  completed: 'completed',
  complete: 'completed',
  delivered: 'delivered',
  'picked-up': 'delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  // --- confirmed present in prod customTickets ---
  sketching: 'design',            // early design phase
  'creating-cad': 'design',       // CAD in progress
  'ordering-materials': 'in_production', // materials ordered → production underway
  'final-payment-sent': 'completed',     // work done, final invoice issued
};

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

/** Assemble the new quote object from a legacy ticket (nested `quote` wins; else flat fields). */
function buildQuote(t) {
  const q = (t.quote && typeof t.quote === 'object') ? t.quote : t;
  return {
    centerstone: q.centerstone ?? { item: '', cost: 0 },
    mounting: q.mounting ?? { item: '', cost: 0 },
    accentStones: Array.isArray(q.accentStones) ? q.accentStones : [],
    additionalMaterials: Array.isArray(q.additionalMaterials) ? q.additionalMaterials : [],
    laborTasks: Array.isArray(q.laborTasks) ? q.laborTasks : [],
    shippingCosts: Array.isArray(q.shippingCosts) ? q.shippingCosts : [],
    isRush: !!(q.isRush ?? t.isRush),
    includeCustomDesign: !!(q.includeCustomDesign),
    castingCost: num(q.castingCost),
    designFee: num(q.designFee ?? q.customDesignFee),
    glbFee: num(q.glbFee),
    qcReviewFee: num(q.qcReviewFee),
    rushMultiplier: num(q.rushMultiplier) || 1,
    quotePublished: !!(q.quotePublished),
    publishedAt: q.publishedAt ?? null,
    // Legacy flat carry-overs.
    materialCosts: Array.isArray(q.materialCosts) ? q.materialCosts : [],
    laborCost: num(q.laborCost),
    shippingCost: num(q.shippingCost),
    // PRESERVE historical figures as-billed (no recompute).
    cog: num(q.cog),
    cogMarkup: num(q.cogMarkup),
    quoteTotal: num(q.quoteTotal ?? t.quoteTotal),
    taxRate: num(q.taxRate),
    taxAmount: num(q.taxAmount),
    total: num(q.total ?? q.quoteTotal ?? t.quoteTotal),
  };
}

function buildOrder(t) {
  const rd = t.requestDetails || {}; // legacy spec lives here (jewelryType/metal/size/gemstones/budget/timeline/specialRequests)
  const rawStatus = String(t.status || 'pending').trim();
  const status = STATUS_MAP[rawStatus] || STATUS_MAP[rawStatus.toLowerCase()] || 'pending';
  const assignments = Array.isArray(t.assignedArtisans)
    ? t.assignedArtisans.map((a, i) => ({
        id: `${t.ticketID}-asg-${i}`,
        userID: a.userId ?? a.userID ?? null,
        artisanType: a.artisanType ?? null,
        role: a.artisanType ?? null,
        feeSnapshot: num(a.fee ?? a.customDesignFee),
        assignedAt: a.assignedAt ? new Date(a.assignedAt) : null,
      }))
    : [];
  return {
    customID: `CO-mig-${t.ticketID}`,
    migratedFromTicketID: t.ticketID,
    clientID: t.clientID ?? t.userID ?? null,
    legacyUserID: t.userID ?? null, // legacy customer ref (does NOT resolve to `clients` — reconcile separately)
    customerName: t.customerName ?? '',
    customerEmail: t.customerEmail ?? '',
    customerPhone: t.customerPhone ?? '',
    title: t.title ?? '',
    description: t.description ?? '',
    type: t.type ?? 'custom-design',
    priority: t.priority ?? 'normal',
    isRush: !!t.isRush,
    status,
    legacyStatus: rawStatus,
    statusHistory: Array.isArray(t.statusHistory) && t.statusHistory.length
      ? t.statusHistory.map((h) => ({
          status: STATUS_MAP[String(h.status || '').toLowerCase()] || h.status,
          changedAt: h.changedAt ? new Date(h.changedAt) : (t.createdAt ? new Date(t.createdAt) : new Date()),
          changedBy: h.changedBy ?? null,
          reason: h.reason ?? 'migrated',
        }))
      : [{ status, changedAt: t.createdAt ? new Date(t.createdAt) : new Date(), changedBy: null, reason: 'migrated from customTickets' }],
    // Spec fields (legacy `requestDetails`, with top-level fallbacks).
    jewelryType: rd.jewelryType ?? t.jewelryType ?? null,
    metalType: rd.metalType ?? t.metalType ?? null,
    karat: rd.karat ?? t.karat ?? null,
    goldColor: rd.goldColor ?? t.goldColor ?? null,
    size: rd.size ?? t.size ?? t.ringSize ?? null,
    gemstones: Array.isArray(rd.gemstones) ? rd.gemstones : (Array.isArray(t.gemstones) ? t.gemstones : []),
    budget: rd.budget ?? t.budget ?? null,
    timeline: rd.timeline ?? t.timeline ?? null,
    dueDate: t.dueDate ? new Date(t.dueDate) : (t.estimatedCompletion ? new Date(t.estimatedCompletion) : null),
    specialRequests: rd.specialRequests ?? t.specialRequests ?? '',
    notes: Array.isArray(t.notes) ? t.notes : [],
    communications: Array.isArray(t.communications) ? t.communications : [],
    // referenceImages/moodBoard/designFiles + clientFeedback remain on the retained
    // customTickets doc (via migratedFromTicketID) — surfaced later once element shapes are wired.
    images: Array.isArray(rd.referenceImages) ? rd.referenceImages : [],
    assignments,
    designIDs: [],
    pieceIDs: [],
    quote: buildQuote(t),
    billing: t.billing ?? { mode: 'retail' },
    designModel: t.designModel ?? null,
    shareTitle: t.shareTitle ?? null,
    share: t.share ?? null,
    designLink: t.designLink ?? null, // legacy Shapr3D link (shown if no designModel)
    createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
    updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
    createdBy: t.createdBy ?? null,
  };
}

const INVOICE_STATUS_MAP = { paid: 'paid', pending: 'pending', unpaid: 'pending', partial: 'partial', refunded: 'refunded', void: 'void' };

function buildInvoices(t, customID) {
  if (!Array.isArray(t.invoices) || !t.invoices.length) return [];
  return t.invoices.map((inv, i) => ({
    invoiceID: `INV-mig-${t.ticketID}-${i}`,
    migratedFromTicketID: t.ticketID,
    customID,
    type: inv.type ?? (i === 0 ? 'deposit' : 'progress'),
    amount: num(inv.amount ?? inv.total),
    status: INVOICE_STATUS_MAP[String(inv.status || '').toLowerCase()] || 'pending',
    stripePaymentIntentId: inv.stripePaymentIntentId ?? inv.paymentIntentId ?? null,
    paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
    createdAt: inv.createdAt ? new Date(inv.createdAt) : (t.createdAt ? new Date(t.createdAt) : new Date()),
  }));
}

const steps = [
  {
    title: 'customTickets → customOrders (idempotent; preserves historical totals)',
    run: async ({ db, dryRun }) => {
      const tickets = await db.collection('customTickets').find({}).toArray();
      const orders = db.collection('customOrders');

      // Landscape (dry-run visibility): distinct statuses + any that STATUS_MAP misses.
      const statusCounts = {};
      const unmapped = new Set();
      let nested = 0, flat = 0, noQuote = 0;
      for (const t of tickets) {
        const s = String(t.status || 'pending').trim();
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        if (!STATUS_MAP[s] && !STATUS_MAP[s.toLowerCase()]) unmapped.add(s);
        if (t.quote && typeof t.quote === 'object') nested++;
        else if (t.centerstone || t.mounting || t.quoteTotal !== undefined) flat++;
        else noQuote++;
      }

      let migrated = 0, skipped = 0;
      if (!dryRun) {
        for (const t of tickets) {
          if (!t.ticketID) { skipped++; continue; }
          const exists = await orders.findOne({ migratedFromTicketID: t.ticketID }, { projection: { _id: 1 } });
          if (exists) { skipped++; continue; }
          await orders.insertOne(buildOrder(t));
          migrated++;
        }
      }

      const report = [
        `tickets=${tickets.length}`,
        `quoteShape{nested:${nested}, flat:${flat}, none:${noQuote}}`,
        `statuses=${JSON.stringify(statusCounts)}`,
        unmapped.size ? `⚠ UNMAPPED statuses (default→pending): ${[...unmapped].join(', ')}` : 'all statuses mapped',
      ].join(' | ');
      return dryRun
        ? `would migrate up to ${tickets.length} tickets → customOrders. ${report}`
        : `migrated ${migrated}, skipped ${skipped} (already migrated / no ticketID). ${report}`;
    },
  },
  {
    title: 'embedded ticket.invoices[] → customInvoices (idempotent)',
    run: async ({ db, dryRun }) => {
      const tickets = await db.collection('customTickets').find({ invoices: { $exists: true, $ne: [] } }).toArray();
      const invoicesCol = db.collection('customInvoices');
      let total = 0, migrated = 0, skipped = 0;
      for (const t of tickets) {
        const rows = buildInvoices(t, `CO-mig-${t.ticketID}`);
        total += rows.length;
        if (dryRun) continue;
        for (const row of rows) {
          const exists = await invoicesCol.findOne({ invoiceID: row.invoiceID }, { projection: { _id: 1 } });
          if (exists) { skipped++; continue; }
          await invoicesCol.insertOne(row);
          migrated++;
        }
      }
      return dryRun
        ? `would migrate ${total} embedded invoices across ${tickets.length} tickets → customInvoices`
        : `migrated ${migrated} invoices, skipped ${skipped} (already present)`;
    },
  },
];

runMigration({ name: 's7b-customtickets-to-customorders', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
