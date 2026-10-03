/**
 * Who gets "We received your repair request", and who does not.
 *
 * The acknowledgement is for **a person who sent work in and is now waiting to hear back**. It is one
 * email per ticket, which is right for a walk-in with one repair and wrong for everybody else:
 *
 * - **A store.** Marlen Jewelers has 21 of these acknowledgements against its account; on 2026-08-25 one
 *   account had **21 repairs entered in a single day**. One email per ticket is 21 emails in a batch, to
 *   a partner who already watches the same jobs in their portal. They never arrived before only because
 *   the address was missing — fixing that (#290) would have turned a silent failure into a mailbox full.
 * - **The shop itself.** A repair written up at the counter has the shop's own account on it, so the
 *   admin who typed it gets told that they received it. The admin ALERT in this same route already
 *   refuses to do that — *"emailing every admin about intake they just did themselves was pure noise"* —
 *   and the customer ack deserves the same rule when the "customer" is us.
 *
 * **The signal is the recipient's ROLE, not `repair.isWholesale`.** That flag is unreliable: of five
 * wholesale accounts with repairs in production, only Marlen's 21 carry it — Rocky's Corner (21), The
 * Smith (48), Cooper's Coin and Pawn (17) and Diamonds Plus (11) have it on **none** of theirs. Gating on
 * the flag would have left four stores being emailed per ticket.
 */

/** Roles that work here. The shop does not email itself about its own intake. */
const INTERNAL = new Set(['admin', 'superadmin', 'dev', 'artisan', 'senior-artisan', 'staff']);

/** Roles that get the portal instead of a per-ticket email. */
const TRADE = new Set(['wholesaler']);

/**
 * Should the per-ticket acknowledgement be sent?
 *
 * @param {object} args
 * @param {string|null} args.recipientRole role of the account the ack is addressed to, if any
 * @param {string|null} args.recipientID   account the ack is addressed to
 * @param {string}      args.recipientEmail address carried on the repair, if any
 * @param {string|null} args.createdByID   who entered the repair
 */
export function shouldSendLeadAck({ recipientRole = null, recipientID = null, recipientEmail = '', createdByID = null } = {}) {
  // Nothing to address it to at all.
  if (!recipientID && !recipientEmail) return false;

  // You do not need telling that you received the thing you just typed in.
  if (recipientID && createdByID && recipientID === createdByID) return false;

  if (recipientRole && INTERNAL.has(recipientRole)) return false;
  if (recipientRole && TRADE.has(recipientRole)) return false;

  return true;
}

export const LEAD_ACK_INTERNAL_ROLES = INTERNAL;
export const LEAD_ACK_TRADE_ROLES = TRADE;
