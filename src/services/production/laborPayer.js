/**
 * Labor payer scope + payee identity (PRODUCTION_RUNS.md §4.4, §4b — Connect-compat).
 *
 * Two Connect-compatibility fields ride every paying ledger row from day one so adopting Stripe
 * Connect later is a settlement swap, not a re-architecture:
 *  - `payer` (labor logs only): 'self' when the laborer IS the piece's owning artisan (solo work
 *     on their own piece — never payroll-payable, realized at sale), else 'efd' (EFD pays payroll
 *     and bills the owning artisan at completion). The rule is MECHANICAL — laborer == owning
 *     artisan → self, else efd.
 *  - `payeeUserID`: the per-artisan payee identity, defaulted from each model's existing payee
 *     field (labor: primaryJewelerUserID; sales: sellerUserID) so it's backfill-safe.
 *
 * The pure functions here take no DB and are unit-tested; `resolvePieceLaborScope` is the thin
 * impure wrapper the bench paths call (lazy model imports keep the pure surface DB-free).
 */

export const LABOR_PAYER = Object.freeze({ SELF: 'self', EFD: 'efd' });

/**
 * The artisan who OWNS a piece (whose ledger the piece's economics belong to). PURE.
 * An artisan-owned drop owns its pieces; otherwise the design's primary artisan; else nobody
 * (EFD-owned). Drop ownership wins because a run always lives under a drop.
 * @param {{ ownerType?: string, ownerId?: string }} drop
 * @param {{ primaryArtisanId?: string }} design
 * @returns {string|null} owning artisan userID, or null for EFD-owned
 */
export function owningArtisanForPiece({ drop = null, design = null } = {}) {
  if (drop && drop.ownerType === 'artisan' && drop.ownerId) return drop.ownerId;
  if (design && design.primaryArtisanId) return design.primaryArtisanId;
  return null;
}

/**
 * The mechanical payer rule. PURE. `self` only when there IS an owning artisan and the laborer
 * is that same person; every other case (outsourced, EFD-owned, repairs, unknown) → `efd`.
 */
export function resolveLaborPayer({ laborerUserID = null, owningArtisanUserID = null } = {}) {
  if (owningArtisanUserID && laborerUserID && laborerUserID === owningArtisanUserID) return LABOR_PAYER.SELF;
  return LABOR_PAYER.EFD;
}

/**
 * Resolve `{ payer, payeeUserID }` for labor on a PIECE work order. Impure (loads piece/design/
 * drop). Fails safe to EFD on any miss or error — never throws into the labor path. Only meaningful
 * for production_piece / custom_piece sources; callers on repair sources should not use it (repair
 * labor is always EFD and the model default covers it).
 */
export async function resolvePieceLaborScope({ pieceID, laborerUserID }) {
  const safe = { payer: LABOR_PAYER.EFD, payeeUserID: laborerUserID ?? null };
  if (!pieceID) return safe;
  try {
    const [{ default: PiecesModel }, { default: DesignsModel }, { default: DropsModel }] = await Promise.all([
      import('@/app/api/pieces/model'),
      import('@/app/api/designs/model'),
      import('@/app/api/drops/model'),
    ]);
    const piece = await PiecesModel.findById(pieceID);
    if (!piece) return safe;
    const [design, drop] = await Promise.all([
      piece.designID ? DesignsModel.findById(piece.designID) : null,
      piece.dropId ? DropsModel.findById(piece.dropId) : null,
    ]);
    const owningArtisanUserID = owningArtisanForPiece({ drop, design });
    return { payer: resolveLaborPayer({ laborerUserID, owningArtisanUserID }), payeeUserID: laborerUserID ?? null };
  } catch {
    return safe;
  }
}
