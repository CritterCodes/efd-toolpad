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
  - **Delete orphaned cross-DB cad/designs code + unify DB helpers → moved to the Tech-debt backlog**
    (see bottom). S3 *sidestepped* this by putting the catalog under `/api/production/*`, so the orphaned
    `/api/designs` mock route, the `jewelry-ecommerce` cross-DB route, and the two DB-connection patterns
    (`@/lib/database` vs `@/lib/mongodb`) **still exist**. Parked, no callers — cleaned up with S5.
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

## S4 — Pieces + routing — ✅ backend complete (UI deferred)

**Goal:** per-piece COGS; routing generates work orders across disciplines.
- **Migration:** `scripts/migrations/s4-pieces.mjs` — ensure piece indexes (additive; applied to DEV).
- **Done (S4a — pieces backend):**
  - `PiecesModel` (lifecycle status, actualMaterials, workOrderIDs, COGS fields) + `pieceCost.js`
    (`computePieceCosts`, unit-tested) — COGS = materials at cost + labor accrued from the piece's WOs.
  - `createPieceFromDesign` (`pieceRouting.js`) — a design's `routing[]` spawns one work order per step
    in its own discipline (`production_piece` source); single bench_jewelry step if no routing.
  - API: `/api/production/pieces` (+ `[pieceID]`, `/materials`, `/recompute`).
  - **End-to-end verified on DEV:** design (cad→bench→engraving) → 3 work orders in 3 disciplines;
    material + labor log → COGS roll-up (120 + 50 = 170).
- **Done (S4b — unified bench read-switch, the keystone deferred from S0):** `/api/bench/my-bench` +
  `benchQuery.js` read **work orders** (union: repair + piece + sale-service + cad), discipline-gated
  with a `bench_jewelry` fallback. Verified e2e on DEV: admin → all lanes; CAD designer → cad-only;
  untagged artisan → bench_jewelry only (no lockout, no cross-lane leak). Runs alongside the legacy
  `/api/repairs/my-bench`; the frontend switch happens in the UI phase.
- **Done (S4c — piece bench actions):** `claimPieceWorkOrder` (hard **lane enforcement** — a CAD designer
  can't claim a jeweler's work; untagged → jeweler fallback) + `completePieceWorkOrder` (logs labor to the
  unified `laborLogs` keyed by `workOrderID` → pays the artisan via payroll **and** re-rolls piece COGS).
  Endpoints `/api/bench/work-orders/[workOrderID]/{claim,complete}`. Verified e2e on DEV.
- **Re-homed:** legacy **cad-request absorption** → Tech-debt backlog (it belongs to the parked gemstone/
  cad-request flow). CAD *design work itself* already reaches a CAD designer's bench via a piece's `cad`
  routing step — proven in S4c.
- **Done when:** make a piece; its bench work orders pay the artisans **and** roll into the piece's COGS.

## S5 — Piece → Product (reimagined) — 🚧 backend bridge done (UI deferred)

**Goal:** clean Product model conforming to the storefront contract; completed piece becomes a
showcase listing with COGS-based pricing.
- **Contract:** the `products` collection is **shared with efd-shop and read directly** — build to
  [product-page-data-contract.md](./product-page-data-contract.md) exactly (field names normative,
  e.g. `productId`).
