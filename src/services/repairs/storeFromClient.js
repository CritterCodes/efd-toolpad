/**
 * Which store does this repair belong to, when the ticket names one of the store's own customers?
 *
 * A store mails in an envelope. The shop keys it in. Where the piece carries an end customer that
 * customer is entered — a `clients` record with `parentWholesalerId` — and the ticket then names a
 * person, not a shop. The intake route only learned the store when the FORM sent `storeId`, so an
 * envelope keyed in this way carried no store at all.
 *
 * Measured in production on 2026-10-04: **198 of 292 wholesale repairs had no `storeName`**, every one
 * derivable this way; The Smith alone accounted for 135. Owner, same day: *"Whether they enter it or I
 * enter it, it needs to be attributed to the right people."*
 *
 * Returns '' rather than throwing. Attribution is worth getting right and never worth refusing intake
 * over — the caller falls through to its existing behaviour.
 */
export async function storeFromClient(dbInstance, userID) {
  const id = String(userID || '').trim();
  if (!id) return '';

  try {
    const client = await dbInstance.collection('clients').findOne(
      { $or: [{ clientID: id }, { userID: id }] },
      { projection: { _id: 0, parentWholesalerId: 1 } },
    );
    return client?.parentWholesalerId ? String(client.parentWholesalerId) : '';
  } catch (lookupError) {
    console.error('store-from-client resolution failed (non-fatal):', lookupError?.message);
    return '';
  }
}
