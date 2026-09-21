/**
 * The ONE way to name a wholesale account.
 *
 * A wholesaler's user document carries the business name in two rival places: `business` (set by
 * some registration paths) and `wholesaleApplication.businessName` (what the admin wholesaler page
 * edits, and what the portal shows). Greers Pawn had only the latter, so the repair form's store list
 * fell through to `firstName lastName` and 20 repairs + 7 invoices were keyed as
 * `wholesale-business:sam-johnson` — the contact's name — which also meant the account key never
 * matched the portal login and shipping/invoice notifications resolved to nobody (2026-09-21).
 *
 * Prefer the application name, then `business`, then anything else, then the person — and only as
 * a last resort. Pure.
 */
const s = (v) => String(v ?? '').trim();

export function wholesalerBusinessName(user = {}, fallback = '') {
  return s(user?.wholesaleApplication?.businessName)
    || s(user?.business)
    || s(user?.businessName)
    || s(user?.name)
    || [s(user?.firstName), s(user?.lastName)].filter(Boolean).join(' ')
    || s(fallback);
}

/** True when a proposed store/business name is really just the contact's personal name. */
export function looksLikePersonName(name, user = {}) {
  const person = [s(user?.firstName), s(user?.lastName)].filter(Boolean).join(' ').toLowerCase();
  return !!person && s(name).toLowerCase() === person;
}