- **Finding:** the existing `products` schema is **already contract-aligned** (`productId`,
  `pricing.{retailPrice,compareAtPrice,costBasis}`, `seller`, `availability`, `references.designId`,
  `jewelry`, `images`, plus an existing product `viewer` route) — **no destructive reset needed**
  (the earlier "trash products" assumption predated the prod clone; DEV now mirrors prod's clean shape).
- **Done (S5a — bridge + validator):**
  - `src/services/products/productContract.js` — `validateProductContract` (contract §8, unit-tested)
    + `buildProductFromPiece` (`pricing.costBasis` = piece COGS, suggested retail = COGS × 2.5, links
    `references.designId`/`pieceID`, derives availability from piece status) + `suggestedRetailFromCOGS`.
  - `POST /api/production/pieces/[pieceID]/list-product` — creates a contract draft product from a piece,
    links piece↔product, marks the piece `available`. Verified e2e on DEV (COGS 100 → costBasis 100,
    retail 250, linked).
- **Remaining (UI phase):** product editor screen, 3D media + **shared meshMap builder** (via efd-shop
  `POST /api/glb/inspect`), publish flow wiring `validateProductContract` (§8 gate) + S3 bucket CORS.
- **Code (reference):**
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

## S6 — Marketplace + payouts — ✅ backend complete (admin UI deferred)

**Goal:** artisan listings, services-based fees, artisan payouts into unified payroll.
- **Audit (already built):** `sales-invoices/service.js` + `salePayouts` already record per-line payouts
  (`consignmentAmount`, `payoutAmount` = gross − consignment − labor deduction) and **converge into
  payroll** — the payroll service batches `salePayouts` by seller/week alongside labor logs (**D8 ✅**).
  The gap was a single **flat consignment rate** (`adminSettings.pricing.consignmentFeeRate`, default 0.20).
- **Done (S6a — fee model):** `src/services/billing/feeResolver.js` + `feeSchedule.js` — the
  services-continuum fee (D7): `resolveFee({lineTotal, context})` classifies consignment / hybrid /
  marketplace from custody + fulfillment and charges most→least (consignment ≥ hybrid ≥ marketplace).
  Configurable `feeSchedule` (rates are placeholders; consignment bundle defaults to the legacy flat
  rate). Backward-compatible (flat `consignmentRate` path reproduces current math). Unit-tested (3).
- **Done (S6b — integration):** `resolveFee` wired into `normalizeLineItems` — sale lines now carry
  `channel`/`custodyAtSale`/`fulfilledBy` + `feeMode`/`efdFee`; **default context = consignment**, so existing
  payouts are unchanged (verified e2e: default line = legacy math; marketplace line charges less + pays the
  seller more). `getSalesSettings` loads the schedule (consignment bundle = legacy `consignmentFeeRate`).
  `createPayoutEntries` needs no change (it reads `line.consignmentAmount`, now = the resolved fee).
- **Remaining (UI phase):** `seller`/`custody`/`listingSurfaces` controls on the product editor; admin
  fee-schedule + artisan-agreement settings screens.
- **Done when:** an artisan sale splits into EFD fee + artisan payout per the resolved schedule, and the
  payout appears in that artisan's payroll batch. (Minisites already supported — no new rules.)

## S7 — Customs — parallel NEW system (legacy frozen) — ✅ (UI: meshMap builder is a follow-up)

**Decision:** **strangler-fig.** Legacy `customTickets` is **frozen + marked legacy** (untouched; drains its
lifecycle). NEW customs run through a fresh **`customOrders`** collection on the production engine, with
**full billing parity** rebuilt cleanly. Lowest regression risk (legacy untouched); trades rebuild effort +
temporary dual UX. Pre-work audit / parity checklist: [s7-customs-audit.md](./s7-customs-audit.md).

**A custom = customer + Design + Piece(s) + billing** (D3), reusing S3–S5: Design/estCost, Piece/COGS, routed
work orders → unified bench → labor→payroll (owner draw) → margin. **Reuse** clients, notifications, the
3D-viewer/share contract — do NOT fork them.

**Labor model (the whole point):** custom fabrication labor flows to the bench → labor logs → payroll exactly
like repairs/production. The **bench labor log is the SINGLE source of custom-labor pay**; the quote stays
customer-revenue-only (no fee double-disbursed — verified: customs touch payroll nowhere today). Margin =
`quoteTotal − piece COGS` (incl. your labor).

Slices:
- **S7a — order entity ✅:** `customOrders` collection + model (CRUD, status + `statusHistory`) + migration
  (indexes). Reuse `clients`.
- **S7b — quote/financials ✅:** `customQuote.js` (`computeQuote` 40%-markup parity + `computeMargin`,
  unit-tested) wired into the model (auto-recompute `quoteTotal`; `marginFor` = quote − Σ piece COGS) +
  `/api/custom-orders` (+`[customID]`, `/quote`) CRUD. `billing.mode` carried.
- **S7c — billing parity ✅:** `customInvoices` (single-source, keyed by `customID`) + `paymentProgress.js`
  (unit-tested; **50% production threshold**) + `customInvoices.service.js` (create / mark-paid →
  progress + forward-only order advance to `in_production` at 50%) + API (`/invoices`, `/invoices/[id]`,
  `/payment-progress`). Notifications **fire-and-forget** (don't block the payment path on slow/failed email —
  improvement over legacy's blocking await). E2E verified: deposit → paid → 60% → production-ready + advanced.
- **S7d — bench linkage ✅:** `addProductionToCustomOrder` (`customProduction.js`) spawns a Design + Piece
  (with routed work orders) from a custom order and links both ways (`customOrderID` on the piece;
  `designIDs`/`pieceIDs` on the order); `POST /api/custom-orders/[customID]/production`. Reuses the S4
  engine → custom fabrication hits the unified bench → labor→payroll (owner draw) → COGS → margin.
  E2E verified end-to-end: custom → production → WO completed → labor logged → margin = quote − COGS.
- **S7e — 3D viewer + share ✅:** `customViewer.js` (`validateDesignModel` reusing product meshMap rules,
  unit-tested; `setDesignModel` / `createShareLink` [requires a model first] / `setShareEnabled`) + API
  (`PUT /design-model`, `POST`/`PUT /share`). Share URL = `${NEXT_PUBLIC_SHOP_URL}/d/<token>`; `share.token`
  indexed. E2E verified (model-gate, mint token, revoke/re-enable). **Cross-app ✅ DONE:** efd-shop's `/d/<token>`
  now resolves `customOrders` by `share.token` (repointed off `customTickets`).
- **S7f — legacy freeze + nav ✅:** legacy relabeled **"Custom Tickets (Legacy)"**; new **"Customs"** nav
  entry added (admin nav) → the new system is the primary intake path.
- **S7g — UI ✅ (core):** `/dashboard/customs` (list + create) + `/dashboard/customs/[customID]` (detail:
  quote + **margin**, invoices + **payment-progress bar**, create-invoice / mark-paid, **Start production →
  bench**). **Verified live via the preview harness** (list renders, detail renders, "Start production"
  spawned a Design + Piece). Follow-up: the rich **meshMap builder** UI (via `/api/glb/inspect`) + the
  design-model/share controls on the detail page (the APIs exist from S7e).

**Done when:** a new custom runs end-to-end (intake → quote → deposit/payment-progress → bench fabrication
paying labor → final → margin), legacy continues untouched, and the parity checklist holds for new customs.

---

## Parked (future, not scoped)

- Gemstone-listed-by-artisan + custom-design-on-a-gemstone flow.
- Artisan **minisites** (the fee model already accommodates them; UI/hosting is later).

## Tech-debt / cleanup backlog (don't lose these)

Tracked here so deferred cleanup can't fall through the cracks. Target: alongside **S5**.

- **Orphaned cross-DB code** — delete the `/api/designs` mock GET + `/api/cad-requests/[id]/volume`
  route (hardcoded `jewelry-ecommerce` DB) once the gemstone/cad-request flow is reconciled (S3 sidestepped
  these via `/api/production/*`; they have no callers).
- ✅ **Unify DB-connection helpers (DONE)** — collapsed `@/lib/mongodb` (`connectToDatabase`) into
  `@/lib/database` (`db.connect()`); `lib/mongodb.js` deleted, ~50 call sites migrated. One pattern now.
- **Drop junk `inventory*` collections** (`inventory`/`inventoryTransactions`/`inventoryReorderSuggestions`)
  — at cutover (materials-inventory is parked indefinitely; see README).
- ~~Reset trash `products` data~~ — **not needed**: the `products` schema is already contract-aligned
  (S5 finding). At most a light field-normalization pass at cutover if any legacy docs drift.
- **Legacy cad-request absorption** — convert the old gemstone-attached cad-requests
  (`products.cadRequests[]`) into `cad` work orders, as part of reconciling the parked gemstone flow.
  (New production CAD work already reaches the bench via piece `cad` routing steps — this is only the
  legacy data.) Nav de-cluttered 2026-06 (CAD Requests entries removed); the API + product-embedded
  "New CAD Request" dialog on jewelry/gemstone product pages remain until this is done.
- **customTickets deprecation — residuals (2026-06):** `efd-shop/lib/customDesignNotificationService` still
  has unreachable `customTickets` lookups (repoint when client-message/admin notifications get wired into the
  new `/orders` API); root `microservices/custom-tickets-service/` is now orphaned; `/dashboard/requests`
  page is navless (remove with the cad-request flow); the `customTickets` collection is retained (migrated,
  not dropped) — drop it as a deliberate step once confident.
- **Scrub legacy AWS-S3 image URLs → MinIO** — migrated customOrders carry `efd-repair-images.s3…` URLs
  (see the scrub-s3 task); rewrite to MinIO so images resolve off the new storage.

## Deferred UI phase (batched, build once backends are proven)

UI **is** verifiable via the Claude Preview harness: `npm run dev:preview` (port-less; `scripts/dev-preview.mjs`
points NEXT_PUBLIC_URL/NEXTAUTH_URL at the preview origin so credentials auth works in-instance), launched via
`.claude/launch.json`. Auth: a disposable DEV admin (`dev-preview-admin@efd.local`) seeded in the DEV `users`
collection. Verified login → dashboard renders with live DEV data. (Screenshots time out in this env — the
renderer never idles — but `preview_snapshot`/`preview_inspect`/`preview_eval` give precise structural + style
verification, which the tooling prefers anyway.) Screens were deferred for *sequencing*, not capability — batch
them once the backends are proven:

Sequenced sub-phases (value + dependency). Recommended order U1→U6.

- **U1 — Unified bench ✅:** new page `/dashboard/bench` reading `/api/bench/my-bench` (all sources,
  discipline-gated) — lane chips, source enrichment (Repair · client / Piece · design), claim/complete for
  production-piece WOs, "Open repair" for repair WOs. Built **alongside** the live `/dashboard/repairs/my-bench`
  (no regression); nav entry "Bench (All Work)". **Verified live:** renders 2 active repair-sourced WOs with
  correct lanes/sources/status. (Production-piece claim/complete wiring uses the S4c-verified endpoints.)
  **Workflow-parity rebuild (2026-06) — unify on the workOrders model:** the first cuts (bare table, then a
  card grid) were missing the repair flow's tabs + features. Decision (user): **unify the full repair workflow
  onto the work-order surface** rather than keep two benches or read-only repairs. Implementation:
  - **`services/workOrders/workOrderWorkflow.js`** — source-agnostic bench projection. `deriveWorkOrderQueue(wo)`
    reuses `repairWorkflow.getWorkflowProjection` for repair WOs (the WO mirrors the repair's status/assignedTo,
    kept fresh by `RepairsModel.updateById → syncFromRepair`) and maps piece statuses for production/custom WOs.
    Queue is **derived, never stored** → cannot drift from the repair. `BENCH_TABS` (Mine/Unclaimed/Communications/
    Needs Parts/QC), `isWorkOrderInTab`. Client-safe (no server-only imports — inlines the `'repair'` source string;
    importing the WO model would pull `@/lib/database`+`crypto` into the client bundle and crash it).
  - **`services/bench/benchActions.js`** + **`/api/bench/work-orders/[workOrderID]/[action]`** — one unified action
    surface. Repair WOs delegate to the exact `repairWorkflow` builders + `RepairsModel` (auto-resyncs the WO →
    zero divergence from the legacy `/api/repairs/*` routes); piece WOs use `pieceWorkOrderActions`. Authorization
    mirrors `requireRepairOps(cap)` per action. Replaced the two static `claim`/`complete` bench routes.
  - **`benchQuery.js`** now attaches the derived queue (+ repair enrichment incl. `picture` for the thumbnail).
  - **`/dashboard/bench`** rebuilt to full parity with `/dashboard/repairs/my-bench`: tabs + counts, scan-to-claim
    (text + `ContinuousBarcodeScanner` camera, batch claim via `/api/repairs/{id}/claim`), "Move My Bench to QC"
    bulk, QC selection + "Approve to Payment & Pickup" bulk, per-card Needs-Parts dialog (Stuller lookup / manual
    material), jeweler-assign dropdown (admin), `RepairThumbnail`, due dates — all driven through the one action
    endpoint. **Verified live (DEV):** moved a repair through Move-to-QC → QC tab card → bulk Approve → off bench,
    each step resyncing the WO. No schema migration (purely additive: derived reads + new endpoints + UI).
  - Faithful to main: in-progress work assigned to others shows only under its assignee's "My Bench" (admins use
    this same tab logic). Tests: `workOrderWorkflow.test.js` (7) green; `repairWorkflow.test.js` (7) unaffected.
  - **QC gate unified across ALL sources (2026-06):** pieces (production AND customs — customs reach the bench as
    `production_piece` WOs via S7d) now move through the SAME gate as repairs: claim → in progress → **Move to QC**
    → bulk **Approve to Payment & Pickup**. `pieceWorkOrderActions.js` refactored to mirror repairs — labor is
    logged at the **move-to-QC** transition (was at completion), QC approval finalizes + re-rolls COGS. `loadPieceWorkOrder`
    accepts `production_piece` + `custom_piece`. **Verified live (DEV):** custom order → Start production → piece WO
    Unclaimed → Claim → Move to QC → QC tab → bulk Approve → off bench; the labor log surfaces in labor-review
    (`sourceAction: piece_move_to_qc`, unbatched, flagged for review) → payroll picks up custom labor like repair labor.
    Sale-service is repair-backed, so it already had the full gate.
  - **Consolidated to a single "My Bench" (2026-06):** the unified bench now SERVES at `/dashboard/repairs/my-bench`
    (the familiar URL — all ~7 existing links keep working) and is titled "My Bench". The standalone `/dashboard/bench`
    is now a redirect → my-bench; the "Bench (All Work)" nav entry was removed (one "My Bench" entry remains). The
    legacy repair-only page was parked at `deprecated/dashboard-repairs-my-bench/page.js` (outside the app router → not
    a route; safe to delete once proven in prod). **`/api/repairs/my-bench` API stays live** — the artisan-detail view
    (`users/artisans/[userID]`) reads it with a `?userID=` param. **Page design archetype for U2–U6:** `REPAIRS_UI`
    tokens + header-panel / metric-card / filter-bar / card-grid / snackbar (see Customs UI below), not plain tables.
- **Customs UI ✅ (S7 system, restyled with U1):** `/dashboard/customs` (list) + `/dashboard/customs/[customID]`
  (detail) rebuilt to the same archetype — list: metric cards (total/in-production/awaiting-payment/pipeline),
  status filter, clickable order-card grid, dark "New Custom" dialog; detail: header + status chip, styled Quote
  panel (line items, gold total, margin/COGS), Production panel (start → bench), Invoices & Payment panel (themed
  progress bar + table), dark quote/invoice dialogs, snackbar. **Verified live** against DEV (created a test order,
  confirmed list card + detail render).
- **U2 — Production catalog:** Drops / Designs (+ STL upload + live cost estimate) / Pieces editors.
- **U3 — meshMap builder (shared):** GLB upload → `/api/glb/inspect` → assign meshes → save. **Reused by U4 +
  customs 3D (U6)** — build once. (Trickiest single component; reuse existing STL/GLB viewer components.)
- **U4 — Product editor:** reimagined product CRUD to the contract shape + publish gate (uses U3).
- **U5 — Marketplace admin:** fee-schedule editor + artisan-agreement screens (S6).
- **U6 — Polish:** billing-mode selector (S1), admin "shop board" (all lanes), customs design-model/share
  controls (uses U3).

Established UI conventions (from S7g): `'use client'` page, MUI, `fetch` the API directly; verify live via
the preview harness (session persists as `dev-preview-admin`; use `preview_snapshot`/`eval` not screenshots;
React inputs need native-setter+dispatch; navigate with absolute `http://localhost:3099/...`).
