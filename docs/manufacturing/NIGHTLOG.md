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

**Boundary (deliberate):** WorkOrder spawning is NOT inside the mint transaction (WorkOrdersModel
isn't session-aware and WOs aren't capacity-critical) — the route spawns routing WOs post-commit,
matching how `createPieceFromDesign` already separates piece creation from edition claiming. The
route-layer `spawnRunWorkOrders` + the run API endpoints land with S7 (artisan run UI) or a thin
API slice before it; S1 is the pure transactional core the goal asked for first.
