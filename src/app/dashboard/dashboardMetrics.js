/**
 * What the home page should actually say.
 *
 * Owner, 2026-10-13, looking at the live dashboard: "it says we have 721 active repairs and 80% of
 * total volume completed... 20% of 700 is a lot of jobs." And: "I never use or look at any of these
 * numbers... This month, this week, or just any sort of numbers that pertain to what we're actually
 * doing would be more relevant."
 *
 * He was right to be suspicious. Measured in production the same day:
 *
 *   "Active repairs: 721"  was `repairs.length` — EVERY repair ever recorded.
 *       541 PAID_CLOSED, 134 spam, 2 lead, 20 delivery-batched, 14 ready for pickup.
 *       Genuinely open on the bench: TEN.
 *
 *   "80% of total repair volume completed" was completed ÷ that same total. The missing 20% was
 *       146 repairs, 136 of them SPAM. It could only ever drift toward 100% as history piled up,
 *       and it counted junk in the denominator, so it was wrong in both directions at once.
 *
 * These helpers are pure and exported so they can be tested without a browser or a database.
 */

/** Records that are not repairs. Intake creates them from web form junk; they have no tasks. */
export const JUNK_STATUSES = Object.freeze(['spam', 'lead']);

/** Work that has left the bench — finished, waiting to go out, or gone. */
export const FINISHED_STATUSES = Object.freeze([
  'COMPLETED', 'READY FOR PICKUP', 'READY FOR PICK-UP', 'DELIVERY BATCHED', 'PAID_CLOSED',
]);

/** Work that is still ours to do. */
export const OPEN_STATUSES = Object.freeze([
  'RECEIVING', 'READY FOR WORK', 'IN PROGRESS', 'QC', 'QUALITY CONTROL', 'quality-control',
  'NEEDS PARTS', 'PARTS ORDERED', 'PENDING PICKUP', 'PICKUP REQUESTED',
]);

const statusOf = (r) => String(r?.status || '');
export const isJunk = (r) => JUNK_STATUSES.includes(statusOf(r));
export const isFinished = (r) => FINISHED_STATUSES.includes(statusOf(r));

/** A real repair: not spam, not a lead. Everything below counts only these. */
export const realRepairs = (repairs = []) => repairs.filter((r) => !isJunk(r));

/** On the bench right now — the number that changes day to day. */
export const openRepairs = (repairs = []) => realRepairs(repairs).filter((r) => !isFinished(r));

/** Past its promise date and still not finished. The only count worth going red over. */
export const overdueRepairs = (repairs = [], now = new Date()) => openRepairs(repairs).filter((r) => (
  r.promiseDate && new Date(r.promiseDate) < now
));

/** Finished and sitting on the shelf waiting for the customer. */
export const awaitingPickup = (repairs = []) => realRepairs(repairs).filter((r) => (
  ['READY FOR PICKUP', 'READY FOR PICK-UP'].includes(statusOf(r))
));

/** Who the ticket is for. `customerName` has never existed on a repair — it is `clientName`, and
 *  for a store's work the store is the name that matters. All 721 rows said "Unknown Customer". */
export const repairDisplayName = (repair) => (
  repair?.clientName
  || repair?.storeName
  || repair?.businessName
  || 'No customer on ticket'
);

/** The home page's headline numbers, from the repairs the page already has. */
export function buildBenchSummary(repairs = [], now = new Date()) {
  const real = realRepairs(repairs);
  const open = openRepairs(repairs);
  const overdue = overdueRepairs(repairs, now);
  const pickup = awaitingPickup(repairs);

  const byStatus = {};
  for (const r of open) {
    const key = statusOf(r) || 'UNKNOWN';
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  return {
    openCount: open.length,
    overdueCount: overdue.length,
    awaitingPickupCount: pickup.length,
    realCount: real.length,
    junkCount: repairs.length - real.length,
    openByStatus: byStatus,
    /** "7 ready for work · 3 in progress" — what the bench actually looks like. */
    openSummary: Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([status, n]) => `${n} ${status.toLowerCase()}`)
      .join(' · '),
  };
}

/**
 * What the job IS, in a few words. The tasks on the ticket say it best ("Size Down · Rhodium
 * Plating"); `description` is often a whole AI-written paragraph about the piece, so it is the last
 * resort and gets cut short rather than swallowing the row.
 */
export function repairSummaryLine(repair, maxLength = 64) {
  const titles = (repair?.tasks || []).map((t) => t?.title).filter(Boolean);
  if (titles.length) {
    const joined = titles.slice(0, 2).join(' · ');
    return titles.length > 2 ? `${joined} +${titles.length - 2}` : joined;
  }
  const text = String(repair?.repairType || repair?.description || '').trim();
  if (!text) return 'Repair';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/** Five most recently touched real repairs, named properly. */
export function recentRepairActivity(repairs = [], limit = 5) {
  return realRepairs(repairs)
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
    .map((repair) => ({
      id: repair.repairID || repair._id,
      customerName: repairDisplayName(repair),
      status: repair.status,
      updatedAt: repair.updatedAt,
      type: repairSummaryLine(repair),
    }));
}
