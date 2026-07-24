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

## S1 — Transactional core (continued)

**Boundary (deliberate):** WorkOrder spawning is NOT inside the mint transaction (WorkOrdersModel
isn't session-aware and WOs aren't capacity-critical) — the route spawns routing WOs post-commit,
matching how `createPieceFromDesign` already separates piece creation from edition claiming. The
route-layer `spawnRunWorkOrders` + the run API endpoints land with S7 (artisan run UI) or a thin
API slice before it; S1 is the pure transactional core the goal asked for first.
