# Sprint Plan

Each sprint ships **migration + code together** — data never drifts ahead of the code that
reads it. Each sprint delivers **one hardened, idempotent migration** under `scripts/migrations/`
(e.g. `s0-workorder-spine.mjs`) built on `_lib.mjs`, with `--dry-run` + a pre-flight backup and
target-DB guards. No down-migrations (DEV is re-cloneable; prod gets a backup + a rehearsal on the
`efd-db-migrate` clone at cutover). Schemas: see [data-model.md](./data-model.md) — update it in the
same PR as any data change.

**Dependency chain:** S0 → {S1, S3}; S2 → S0,S1; S4 → S0,S1,S3; S5 → S4; S6 → S5; S7 → S4,S5.

---

## S0 — Backbone + Cleanup  *(the spine everything builds on)*

**Goal:** re-platform repairs onto the source-agnostic Work Order spine with **zero behavior
change**, and establish a clean foundation.

- **Migration** — `scripts/migrations/s0-workorder-spine.mjs` *(hardened, applied to DEV; dry-run verified against prod)*:
  - create `workOrders` (one per repair, `discipline: bench_jewelry`, seq 1) + indexes
  - rename `repairLaborLogs`→`laborLogs`, `repairPayrollBatches`→`payrollBatches`; link logs to WOs
  - add `billing.mode` default to repairs
  - create empty `drops`/`designs`/`pieces` (+indexes)
  - *Additive/renames only — no deletions.* Dropping junk `inventory*` and resetting trash
    `products` are deferred (products reset belongs to S5; inventory junk can be dropped at cutover).
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

## S1 — Billing modes ✅

**Goal:** first-class `retail | wholesale | internal | comped`, replacing the ad-hoc
`compRepair`/`includedWithSale`/`isWholesale` flags.
- **Migration:** `scripts/migrations/s1-billing-modes.mjs` — backfills canonical `billing.mode`
  from the legacy flags (DEV: 222 retail / 114 wholesale / 1 comped; idempotent).
- **Code:** `src/services/billing/modes.js` (canonical modes + `resolveBillingMode`, with comp/internal
  precedence so S0's `retail` default can't mask a comp flag). Both charge paths —
  `calculateRepairChargeTotal` (labor review) and invoice `getRepairChargeSummary` — zero the customer
  charge for `internal`/`comped`; repairs stamp `billing.mode` on create.
- **Deferred (low-risk polish):** explicit billing-mode selector UI + `internal` for repairs — the
  existing comp/wholesale toggles already map to modes via the resolver, and `internal` is for
  production (S4), not repairs.
- **Done when:** ✅ a comped/internal repair charges $0 (labor review **and** invoice) while labor
  logs still pay the jeweler; `next build` passes.

## S2 — Sale-service work orders ✅

**Goal:** sale-driven service (e.g. a resize) tracked as bench work that pays the jeweler with no
customer charge — a clear path, not a faked customer repair.
- **Already wired by S0+S1 + the existing sales system:** `linkRepairToSalesInvoice` links the service
  repair to a sale line and deducts its labor from the seller payout (`getActualLaborDeduction`);
  `includedWithSale`→`comped` (S1) zeroes the customer charge; the S0 spine gives it a work order,
  bench presence, and payroll.
- **Code (this sprint):** `linkRepairToSalesInvoice` now stamps `salesInvoiceID`/`salesLineID` on the
  repair; the work-order sync tags the WO with `saleContext`, so sale-service work is directly queryable
  (no invoice cross-reference). Closes the late-link gap.
- **Migration:** `scripts/migrations/s2-sale-service-work-orders.mjs` — backfills sale refs +
  `saleContext` for pre-existing sale-linked repairs (idempotent; DEV currently has none).
- **Done when:** ✅ a sale-linked resize is comped (no customer charge), appears on the bench, pays the
  jeweler via payroll, deducts labor from the seller payout, and is tagged `saleContext` for tracking.

## S3 — Drops & Designs (+ CAD estimator) — ✅ backend complete (UI deferred)

**Goal:** the catalog/IP layer and the `estCost` engine.
- **Migration:** `scripts/migrations/s3-drops-designs.mjs` — ensure drop/design indexes (additive; applied to DEV).
- **Done (S3a):**
  - `src/services/production/designCost.js` — the estCost engine, salvaging `metalTypes.js`
    (specific-gravity / karat / 1.3× casting) + `stlVolumeCalculator` volume:
    volume → wax → metal weight → karat-adjusted price → metal cost + stones/findings/labor.
    Unit-tested (`designCost.test.js`, 6 passing).
  - `DropsModel` + `DesignsModel` — CRUD + indexes, schema per data-model.
