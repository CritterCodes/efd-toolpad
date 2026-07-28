import { db } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import CastingBatchesModel, { CASTING_STATUS } from '@/app/api/castingBatches/model';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import {
  composeMetalKey, finishLabel, finishUsesKarat, FINISH_OPTIONS, KARAT_OPTIONS,
} from '@/services/production/variantMetal';

/**
 * Carrera (vendor) casting orders — placed by EMAILING our account manager, DROP-SHIPPED direct to
 * the artisan (PRODUCTION_RUNS.md §4.1; casting WOs were scrapped 2026-07-24 — Carrera is the only
 * casting path).
 *
 * Two failure modes this module exists to prevent, both from real experience:
 *  1. **MISSHIP** — a drop-ship went to the owner instead of the intended artisan. So the ship-to is
 *     resolved from the artisan's profile, HARD-VALIDATED (never partially filled), rendered
 *     prominently in the email, and SNAPSHOTTED onto the order record as proof of what we requested.
 *  2. **WRONG METAL** — `piece.metalType`/`karat` are NULL on run-minted pieces (buildPieceDoc sets
 *     them null), so the authoritative metal spec is the DESIGN VARIANT's `finish` + `karat` via
 *     variantMetal. We never silently default a finish (deriveFinish falls back to gold — wrong
 *     failure mode on a metal order); an undetermined metal HARD-FAILS the order.
 */

export class CastingOrderError extends Error {}

// ── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Validate + freeze an artisan's ship-to from their `artisanApplication` business address. PURE.
 * Every line except country is REQUIRED — a partial address is how parcels get misrouted.
 */
export function validateShipTo(app = {}, { name = null } = {}) {
  // Coerce THEN trim every field — a whitespace-only addressee is a blank addressee (the worst
  // misdelivery shape: a street address with nobody's name on it), and a numeric ZIP from a JSON
  // profile save must not blow up with `.trim is not a function`.
  // Strings only for name/address fields — objects/arrays/booleans coerce to junk like
  // "[object Object]" or "," and a NUMBER would address a parcel to "7". Only the ZIP may be numeric
  // (a JSON profile save can send 72901 unquoted).
  const str = (v) => (typeof v === 'string' ? (v.trim() || null) : null);
  // A NUMERIC zip has already lost its leading zero (02134 parses as 2134), so restore it — every
  // MA/RI/NH/ME/VT/NJ/PR zip is 0-leading and a JSON profile save is exactly this path.
  const zipStr = (v) => {
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return String(v).padStart(5, '0');
    return typeof v === 'string' ? (v.trim() || null) : null;
  };
  const shipTo = {
    name: str(name) || str(app.businessName),
    businessName: str(app.businessName),
    address: str(app.businessAddress) || '',
    city: str(app.businessCity) || '',
    state: str(app.businessState) || '',
    zip: zipStr(app.businessZip) || '',
    // Defaulted (the profile stores US-shaped addresses and the form defaults to United States), but
    // the ASSUMPTION is flagged so a foreign address stamped "United States" is auditable in the
    // order snapshot rather than silent. Artisans can set a real country on their profile.
    country: str(app.businessCountry) || 'United States',
    countryAssumed: !str(app.businessCountry),
  };
  const errors = [];
  if (!shipTo.name) errors.push('recipient name (or business name)');
  if (!shipTo.address) errors.push('street address');
  if (!shipTo.city) errors.push('city');
  if (!shipTo.state) errors.push('state');
  if (!shipTo.zip) errors.push('ZIP');
  return { ok: errors.length === 0, errors, shipTo: Object.freeze(shipTo) };
}

/** One-line human rendering of a ship-to (for the email + audit). PURE. */
export function formatShipTo(shipTo = {}) {
  return [shipTo.name, shipTo.address, `${shipTo.city}, ${shipTo.state} ${shipTo.zip}`, shipTo.country]
    .filter(Boolean).join(' · ');
}

/**
 * Validate a variant's metal spec against the real vocabulary and return the order's metal. PURE.
 * Everything here HARD-FAILS rather than guessing, because every guess becomes a real casting in the
 * wrong alloy: an unset finish, a finish outside FINISH_OPTIONS, a gold-family finish with no karat
 * (composeMetalKey would silently assume 14K), or a karat outside KARAT_OPTIONS.
 */
