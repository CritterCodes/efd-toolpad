/**
 * Who may take in a wholesale ticket without naming the store's customer (owner, 2026-09-28).
 *
 * A store drops off a tray; the end customer is the STORE'S customer and the shop often never learns
 * the name. An admin may skip it — the server then keys the repair to the store itself. A wholesaler
 * filing their own repair may not, because that customer name is how they find the job in their portal.
 *
 * THE TRAP THIS EXISTS TO PREVENT. "Wholesale" means two different things in intake:
 *
 *   the TICKET is wholesale   — also true for an admin who arrived with a store preset
 *                               ("Another for <store>", a scanned tray)
 *   the VIEWER is a wholesaler — the session role, and the only thing that decides this rule
 *
 * The first shipped in place of the second, which took the "no client" option away on exactly the
 * path that needs it most: the button whose whole purpose is taking in another ticket for that store.
 * Both the stepped intake and the submit validation read this one function so they cannot drift apart.
 */

/** Is the "No client given — bill the store" option available at all? */
export function canSkipIntakeClient({ viewerIsWholesaler = false, ticketIsWholesale = false } = {}) {
  return !viewerIsWholesaler && !!ticketIsWholesale;
}

/** Has the client question been answered — by naming one, or by deliberately skipping it? */
export function intakeClientSettled({
  clientName = '',
  clientNotProvided = false,
  viewerIsWholesaler = false,
  ticketIsWholesale = false,
} = {}) {
  if (String(clientName || '').trim()) return true;
  return clientNotProvided === true && canSkipIntakeClient({ viewerIsWholesaler, ticketIsWholesale });
}
