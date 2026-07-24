# NIGHTLOG — Production Runs + Gemstone Phase 3 (branch `feat/production-runs-m1`)

Overnight autonomous build against `docs/manufacturing/OVERNIGHT_GOAL.md`. Every slice is
verified by a FRESH adversarial subagent (never self-checked) before it's committed and before the
next slice starts. Audit verdict (whole-diff) goes at the top when the night ends.

---

## AUDIT VERDICT (whole-diff, 2026-07-24)

**The S1–S7 production-runs work PASSED the audit** — all six inviolable axioms hold (nothing
fronted; title passes at payment; WOs private by self-assignment; solo-first; pieces always carry a
variantId; 20% markup on labor+materials only, self=$0, shipping/gems excluded); every modified
shared file (labor logs, salePayouts, payroll service, bench actions, Stripe helper, webhook,
pieceRouting) is backward-compatible/additive with zero repairs/customs/drops regression; the
systemic action-route IDOR fix holds across all production routes; and the full suite is 479 passed
/ 5 skipped / 3 failed with `pnpm build` succeeding.

**BUT the audit returned FAIL on ONE blocking, PRE-EXISTING issue (not from S1–S7):** the branch
base (gemstone PRs #22–24) switched refrakt from the vendored copy to the published package and the
`/server` subpath import of `VALID_FINISHES`/`VALID_GEM_PRESETS` (in `productContract.js` +
`customViewer.js`) resolves to `undefined` in the installed tree. **Confirmed: none of the 7 S1–S7
slice commits touch either file.** This must be resolved before the branch merges — see MUST-KNOW #1.

---

## Blocking issue for the human (PRE-EXISTING — not S1–S7)

- **Refrakt `/server` exports (HIGH — resolve before merge).** `src/services/products/productContract.js:12`
  and `src/services/customs/customViewer.js` import `{ VALID_FINISHES, VALID_GEM_PRESETS }` from
  `@crittercodes/refrakt/server`; the on-disk pnpm-linked package is **1.11.0** (not the pinned
  `^1.14.0`), and its `/server` surface lacks those exports → `METAL_FINISHES`/`GEM_PRESETS` are
  `undefined`, which throws in `validateProductContract`/`validateDesignModel` for any metal-slot
  meshMap, AND causes the 3 vitest failures. This is a branch-base/dependency-drift artifact, NOT
  S1–S7. **Correction to the earlier "test-env-only" note below:** build passing does NOT prove
  runtime resolution — the audit confirmed the symbol is undefined at real Node resolution against
  1.11.0. The open question is whether the PINNED 1.14.0 `/server` re-exports these symbols (in
  which case prod is fine and only the stale local install fails) or not (in which case product-
  publish + customs-viewer validation are broken in prod too). Resolve by: (a) a clean authenticated
  `pnpm install` to get 1.14.0 on disk, then re-run the 3 tests; (b) if 1.14.0 `/server` still
  lacks them, retarget the imports to the package root `@crittercodes/refrakt`. NOT changed
  overnight — retargeting blind against the stale 1.11.0 could itself break prod if 1.14.0 `/server`
  does export them. This was pre-existing on the branch before S1 and is documented in memory
  ([efd-admin-pnpm-workspace], [variant-refrakt-build]).

---

## S1 — Transactional core ✅ VERIFIED (2026-07-24)

**Shipped:**
- `src/lib/constants.js` — `RUNS_COLLECTION: 'runs'`.
- `src/app/api/runs/model.js` — `RunsModel` + `RUN_STATUS` + pure `buildRun`/`validateRun`.
- `src/services/production/productionRun.js` — the keystone: `mintRun` (all-or-nothing:
  run doc + Σqty edition-numbered pieces + linked-gem reservation in ONE transaction),
  `scrapPiece` (pre-sale: release slot + gems, retire number), `cancelRun`, and exported
  `reserveGemEditions`/`releaseGemEditions` (shared with gem Phase 3 / S8). Reuses
  `withEditionTransaction` + the `{client,database}`/`session` convention verbatim.
- `src/services/production/productionRun.test.js` — 12 tests (3 pure + 9 real MongoMemoryReplSet).

**Verifier verdict:** PASS. 12/12 S1 tests; full suite 431 passed / 5 skipped / 3 failed (all 3 =
the pre-existing refrakt issue above); `pnpm build` clean. Adversarial probes on atomicity,
numbering uniqueness, gem-coupling rollback, scrap-retire, and concurrency all held.

**PROPOSED (overnight) — flagged for morning:**
- **Scrap numbering consequence:** scrap releases the edition SLOT (allocated−1) but never rewinds
  `nextNumber`, so the retired number is never reused and replacements draw fresh higher numbers.
  For a limited-N edition this means edition *numbers* can exceed N over time (e.g. a scrapped #3
  in a limited-10 yields a live set …,#10,#11), while the live *quantity* still never exceeds N.
  This is faithful to PRODUCTION_RUNS.md §4.1 ("number retired, replacement gets a fresh number")
  but the ">N numbering" optics are worth an explicit owner confirm.

## S2 — Ledger fields (Connect-compat) ✅ VERIFIED (2026-07-24)

**Shipped:**
- `src/services/production/laborPayer.js` (+ test, 10 pure tests) — `LABOR_PAYER`,
  `owningArtisanForPiece` (artisan drop > design primaryArtisanId > null), `resolveLaborPayer`
  (mechanical self/efd rule), `resolvePieceLaborScope` (impure, lazy model imports, fail-safe to efd).
- `src/app/api/repairLaborLogs/model.js` — `payer` (strict 'self'|'efd' guard, default efd) +
  `payeeUserID` (defaults to primaryJewelerUserID). Backfill-safe.
- `src/app/api/salePayouts/model.js` — `payeeUserID` (defaults to sellerUserID). Backfill-safe.
- `src/services/bench/pieceWorkOrderActions.js` — scope wired into piece move-to-QC + CAD design
  fee; CAD QC-review fee stays payer:efd, payee=reviewer (standards QC is EFD's).

**Verifier verdict:** PASS. laborPayer 10/10; full suite 441 passed / 5 skipped / 3 failed
(same 3 pre-existing refrakt failures, zero new); `pnpm build` clean. Backfill-safety, fail-safe
wrapper, DB-free purity, and no import cycle all confirmed.

**→ S5 REQUIREMENT (flagged by the S2 verifier):** `payer:'self'` labor logs still flow into
payroll today (grouping intentionally unchanged in S2 per AC3). Per §4.4 a NON-OWNER artisan's
self-labor should NOT be payroll-payable (it realizes at sale via consignment), while the OWNER's
self-labor IS his payroll draw (self≈efd degenerate case). So the payroll exclusion is
laborer-identity-aware, not a blanket `payer!='self'` — S5 (billing rail + consignment
realization) must implement it correctly without breaking the owner's draw.

## S3 — Request-CAD on-ramp ✅ VERIFIED (2026-07-24)

**Shipped:** a design-sourced `cad_request` WO drives cad_requested→cad_in_progress→cad_qc→ready.
- `src/services/production/designCad.js` (+ test) — `requestDesignCad` (spawn + quote-accepted-at-
  creation + solo/queue assignment via pure `cadRequestPlan`), `claimDesignCad` (lane-enforced),
  `submitDesignCadToQc` (lands STL/GLB on the DESIGN via dotted `$set`, no clobber), `approveDesignCad`
  (pays the flat fee with S2 payer scope; self-certifies when approver==author per §3, else peer QC),
  `rejectDesignCad`. Built as a PARALLEL module — the piece/customs CAD flow is untouched.
- `src/services/production/laborPayer.js` — `resolveDesignLaborScope` (design-owner payer scope).
- Routes: `cad-request/route.js` (GET fee preview + POST create) and `cad-request/[action]/route.js`
  (claim | submit-qc | approve | reject), both `requireAuth` + `canManageDesign`.

**Verifier verdict:** PASS. designCad 3/3; full suite 444 passed / 5 skipped / 3 failed (same 3
pre-existing refrakt failures, zero new); `pnpm build` compiles both dynamic routes; `git` scope
confirms pieceWorkOrderActions/benchActions/benchQuery unchanged.

**Follow-ups (non-blocking, flagged by the S3 verifier):**
- When a CAD-request CANCEL path lands (S4+), harden `requestDesignCad`'s duplicate guard to a
  status-scoped query (`findOneBySource` has no sort, so a stale CANCELLED WO could slip past the
  `!== 'CANCELLED'` check). Unreachable in S3 (no cancel action exists yet).
- Solo-created CAD WOs log `primaryJewelerName: null` (userID + payeeUserID correct; payroll groups
  on userID so no functional impact). Cosmetic — pass the creator's display name through if surfaced.

## S4 — Casting board ✅ VERIFIED (2026-07-24)

**Shipped:** ownership-scoped casting-batch lifecycle (backend; UI is S7).
- `src/lib/constants.js` — `CASTING_BATCHES_COLLECTION`.
- `src/app/api/castingBatches/model.js` — model + `CASTING_STATUS` + pure `buildCastingBatch`.
- `src/services/production/castingBoard.js` (+ test, 12 pure tests) — `castingChargeFromCost`
  (×1.20 markup), `splitCastingCost` (equal, remainder-exact), `disputeDeadlineFrom`/
  `isPastDisputeWindow` (48h), `canTransition` (lifecycle guard), and the DB lifecycle:
  create → markOrdered → markReceived (splits COGS onto pieces via upsertMaterialByCategory +
  fires charge cost×1.20 + gates shipping) → markPaid (clears gate) → markDelivered (refused while
  unpaid; sets 48h deadline) → dispute/accept (auto-accept after window) / cancel. In-house batches
  skip the vendor charge/gate.
- Routes: `casting/route.js` (scoped GET + POST) + `casting/[batchId]/[action]/route.js`
  (order/receive/pay/deliver/dispute/accept/cancel), ownership-enforced; `pay` staff-only.

**Verifier verdict:** PASS. castingBoard 12/12; full suite 456 passed / 5 skipped / 3 failed (same
3 pre-existing refrakt failures, zero new); `pnpm build` compiles the nested route; split math
independently confirmed exact; `git` scope confirms only-additive (+1 constant line, no regressions).

**PROPOSED (overnight):** casting metal → COGS split = EQUAL per-piece division (the §4g open probe).
Documented in the code; owner to confirm vs weight-proportional.

**Follow-ups (non-blocking):** `splitCastingCost` can yield a negative last part for pathological
tiny-cost/high-count inputs (sum still exact) — clamp+redistribute if that ever becomes real. The
`markCastingPaid` hook is where S5's Stripe webhook will land; `markCastingReceived`'s charge is
where S5 generates the actual invoice.

## S5 — Artisan billing rail ✅ VERIFIED (2026-07-24)

**Shipped:**
- `src/app/api/artisanInvoices/model.js` (+ constant) — canonical artisan-owes-EFD invoice
  (`billedUserID`, kind wo/casting, `dueAt`, `listOverdue`). Distinct from customInvoices
  (customer receivables) and salePayouts (money out).
- `src/services/production/artisanBilling.js` (+ test, 12 tests) — pure `workOrderCharge`
  (labor+materials ×1.20; shipping+gems passthrough at cost; self=$0), `hasOverdueInvoices`,
  `isArtisanFrozen` (fail-open), `assertArtisanNotFrozen`, `billCastingBatch`/`billWorkOrder`
  (idempotent), `markArtisanInvoicePaid` (clears the linked casting ship-gate),
  `pushArtisanInvoiceToStripe` (reuses the shared rail with an artisan `kind`).
- **Freeze enforcement** at mintRun (now async), requestDesignCad, and the casting-create route —
  an overdue bill blocks all new work.
- **Self-labor payroll exclusion (closes the S2 gap)** — `buildUnbatchedMatch` gains owner-aware
  `ownerUserIDs`; non-owner `payer:'self'` labor drops out of payroll (realizes at sale), the
  owner's stays (his draw). Backward-compatible (`$ne:'self'` includes pre-S2 logs; no param =
  legacy filter). Payroll service resolves owners via `compensationProfile.isOwnerOperator`.
- **Stripe rail generalized** — `createAndSendStripeInvoice` gains a backward-compatible `kind`
  param; webhook gains an additive `artisan_wo_invoice`/`casting_charge` → markArtisanInvoicePaid
  branch (custom_invoice path byte-identical).

**Verifier verdict:** PASS. artisanBilling 12/12; full suite 468 passed / 5 skipped / 3 failed
(same 3 pre-existing refrakt; zero new); **stripe.test.js 3/3, webhook 4/4, payroll all pass**
(regression-critical); `pnpm build` clean (no cycle). Independent math + payroll $and/$or coexistence
+ async-mintRun caller audit all confirmed.

**NEEDS-OWNER / follow-up:**
- Live Stripe webhook signature path can't be verified offline — needs a human `stripe trigger
  invoice.paid` smoke against the artisan `kind` metadata.
- Markup source: uses `WORK_ORDER_MARKUP_RATE=0.20` (owner's stated 20%); the S5 explore flagged a
  `financial.cogMarkup` setting that may be a DIFFERENT number for custom quotes — owner to confirm
  whether artisan-WO markup should read from settings or stay the fixed 20%.
- `billWorkOrder`/`billCastingBatch` + `pushArtisanInvoiceToStripe` exist but aren't yet CALLED from
  a WO-completion hook — wiring them into the bench complete + casting-received flows is the
  remaining integration (S7 run UI / a thin hook). The freeze + gate + math + payroll exclusion are
  live now.

## S6 — Shipments ✅ VERIFIED (2026-07-24) — surfaced + fixed a systemic IDOR

**Shipped:**
- `src/app/api/shipments/model.js` (+ constant) — per-handoff record {from,to,pieceIDs,castingBatchId,
  carrier,tracking,declaredValue,insurance,status,ownerId}.
- `src/services/production/shipping.js` (+ test, 8 tests) — `insuranceForDeclaredValue` (declared-value
  line, billed through at cost), `canShipTransition`, `isClearToShip` (nothing-ships-unpaid gate off the
  casting charge), and the DB lifecycle (create/markShipped[gated]/markDelivered/cancel).
- Routes: `shipments/route.js` (scoped GET + POST) + `[shipmentId]/[action]/route.js`, ownership-enforced.

**Verification (3 rounds — the discipline caught real bugs):**
- Round 1 FAIL: **cross-tenant IDOR** — the action route spread `handler({ shipmentId, ...body })` (path
  id BEFORE `...body`), so a body-supplied `shipmentId` overrode the ownership-checked one; artisan A
  could cancel/deliver artisan B's shipment. The verifier flagged the SAME pattern in the S4 casting
  route (`{ batchId, ...body }`) — a systemic bug missed by S4's verifier — and a related WO-scoping gap
  in the S3 CAD route.
- Fix: path/authoritative ids placed AFTER `...body` in all three routes; S3 CAD route also gained a
  `wo.sourceID === designID` 404 guard.
- Round 2 FAIL: my S3 fix closed the id override but left `session` BEFORE `...body` → body-supplied
  `session` could spoof role/lane (privilege escalation). Fixed → `handler({ ...body, session, workOrderID })`.
- Round 3 PASS: all four override vectors (shipmentId/batchId/workOrderID/session) closed; a
  codebase-wide grep of `src/app/api` confirmed NO other instances of the anti-pattern. Full suite
  476 passed / 5 skipped / 3 failed (same 3 pre-existing refrakt; zero new); `pnpm build` clean.

**Security note for morning:** the `handler({ pathId, ...body })` ordering bug was systemic; it's now
fixed in shipments (S6), casting (S4), and cad-request (S3) routes. Worth a lint rule to prevent
regressions (authoritative values must follow the body spread).

**PROPOSED (overnight):** declared-value insurance rate = 1% placeholder (`DECLARED_VALUE_INSURANCE_RATE`)
— owner to set the real carrier rate.

## S7 — Artisan run UI (+ run API) ✅ VERIFIED (2026-07-24)

**Shipped — the run API finally gives S1's `mintRun` a caller:**
- `src/services/production/productionRun.js` — refactored to a shared `mintPiecesTx` core;
  `mintRunTx` (create+mint, behavior-preserved) + new `mintPlannedRunTx`/`mintPlannedRun` (mint into
  an existing planned run — the collab path), `spawnRunWorkOrders` (post-commit routing WOs; solo
  pre-assigns to creator per §0), pure `allCollaboratorsSigned` (§4e gate).
- `src/services/production/pieceRouting.js` — `spawnPieceWorkOrders` exported + `assignedToUserID`.
- `src/app/api/runs/model.js` — `signatures[]`.
- Routes: `production/runs` (scoped GET + POST plan/mint), `runs/[runId]` (GET), `runs/[runId]/[action]`
  (sign/mint/cancel/scrap) — ownership-scoped, IDOR-clean (path/session win over body).
- `src/app/dashboard/artisan/runs/page.js` — My Runs list + create wizard (solo mints immediately;
  collab plans + awaits signatures).
- `productionRunCollab.test.js` (3 pure tests).

**Flow:** solo design → POST mints immediately + spawns creator-assigned WOs. Collab design → POST
creates a PLANNED run (creator signed); collaborators POST /sign; POST /mint succeeds only when
`allCollaboratorsSigned`. Freeze-guarded throughout.

**Verifier verdict:** PASS. S1's 12 tests all still pass (refactor behavior-preserving); collab 3/3;
full suite 479 passed / 5 skipped / 3 failed (same 3 pre-existing refrakt; zero new); `pnpm build`
compiles all routes + the page; no module cycle; IDOR trace clean.

**Follow-ups (non-blocking):**
- Solo POST writes the planned run doc non-transactionally before minting — a failed mint (frozen/
  capacity) leaves a retriable orphaned `planned` run. Cosmetic data-hygiene.
- My Runs page has a Mint button but no collaborator "sign" UI yet — a collab run can't be driven to
  minted from the page alone (the /sign API + gate exist). UX follow-up.
- Live preview verification of the My Runs page (auth to dev harness) — deferred; verified
  structurally + by build here.

## S8 — Gemstone Phase 3 claim-time ✅ VERIFIED (2026-07-24)

**Shipped:** `src/services/production/gemClaim.js` (+ test, 11 pure tests) —
- Pure: `repriceGemAtClaim` (authoritative reprice at actual carat, strict tiers → special request
  beyond), `gemClaimWithinCaps` (min of maxPieces/lotQty), `cutterPayoutNetOfRough` (§4d — gross −
  consignment − fronted rough, floored), `gemCutTarget` (species/color/sizeMode/carat/mm/treatment).
- DB: `claimGemEdition` (atomic committed→allocated, guarded — the reservation-to-cut conversion),
  `spawnGemCuttingWO` (first spawner into the `gem_cutting` lane; target in a task; assigned to the
  cutter), `claimGemsForPiece`.
- Wired into `spawnRunWorkOrders` (S7): gem-linked run pieces now claim each gem edition + spawn a
  gem_cutting WO at production start. Additive — runs with no gems unaffected.

**Verifier verdict:** PASS. gemClaim 11/11; S1+S7 run tests still pass; full suite 490 passed / 5
skipped / 3 failed (same 3 pre-existing refrakt; zero new); `pnpm build` clean, no cycle; reprice
(648) + payout (500) math independently confirmed.

**Follow-ups (non-blocking, flagged by the S8 verifier):**
- **Scrap-after-claim gem leak (real, cross-phase):** S1's `releaseGemEditions` decrements gem
  `committed`; once S8 converts a gem committed→allocated, a later scrap of its jewelry piece finds
  committed=0 and no-ops, leaving the gem's `allocated` inflated. Needs a claim-aware release
  (release from allocated if the gem was already claimed) — a later phase closes it.
- Pure reprice/caps/payout are tested but not yet invoked from the claim path (by design — Phase 4
  shop customizer + at-sale payout are their consumers).
- `spawnRunWorkOrders` isn't idempotent w.r.t. gem claims (pre-existing non-idempotency).

## S9 — Policy pages + versioned acceptance ✅ VERIFIED (2026-07-24)

**Shipped (all-additive):**
- `src/services/policies/policyRegistry.js` (+ test, 8 pure tests) — `POLICIES` (artisan-terms v0.1,
  11 faithful section summaries), `currentVersion`, `needsAcceptance` (re-prompts on version bump),
  `applyAcceptance` (idempotent per docId), `publicPolicy` (strips sourceDoc).
- `src/app/api/policies/route.js` (GET — current policies + per-user acceptance state).
- `src/app/api/policies/[docId]/accept/route.js` (POST — records `users.agreements[]`; 404 unknown,
  409 stale version).
- `src/app/dashboard/policies/page.js` — renders sections + version/draft badges; Accept / "Accept
  updated terms" only when needed.

**Verifier verdict:** PASS. registry 8/8; full suite 498 passed / 5 skipped / 3 failed (same 3
pre-existing refrakt; zero new); `pnpm build` compiles routes + page; only-additive.

**Follow-up (non-blocking):** the acceptance GATE (`needsAcceptance`) is exposed via GET + the page
but not yet enforced as a hard server gate on every artisan mutation — wiring it into the artisan
feature guards (like the freeze check) is the integration step. Terms doc is `status:'draft'` —
version-bump to 1.0 after the attorney review.

## S10 (stretch) — My Drops collaborator management ✅ VERIFIED (2026-07-24)

**Shipped (all-additive):** `src/services/production/dropCollaborators.js` (+ test, 7 pure tests) —
`applyCollaboratorChange` (add idempotent/dedup/drop-falsy, never adds the owner, remove no-op);
`POST /api/production/drops/[dropID]/collaborators` (canManageDrop — owner/staff; only touches
`collaborators`, never release/ownership; IDOR-clean); `src/app/dashboard/artisan/drops/page.js`
(My Drops list + collaborator add/remove for owned drops).

**Verifier verdict:** PASS. dropCollaborators 7/7; full suite 505 passed / 5 skipped / 3 failed
(same 3 pre-existing refrakt; zero new); `pnpm build` compiles route + page; only-additive.

**Follow-up (non-blocking):** the helper drops falsy ids but doesn't trim whitespace (the page
guards it; a direct API caller could insert a blank-looking collaborator).

## S1 — Transactional core (continued)

**Boundary (deliberate):** WorkOrder spawning is NOT inside the mint transaction (WorkOrdersModel
isn't session-aware and WOs aren't capacity-critical) — the route spawns routing WOs post-commit,
matching how `createPieceFromDesign` already separates piece creation from edition claiming. The
route-layer `spawnRunWorkOrders` + the run API endpoints land with S7 (artisan run UI) or a thin
API slice before it; S1 is the pure transactional core the goal asked for first.