export function validateVariantMetal(variant = {}) {
  const finish = variant.finish || null;
  if (!finish) return { ok: false, error: 'no metal finish set — set the variant’s finish/karat before ordering' };
  if (!FINISH_OPTIONS.some((f) => f.value === finish)) {
    return { ok: false, error: `unsupported metal finish "${finish}" (expected one of ${FINISH_OPTIONS.map((f) => f.value).join(', ')})` };
  }
  if (finishUsesKarat(finish)) {
    if (!variant.karat) return { ok: false, error: `${finishLabel(finish)} needs a karat — none is set` };
    if (!KARAT_OPTIONS.includes(String(variant.karat))) {
      return { ok: false, error: `unsupported karat "${variant.karat}" for ${finishLabel(finish)} (expected ${KARAT_OPTIONS.join('/')})` };
    }
  }
  return {
    ok: true,
    metalKey: composeMetalKey(finish, variant.karat),
    metalLabel: [finishUsesKarat(finish) ? `${variant.karat}K` : null, finishLabel(finish)].filter(Boolean).join(' '),
  };
}

/** The human metal spec for a variant, or null when it can't be determined. PURE. */
export function variantMetalLabel(variant = {}) {
  const res = validateVariantMetal(variant);
  return res.ok ? res.metalLabel : null;
}

/**
 * Group a batch's pieces into ORDER LINES — one line per variant/metal with a quantity, so the
 * caster can't collapse a multi-metal order into one alloy (PRODUCTION_RUNS.md §4.1). PURE.
 * Returns `{ lines, errors }`; a variant that's missing or has no determinable metal is an ERROR,
 * never a defaulted line.
 */
export function buildOrderLines(pieces = [], design = {}) {
  const variantById = new Map((design.variants || []).map((v) => [v.variantId, v]));
  const byGroup = new Map();
  const errors = [];

  for (const piece of pieces) {
    const variant = variantById.get(piece.variantId);
    if (!variant) { errors.push(`piece ${piece.pieceID}: variant ${piece.variantId} not on the design`); continue; }
    const metal = validateVariantMetal(variant);
    if (!metal.ok) { errors.push(`variant ${piece.variantId}: ${metal.error}`); continue; }
    // The PIECE's resolved ring size wins over the variant's nominal — two pieces of one variant in
    // different sizes must be TWO order lines, never merged into one (a caster can't cast "size 7×2"
    // when one is a 6.5 and one an 8.25). Group by variant + size.
    // `??` alone would let an EMPTY resolved size shadow a good nominal one (shipping a ring line
    // with no size) — treat blank as absent.
    const size = (v) => (String(v ?? '').trim() || null);
    const ringSize = size(piece.resolvedConfiguration?.ringSize) ?? size(piece.ringSize) ?? size(variant.ringSize);
    const key = `${piece.variantId}::${ringSize ?? '-'}`;
    const cur = byGroup.get(key) || {
      variantId: piece.variantId,
      sku: variant.sku || null,
      metalKey: metal.metalKey,
      metalLabel: metal.metalLabel,
      ringSize,
      qty: 0,
      pieceIDs: [],
      editionNumbers: [],
    };
    cur.qty += 1;
    cur.pieceIDs.push(piece.pieceID);
    if (piece.editionNumber != null) cur.editionNumbers.push(piece.editionNumber);
    byGroup.set(key, cur);
  }
  return { lines: [...byGroup.values()], errors };
}

// ── Impure ──────────────────────────────────────────────────────────────────

/**
 * The casting vendor config (who the order email goes to). Settings first (`castingVendor`), env
 * fallback so it's usable before a settings UI exists. Never throws.
 */
export async function getCastingVendorConfig() {
  let fromSettings = null;
  try {
    const settings = await SettingsManagerService.getSettings();
    fromSettings = settings?.castingVendor || null;
  } catch { /* fall through to env */ }
  const cfg = {
    name: fromSettings?.name || process.env.CASTING_VENDOR_NAME || 'Carrera',
    email: fromSettings?.email || process.env.CASTING_VENDOR_EMAIL || '',
    accountManager: fromSettings?.accountManager || process.env.CASTING_VENDOR_CONTACT || '',
    cc: Array.isArray(fromSettings?.cc) && fromSettings.cc.length
      ? fromSettings.cc
      : (process.env.CASTING_VENDOR_CC ? process.env.CASTING_VENDOR_CC.split(',').map((s) => s.trim()).filter(Boolean) : []),
  };
  return cfg;
}