- **Done (S3b — API):**
  - `/api/production/drops` (+ `[dropID]`) and `/api/production/designs` (+ `[designID]`) CRUD, admin/dev gated.
    Used the clean **`/api/production/*`** namespace to sidestep the still-occupied legacy `/api/designs`
    (its mock base route has **no callers**; the gemstone subroutes `/create`,`/configure`,`/approve`
    are left intact + parked). `DesignsModel` reads are scoped to `designID` so legacy gemstone docs in
    the shared `designs` collection can't leak into the production catalog.
  - `/api/production/designs/estimate` — wires the estCost engine to live `metalPrices`.
- **Done (S3c — CAD upload):** `uploadDesignAsset` + `POST /api/production/designs/[designID]/assets`
  (multipart → S3 `efd-repair-images` bucket → appends URL to `cadFiles`/`renders`/`referenceImages`).
- **Deferred:**
  - **UI** (Drop/Design editors, STL upload, **meshMap builder**, live cost preview) → batched into a
    dedicated UI phase once the S4/S5 backends land. The meshMap builder is shared with S5 (products) +
    S7 (customs), so it's built once.
  - **cad-request absorption** as `cad` work orders → folds into **S4** (needs the My Bench work-order
    read-switch, which S4 introduces).
- **Done when:** create a drop, add a design with CAD + BOM + a computed cost estimate; a CAD
  request shows on a CAD Designer's bench.

## S4 — Pieces + routing

**Goal:** per-piece COGS; routing generates work orders across disciplines.
- **Migration:** none.
- **Code:** piece lifecycle; a design's `routing[]` spawns the piece's WOs (each with its
  discipline); labor capitalizes into `accruedLaborCost`/`totalCOGS`.
- **Done when:** make a piece; its bench WOs pay the artisans **and** roll into the piece's COGS.

## S5 — Piece → Product (reimagined)

**Goal:** clean Product model conforming to the storefront contract; completed piece becomes a
showcase listing with COGS-based pricing.
- **Contract:** the `products` collection is **shared with efd-shop and read directly** — build to
  [product-page-data-contract.md](./product-page-data-contract.md) exactly (field names normative,
  e.g. `productId`).
- **Migration:** reset/normalize the trash `products` data into the contract shape (S0 left it
  untouched; **confirm before prod**).
- **Code:**
  - product editor writes the contract shape: `productId`/`status`/`isPublic`,
    `pricing.retailPrice`(+`compareAtPrice`)/`price`, `availability`, `jewelry{}`, `images[]`, `viewer{}`
  - **3D media + meshMap builder:** upload GLB to S3 → call storefront `POST /api/glb/inspect` →
    render mapping UI from `meshNodeNames` pre-filled with `suggestedMeshMap` → save `viewer.glbUrl` +
    `viewer.meshMap`. `glbUrl` derives from the Design's GLB export.
  - `pricing.costBasis` = Piece COGS (stripped by storefront); piece→product link; availability
    derived from piece status; COGS-based suggested retail
  - enforce the contract §8 checklist before publish; ensure S3 CORS allows the storefront origin
- **Cross-app dependency:** `POST /api/glb/inspect` is hosted by **efd-shop**, not admin — admin calls it.
- **Done when:** a finished piece lists as a contract-valid product (photos / 3D / both) on efd-shop with
  real margin; stock reflects piece status.

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
- **3D viewer + share links** — build to [custom-design-viewer-contract.md](./custom-design-viewer-contract.md):
  attach `designModel` (same shape as product `viewer`; meshMap via shared `POST /api/glb/inspect`) and
  mint/revoke public share links via the `POST /api/custom-designs/tickets` actions
  (`updateDesignModel` / `createShareLink` / `setShareEnabled`). Writes go through those actions, **not**
  direct collection writes. Enforce the contract §8 checklist (esp. **no-PII `shareTitle`** + a visible
  "Revoke link" control). The `designModel.glbUrl` derives from the custom's Design GLB export.
- **Cross-app:** the `/d/<token>` share page + `/api/glb/inspect` are storefront-hosted; resolve whether
  `/api/custom-designs/tickets` is hosted by admin or efd-shop (and how it relates to admin's existing
  `/api/custom-tickets`) during the pre-work audit.
- **Done when:** every function that exists today still works; customs run through the same
  Design/Piece/Work-Order engine as production; and a custom can show an embedded 3D model + a working
  public share link.

---

## Parked (future, not scoped)

- Gemstone-listed-by-artisan + custom-design-on-a-gemstone flow.
- Artisan **minisites** (the fee model already accommodates them; UI/hosting is later).
