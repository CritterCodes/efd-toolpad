# Sprint Plan

Each sprint ships **migration + code together** — data never drifts ahead of the code that
reads it. Migration is one idempotent, re-runnable script (`scripts/migrate-manufacturing.mjs`),
no down-migrations (DEV is re-cloneable; prod gets a backup at cutover). Schemas: see
[data-model.md](./data-model.md) — update it in the same PR as any data change.

**Dependency chain:** S0 → {S1, S3}; S2 → S0,S1; S4 → S0,S1,S3; S5 → S4; S6 → S5; S7 → S4,S5.

---

## S0 — Backbone + Cleanup  *(the spine everything builds on)*

**Goal:** re-platform repairs onto the source-agnostic Work Order spine with **zero behavior
change**, and establish a clean foundation.

- **Migration** *(drafted & applied to DEV; finalize here)*:
  - create `workOrders` (one per repair, `discipline: bench_jewelry`, seq 1) — *⚠ extend the
    existing script to set `discipline`*
  - rename `repairLaborLogs`→`laborLogs`, `repairPayrollBatches`→`payrollBatches`; link logs to WOs
  - add `billing.mode` default to repairs
  - create empty `drops`/`designs`/`pieces` (+indexes)
  - **cleanup:** drop `inventory`/`inventoryTransactions`/`inventoryReorderSuggestions`;
    reset trash `products` data (DEV now; **confirm before prod**)
- **Code (done):**
  - constants + `database.js` accessors for new collections; **fail-closed** on unset `MONGO_DB_NAME`
  - `workOrders` data-access model + discipline service (artisanType→discipline)
  - labor/payroll models repointed to `laborLogs`/`payrollBatches`
  - repairs **emit & sync** a work order (`RepairsModel.create`/`updateById`); new labor logs carry `workOrderID`
- **Deferred out of S0 (no value yet + regression risk):**
  - **My Bench read-switch to `workOrders` + hard discipline *visibility* enforcement → moved to S2/S4**,
    when a second source (sale-service, pieces) actually needs to appear on the bench and forces the
    aggregation. Today there is one lane (`bench_jewelry`) and `artisanTypes` is **unpopulated for all
    users**, so gating visibility now would lock every artisan out. Discipline is stored on every WO; hard
    lane enforcement lands with the bench rewrite + once artisan tagging is populated.
  - **Delete orphaned cross-DB cad/designs code → moved to S3** (absorbed there; deleting now would break
    the still-live CAD Requests page, violating no-regression).
- **Done when:** repairs flow through the synced WO spine; labor/payroll read the generalized
  collections; full `next build` passes; **no user-visible change**.

## S1 — Billing modes

**Goal:** first-class `retail | wholesale | internal | comped`, replacing the $0/negative-line-item hack.
- **Migration:** backfill `billing.mode` (done); map any legacy comp hacks.
- **Code:** pricing service honors `internal`/`comped` (zero customer price, **labor still paid**); repair billing selector UI.
- **Done when:** a comped repair charges $0 but still creates a labor log that pays the jeweler.

## S2 — Sale service work orders

**Goal:** a sale can spawn a `sale_service` WO (e.g. resize) without faking a repair.
- **Migration:** none (additive).
- **Code:** sale → WO creation, lands on the jeweler bench, billing `comped` or charged.
- **Done when:** a resize attached to a sale appears on the bench, pays labor, creates no fake repair.

## S3 — Drops & Designs (+ CAD estimator)

**Goal:** the catalog/IP layer and the `estCost` engine.
- **Migration:** indexes only (`drops`/`designs` start empty).
- **Code:** drop/design CRUD; CAD upload + viewers (salvaged); **absorb cad-requests** as `cad`
  work orders; `estCost` from salvaged `stlVolumeCalculator` + `metalTypes` + `metalPrices`.
- **Done when:** create a drop, add a design with CAD + BOM + a computed cost estimate; a CAD
  request shows on a CAD Designer's bench.

## S4 — Pieces + routing

**Goal:** per-piece COGS; routing generates work orders across disciplines.
- **Migration:** none.
- **Code:** piece lifecycle; a design's `routing[]` spawns the piece's WOs (each with its
  discipline); labor capitalizes into `accruedLaborCost`/`totalCOGS`.
- **Done when:** make a piece; its bench WOs pay the artisans **and** roll into the piece's COGS.

## S5 — Piece → Product (reimagined)

**Goal:** clean Product model; completed piece becomes a showcase listing with COGS-based pricing.
- **Migration:** rebuild `products` shape (data was reset in S0).
- **Code:** product CRUD; piece→product link; availability derived from piece status;
  COGS-based suggested retail.
- **Done when:** a finished piece lists as a product showing real margin; stock reflects piece status.

## S6 — Marketplace + payouts

**Goal:** artisan listings, services-based fees, artisan payouts into unified payroll.
- **Migration:** add `artisanAgreements`, `feeSchedule` (+ seed structure; **rates left blank**).
- **Code:** `seller`/`custody`/`listingSurfaces` on products; **fee resolver** (storefront/custody/
  fulfillment pillars); sale → `efdFee` + `artisanPayout`; payout flows into `payrollBatches` via `salePayouts`.
- **Done when:** an artisan sale splits into EFD fee + artisan payout per the configured schedule,
  and the payout appears in that artisan's payroll batch. (Minisites are a later add — the fee
  model already supports them with no new rules.)

## S7 — Customs *(graceful, no-regression rewrite)*

**Goal:** fold `customTickets` onto the new spine: a custom = Design + Piece(s) + customerID + billing.
- **Pre-work (required):** audit the existing custom-ticket flow and enumerate **every current
  function** (financials, statuses, comments, files, notifications) → that list is the acceptance checklist.
- **Migration:** migrate `customTickets` → pieces/designs (+ customer + billing) **without losing any data or capability**.
- **Code:** custom intake → design → piece → routed WOs across disciplines → billing/sale.
- **Done when:** every function that exists today still works, and customs run through the same
  Design/Piece/Work-Order engine as production.

---

## Parked (future, not scoped)

- Gemstone-listed-by-artisan + custom-design-on-a-gemstone flow.
- Artisan **minisites** (the fee model already accommodates them; UI/hosting is later).