/**
 * WHO the parcel ships to — the guard against the real incident (a drop-ship that landed on EFD
 * instead of the artisan). `batch.ownerId` alone is NOT trustworthy: the create route defaults it to
 * the CALLER's userID, so staff opening a batch for someone else's pieces silently becomes the
 * recipient. Three independent sources are cross-checked and **any disagreement, or any source that
 * won't resolve, REFUSES the order** — we never guess an address.
 *   1. the run's `createdBy` (authoritative when the batch has a runId)
 *   2. the pieces' own `createdBy` (every run-minted piece carries it) — catches the no-runId case
 *   3. `batch.ownerId` (only trusted when nothing contradicts it)
 * The owner casting his OWN run still works: all sources agree on him.
 */
export async function resolveDropShipRecipient(batch = {}, pieces = [], design = {}) {
  // WEAK sources — DO NOT use these to decide. `batch.ownerId` (create route) and `piece.createdBy`
  // (piece route) BOTH default to whoever is clicking, so when staff acts on an artisan's behalf they
  // name the staff member. They're recorded for audit only.
  const pieceCreators = [...new Set(pieces.map((p) => p.createdBy).filter(Boolean))];

  // STRONG sources — set by someone OTHER than the person placing the order, so they can't be
  // spoofed by the caller: the run's creator, and the design's artisan of record.
  const runIds = [...new Set([batch.runId, ...pieces.map((p) => p.runId)].filter(Boolean))];
  if (runIds.length > 1) {
    throw new CastingOrderError(`this casting batch mixes pieces from different runs (${runIds.join(', ')}) — split it; one order ships to one address`);
  }
  let runOwner = null;
  if (runIds[0]) {
    const { default: RunsModel } = await import('@/app/api/runs/model');
    const run = await RunsModel.findById(runIds[0]);
    // A runId that won't resolve is a REFUSAL, never a silent downgrade to a weak source.
    if (!run) throw new CastingOrderError(`this batch references run ${runIds[0]}, which no longer exists — refusing to guess where to ship`);
    if (!run.createdBy) throw new CastingOrderError(`run ${runIds[0]} has no creator recorded — refusing to guess where to ship`);
    // Same string-only rule as designOwner (symmetric defence): a non-string identity must never
    // become a candidate recipient, so a bad shape is refused here rather than one layer later.
    if (typeof run.createdBy !== 'string' || !run.createdBy.trim()) {
      throw new CastingOrderError(`run ${runIds[0]} has an invalid creator identifier — refusing to guess where to ship`);
    }
    runOwner = run.createdBy.trim();
  }
  // Only a plain string is a usable identity — an operator object would poison the `$or` lookup
  // downstream and match an arbitrary user, so it is not a candidate at all.
  const designOwner = typeof design?.primaryArtisanId === 'string' && design.primaryArtisanId.trim()
    ? design.primaryArtisanId.trim() : null;

  let strong = [...new Set([runOwner, designOwner].filter(Boolean))];
  if (strong.length > 1) {
    // They differ AS STRINGS — but `primaryArtisanId` may hold a userID, an email, or an _id
    // (designPermissions matches any of them), so the same human can appear in two shapes. Resolve
    // both to canonical userIDs before calling it a conflict; only a real conflict refuses.
    const resolved = await Promise.all(strong.map(canonicalUserID));
    // EVERY differing strong source must resolve. If one doesn't (deleted user, changed email, a
    // typo, or an `_id`-shaped id), we CANNOT prove the two are the same person — so refuse instead
    // of silently handing the address to whichever one happened to survive.
    const unresolved = strong.filter((_, i) => !resolved[i]);
    if (unresolved.length) {
      throw new CastingOrderError(`cannot verify the ship-to: ${unresolved.join(' and ')} does not resolve to a known user, so it can't be reconciled with the other owner of record — fix the design's artisan / run creator before ordering (refusing to guess where to ship)`);
    }
    const canon = [...new Set(resolved)];
    if (canon.length > 1) {
      throw new CastingOrderError(`ship-to conflict: run creator ${runOwner} and design artisan ${designOwner} are different people — resolve the ownership before ordering (refusing to guess where to ship)`);
    }
    strong = canon;
  }
  const recipient = strong[0] || null;
  if (!recipient) {
    throw new CastingOrderError('cannot independently establish who this casting ships to — the batch has no run and the design has no artisan of record. Refusing to guess: the batch owner and piece creator both default to whoever placed the order, so they can’t be trusted as the address.');
  }
  return { recipient, audit: { runOwner, designOwner, batchOwnerId: batch.ownerId ?? null, pieceCreators } };
}

