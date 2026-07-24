# NIGHTLOG — Production Runs + Gemstone Phase 3 (branch `feat/production-runs-m1`)

Overnight autonomous build against `docs/manufacturing/OVERNIGHT_GOAL.md`. Every slice is
verified by a FRESH adversarial subagent (never self-checked) before it's committed and before the
next slice starts. Audit verdict (whole-diff) goes at the top when the night ends.

---

## AUDIT VERDICT
_(pending — filled by the final whole-diff audit agent)_

---

## Pre-existing issues found (NOT introduced this session — for morning review)

- **3 vitest failures from a deleted vendored refrakt server module.** `productContract.test.js`
  and `customViewer.test.js` (×2) all fail with `METAL_FINISHES.includes` on undefined — both
  transitively import `VALID_FINISHES` from `@crittercodes/refrakt/server`, and
  `vendor/refrakt/src/server/index.js` was deleted on this branch by an earlier gemstone commit.
  **`pnpm build` PASSES** (the published package resolves in the real build), so this is a
  test-env-only issue — but it should be fixed to restore a clean suite. Not touched this session
  (out of scope). NEEDS-OWNER / follow-up.

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

## S1 — Transactional core (continued)

**Boundary (deliberate):** WorkOrder spawning is NOT inside the mint transaction (WorkOrdersModel
isn't session-aware and WOs aren't capacity-critical) — the route spawns routing WOs post-commit,
matching how `createPieceFromDesign` already separates piece creation from edition claiming. The
route-layer `spawnRunWorkOrders` + the run API endpoints land with S7 (artisan run UI) or a thin
API slice before it; S1 is the pure transactional core the goal asked for first.