/**
 * An artisan identity can be recorded as a userID OR an email (designPermissions matches either).
 * Resolve any shape to the canonical `userID`, or null. Impure; never throws.
 */
export async function canonicalUserID(idOrEmail) {
  if (!idOrEmail || typeof idOrEmail !== 'string') return null;
  try {
    const dbInstance = await db.connect();
    const user = await dbInstance.collection('users').findOne(
      { $or: [{ userID: idOrEmail }, { email: idOrEmail }] },
      { projection: { _id: 0, userID: 1 } },
    );
    return user?.userID || null;
  } catch { return null; }
}

/** Resolve + validate the drop-ship address for an artisan. Throws CastingOrderError if incomplete. */
export async function resolveArtisanShipTo(userIDOrEmail) {
  if (!userIDOrEmail) throw new CastingOrderError('no artisan on the casting batch — cannot resolve a ship-to');
  // MUST be a plain string. An operator object (e.g. `{$ne:null}` arriving via a design's
  // primaryArtisanId) would otherwise become `$or:[{userID:{$ne:null}},…]` and match an ARBITRARY
  // user — yielding a complete, valid-looking address for a stranger. That is the misship class this
  // module exists to prevent, so reject the shape outright.
  if (typeof userIDOrEmail !== 'string') {
    throw new CastingOrderError('the artisan of record is not a valid identifier — refusing to resolve a ship-to from it');
  }
  const dbInstance = await db.connect();
  // Match either shape — `primaryArtisanId` may legitimately hold an email.
  const user = await dbInstance.collection('users').findOne(
    { $or: [{ userID: userIDOrEmail }, { email: userIDOrEmail }] },
    { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1, artisanApplication: 1 } },
  );
  if (!user) throw new CastingOrderError(`artisan ${userIDOrEmail} not found`);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  const { ok, errors, shipTo } = validateShipTo(user.artisanApplication || {}, { name: fullName });
  if (!ok) {
    throw new CastingOrderError(`the artisan's shipping address is incomplete (missing: ${errors.join(', ')}) — they must complete it on their profile before a drop-ship order can be placed`);
  }
  return { shipTo, artisanEmail: user.email || null };
}

/**
 * Place the casting order with the vendor: resolve the drop-ship address + per-metal order lines,
 * email our account manager, snapshot exactly what was sent onto the batch, and move it to `ordered`.
 * AWAITED and throws on failure — a vendor order is real money; the caller must know it didn't send.
 */
export async function placeVendorCastingOrder({ batchId, sentBy = null, modelSource = null, notes = null, estCost = null }) {
  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) throw new CastingOrderError('casting batch not found');
  if (batch.inHouse) throw new CastingOrderError('in-house batches are not vendor-ordered');
  if (batch.status !== CASTING_STATUS.NEEDS_ORDERING) {
    throw new CastingOrderError(`casting batch is already ${batch.status} — only a needs_ordering batch can be sent to the vendor`);
  }

  const vendor = await getCastingVendorConfig();
  if (!vendor.email) throw new CastingOrderError('no casting-vendor email configured — set the CASTING_VENDOR_EMAIL env var (or seed adminSettings.castingVendor.email; there is no settings UI for it yet)');

  const design = await DesignsModel.findById(batch.designID);
  if (!design) throw new CastingOrderError(`design ${batch.designID} not found`);

  const pieceIDs = batch.pieceIDs || [];
  // DUPLICATES would inflate the ordered quantity (two real castings billed for one piece) and skew
  // the per-piece COGS split — refuse before anything else touches the list.
  if (new Set(pieceIDs).size !== pieceIDs.length) {
    throw new CastingOrderError('this casting batch lists the same piece more than once — fix the batch before ordering; refusing to over-order');
  }
  const pieces = (await Promise.all(pieceIDs.map((id) => PiecesModel.findById(id)))).filter(Boolean);
  if (!pieces.length) throw new CastingOrderError('no pieces on this casting batch');
  // Never place a PARTIAL order and mark the whole batch ordered — if a pieceID doesn't resolve,
  // something is wrong with the batch and the quantities would be silently short.
  if (pieces.length !== pieceIDs.length) {
    const missing = pieceIDs.filter((id) => !pieces.some((p) => p.pieceID === id));
    throw new CastingOrderError(`${missing.length} piece(s) on this batch no longer exist (${missing.join(', ')}) — fix the batch before ordering; refusing to place a short order`);
  }

  const { lines, errors } = buildOrderLines(pieces, design);
  if (errors.length) throw new CastingOrderError(`cannot place the order: ${errors.join('; ')}`);

  const { recipient: recipientUserID, audit: shipToAudit } = await resolveDropShipRecipient(batch, pieces, design);
  const { shipTo } = await resolveArtisanShipTo(recipientUserID);

  const orderRef = `EFD-${String(batch.batchId).slice(0, 8).toUpperCase()}`;
  const totalQty = lines.reduce((n, l) => n + l.qty, 0);
  const subject = `Casting order ${orderRef} — ${totalQty} piece(s), DROP SHIP to ${shipTo.city}, ${shipTo.state}`;

  // Load the mailer BEFORE claiming — a module-load failure inside the claim window would leave the
  // batch stuck at `ordered` with no email and no release.
  const { sendEmail } = await import('../../../lib/email');

  // CLAIM the batch atomically BEFORE sending, so a double-click or client retry can't email Carrera
  // two real orders. If the send then fails we release the claim so it can be retried.
  const claimed = await CastingBatchesModel.claimForVendorOrder(batchId);
  if (!claimed) throw new CastingOrderError('this casting batch was just ordered by someone else — refusing to send a duplicate vendor order');

  let result;
  try {
    result = await sendEmail({
      to: vendor.email,
      cc: vendor.cc,
      subject,
      template: 'casting-order',
      data: {
        orderRef,
        accountManager: vendor.accountManager,
        vendorName: vendor.name,
        designName: design.name || batch.designID,
        designID: batch.designID,
        totalQty,
        lines,
        shipTo,
        shipToLine: formatShipTo(shipTo),
        // Second address line only when the business name differs from the recipient (no hbs `eq` helper).
        shipToBusinessLine: shipTo.businessName && shipTo.businessName !== shipTo.name ? shipTo.businessName : null,
        modelSource: modelSource || (design.stlUrl ? 'STL linked below' : 'existing model/mold on file'),
        stlUrl: design.stlUrl || null,
        notes: notes || null,
        placedBy: sentBy,
        placedAt: new Date().toLocaleString('en-US'),
      },
    });
  } catch (e) {
    // The send failed — release the claim so the order can be retried, and surface the failure.
    await CastingBatchesModel.releaseVendorOrderClaim(batchId).catch(() => {});
    throw new CastingOrderError(`the casting order email could not be sent (${e.message}) — nothing was ordered; the batch is back in needs_ordering`);
  }

  // Snapshot EXACTLY what we asked for — the proof if a parcel is misrouted.
  const vendorOrder = {
    orderRef,
    sentTo: vendor.email,
    cc: vendor.cc,
    vendorName: vendor.name,
    subject,
    shipTo,                 // frozen address snapshot
    shipToUserID: recipientUserID,
    shipToAudit,            // which source decided the address + the weak sources, for disputes
    lines,                  // per-metal lines w/ qty + pieceIDs
    stlUrl: design.stlUrl || null,
    modelSource: modelSource || null,
    notes: notes || null,
    messageId: result?.messageId || null,
    sentAt: new Date(),
    sentBy,
  };
  // Status/orderedAt were already set by the atomic claim; record the vendor + the snapshot.
  // estCost is only overwritten by a genuine non-negative number — '' / [] / true / -5 from a form
  // post must never silently zero out a real estimate.
  const estRaw = typeof estCost === 'number' ? estCost
    : (typeof estCost === 'string' && estCost.trim() !== '' ? Number(estCost) : NaN);
  const estOk = Number.isFinite(estRaw) && estRaw >= 0;
  const updated = await CastingBatchesModel.updateById(batchId, {
    vendor: vendor.name,
    estCost: estOk ? estRaw : batch.estCost,
    vendorOrder,
  });
  return { batch: updated, vendorOrder };
}
