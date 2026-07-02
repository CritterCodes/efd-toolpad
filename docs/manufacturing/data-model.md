# Canonical Data Model

**This file is the single source of truth.** Update it in the same PR as any data change.
Status legend: 🟢 live · 🆕 new · ♻️ reimagined/rewritten · 🕓 deferred (shape sketched, finalized in its sprint) · ⛔ abandoned.

---

## Collection map

| Collection | Status | Role | Sprint |
|---|---|---|---|
| `workOrders` | 🆕 | source-agnostic bench unit (the spine) | S0 |
| `laborLogs` | ♻️ (was `repairLaborLogs`) | per-WO labor credit | S0 |
| `payrollBatches` | ♻️ (was `repairPayrollBatches`) | frozen weekly payout batches | S0 |
| `repairs` | ♻️ | a WO source; keeps billing, loses bench/labor fields | S0/S1 |
| `collections` | ♻️ (absorbs `drops`) | unified Collection ≡ Drop — curated product group + scheduled release (shop-read) | S3/PP |
| ~~`drops`~~ | ⛔ merged | **deprecated** — folded into `collections` (PP M1-T5 migration) | S3 |
| `designs` | 🆕 | manufacturing spec + IP; CAD/estimate **optional** | S3 |
| `pieces` | 🆕 | physical instances + actual COGS + availability | S4 |
| `products` | ♻️ | sellable listing + price | S5 |
| `sales` / orders | 🕓 | sale event + fee resolution + payout | S5/S6 |
| `customTickets` | 🟢 frozen/legacy | existing custom system — **frozen**, drains its lifecycle, untouched | S7 |
| `customOrders` | 🆕 | NEW customs on the production engine (customer + Design + Piece(s) + billing) | S7 |
| `designRequests` | 🟢 legacy (World 1) | peer design-request seed; broken writes; rebuilt onto the engine in PP M6 | S3/PP |
| `artisanAgreements` | 🕓 | per-artisan type + negotiated rates | S6 |
| `feeSchedule` | 🕓 | admin-configurable fee pillar rates | S6 |
| `inventory`, `inventoryTransactions`, `inventoryReorderSuggestions` | ⛔ | **data dropped** in S0 (junk). The *materials-inventory concept* (supply stock for cost mgmt — not products, not pieces) is **parked indefinitely** | S0 |

_Sprint "PP" = the Production Pipeline goal (hub: `team/goals/production-pipeline.md`)._

---

## `workOrders` 🆕 (S0)

The unit that lands on a bench. Knows nothing about customers or pricing.

| Field | Type | Notes |
|---|---|---|
| `workOrderID` | uuid | unique |
| `sourceType` | enum | `repair \| production_piece \| custom_piece \| sale_service \| cad_request` |
| `sourceID` | string | id of the source doc (repairID / pieceID / saleID …) |
| `seq` | int | routing order within the source (1, 2, 3 …) |
| `discipline` | enum | `bench_jewelry \| cad \| engraving \| gem_cutting` — gates claiming |
| `title` | string | short label |
| `description` | string | |
| `metalType` / `karat` | string | context for process/material pricing |
| `isRush` | bool | |
| `promiseDate` | date | |
| `status` | enum | `READY FOR WORK \| IN PROGRESS \| NEEDS PARTS \| COMMUNICATION REQUIRED \| QC \| COMPLETED` (+ legacy repair statuses during transition) |
| `assignedJeweler` | string | display name (snapshot) |
| `assignedToUserID` | string | claimer/assignee |
| `claimedAt` / `completedAt` | date | |
| `requiresLaborReview` | bool | multi-artisan flag |
| `qcBy` / `qcDate` | string/date | QC is a status + permission, **not** a discipline |
| `tasks` | array | processes performed (drives labor); from `processes`/`universalTasks` |
| `saleContext` | object? | `{ salesInvoiceID, salesLineID }` when the work is attached to a sale (S2) — null otherwise |
| `createdAt` / `updatedAt` / `createdBy` | date/string | |

**Discipline ↔ artisanType map:** `bench_jewelry`→Jeweler, `cad`→CAD Designer,
`engraving`→Hand Engraver, `gem_cutting`→Gem Cutter.

**Indexes:** `{workOrderID:1}` unique · `{sourceType:1, sourceID:1}` · `{assignedToUserID:1, status:1}` · `{discipline:1, status:1}` · `{status:1}`.

**Claim rule:** a user may self-claim a WO only if `discipline ∈ user.artisanTypes`. Off-lane
WOs are excluded from My Bench. Owner unrestricted; admins may assign across lanes.

**My Bench query:** `{ assignedToUserID: me }` ∪ `{ discipline: { $in: myDisciplines }, status: claimable, assignedToUserID: null }`.

**Sale-service (S2):** sale-driven service (a resize, etc.) is delivered as a **repair-backed work order**
(`sourceType: 'repair'`) tagged with `saleContext`, comped via S1, with labor deducted from the seller
payout — *not* a standalone `sale_service` source. The `sale_service` / `cad_request` sourceType values
remain reserved for future sources that have no repair record.

---

## `laborLogs` ♻️ (S0 — was `repairLaborLogs`)

Per-WO labor credit. Shape unchanged except the key generalizes from `repairID` → `workOrderID`.

| Field | Type | Notes |
|---|---|---|
| `logID` | uuid | |
| `workOrderID` | string | ← replaces `repairID` |
| `sourceType` / `sourceID` | enum/string | denormalized for reporting by source |
| `primaryJewelerUserID` / `primaryJewelerName` | string | |
| `creditedLaborHours` | number | set in labor review |
| `laborRateSnapshot` | number | from `user.employment.hourlyRate` |
| `creditedValue` | number | hours × rate |
| `sourceAction` | enum | `move_to_qc \| mark_complete \| admin_adjustment` |
| `requiresAdminReview` | bool | multi-artisan |
| `adminReviewedBy` / `adminReviewedAt` / `notes` | | |
| `weekStart` | date | ISO week Monday |
| `payrollBatchID` / `payrollStatus` / `payrolledAt` | | `unbatched \| batched \| paid` |

**Indexes:** `{workOrderID:1}` · `{sourceType:1, sourceID:1}` · `{primaryJewelerUserID:1, weekStart:1}`.

---

## `payrollBatches` ♻️ (S0 — was `repairPayrollBatches`)

Frozen weekly payout per person. Already aggregates `logIDs` + `salePayoutIDs`; that
polymorphism is the convergence point for labor + owner draws + artisan payouts.

Key fields: `batchID`, `userID`, `userName`, `weekStart`, `weekEnd`,
`status (draft|finalized|paid|void)`, `laborHours`, `laborPay`, `logIDs[]`,
`salePayoutIDs[]`, `paidAt`, `paymentMethod`, `paymentReference`, `notes`.

---

## `repairs` ♻️ (S0/S1)

Stays the customer/billing record for repairs; **emits one `workOrders` doc** (seq 1,
discipline `bench_jewelry`). Bench/assignment/labor fields move to the WO. Gains:

| Field | Type | Notes |
|---|---|---|
| `billing.mode` | enum | `retail \| wholesale \| internal \| comped` (S1) |
| `billing.compReason` | string | when comped (`comp` / `included_with_sale`) |
| `billing.approvedBy` / `billing.approvedAt` | | |

Billing mode is resolved via `src/services/billing/modes.js` (`resolveBillingMode`): explicit
`internal`/`comped` win, then legacy `compRepair`/`includedWithSale`→`comped`, then
`isWholesale`/explicit→`wholesale`, else `retail`. `internal`/`comped` zero the **customer** charge
(both labor-review and invoice paths) but never the labor payout.

---

## `collections` ♻️ (S3 → Production Pipeline goal) — Collection ≡ Drop (**shop-read**)

**Absorbs the legacy `drops` collection.** One object is both a curated product group and a timed release
("drop"). ⚠ **shop-read shape** for the customer drop page — see the companion
`collection-page-data-contract.md` (authoritative) + decision 0003.

| Field | Type | Notes |
|---|---|---|
| `collectionId` | uuid | stable internal + cross-ref key |
| `slug` | string | **shop URL handle**, unique (drop page) |
| `name` / `description` / `theme?` | string | |
| `ownerType` | enum | `efd` (house, collaborative/multi-artist) \| `artisan` (single-owner). Replaces legacy `type: artisan\|admin\|drop`. |
| `ownerId?` / `ownerInfo?` | string/object | set for `artisan` collections (curator + attribution) |
| `channel?` | enum | `showcase \| show \| online \| wholesale` (production-planning; from `drops`) |
| `status` | enum | `draft` (building/staging) \| `scheduled` (releaseAt set) \| `released` (live/dropped) \| `archived`. Replaces legacy `isPublished` + drops' status. |
| `releaseAt?` | date | scheduled release moment |
| `releasedAt?` | date | actual release timestamp |
| `members[]` | array | ordered `{ productId, position, notes?, addedAt? }` — members are **Products** (any `productType`) |
| `heroImage?` / `thumbnail?` / `image?` / `seo?` | | merchandising |
| `createdAt` / `updatedAt` / `createdBy` | | |

**Ownership:** EFD (collaborative) drops group many artisans' products; each member Product keeps its own
`seller`, and payouts follow the seller via the S6 payout system. The collection `ownerType`/`ownerId` is
the **curator**, not the revenue owner.

**Release:** members are staged while `status: draft`; at `releaseAt` (or "go live now") the batch publishes
to the shop at once (`status → released`). The exact publish trigger (admin scheduled job vs. shop
`releaseAt`-visibility) is **decision 0003** (Lead Shop's call). Shop shows a collection when `released`
(+ `releaseAt ≤ now` if the visibility-based mechanism is chosen).

> **`drops` deprecated:** folded into `collections` by Pipeline goal M1-T5 (migration). `design.dropID`
> becomes provenance-only — a design "joins" a drop by having its concept/jewelry Product added to
> `members[]`, not via `dropID`.

---

## `designs` 🆕 (S3)

Reusable spec + IP. Absorbs the salvaged CAD estimator (`stlVolumeCalculator` + `metalTypes`).
**CAD/estimate is optional** (Production Pipeline goal): a design may be **concept-only** (viewer/GLB
assets for a refrakt listing, no CAD/routing) or a **full manufacturing spec**. `cadFiles`,
`stlVolumeCm3`, `bom`, `routing`, `estCost` are all nullable; COGS (on the Piece) is what's always recorded.

| Field | Type | Notes |
|---|---|---|
| `designID` | uuid | unique |
| `dropID` | string? | optional — **provenance only** now; drop membership is via a Product in `collections.members[]` |
| `gemstoneId` | string? | linked stone's `productId` (Pipeline goal) — optional; threads to Piece → Product |
| `name` / `description` | string | |
| `designerUserID` | string | |
| `cadFiles[]` / `renders[]` / `referenceImages[]` | string[]? | storage paths (MinIO); `renders`/GLB feed a concept listing's viewer. **Optional.** |
| `stlVolumeCm3` | number? | from `stlVolumeCalculator`. **Optional** (no CAD → no volume). |
| `metalOptions[]` | array | metal/karat combos it can be made in |
| `bom` | object? | `{ castingEstimate, stones[]{type,shape,size,qty,estUnitCost}, findings[]{materialID,qty}, estMaterialCost }`. **Optional.** |
| `routing[]` | array? | ordered ops: `{ seq, discipline, process, estLaborHours }` — becomes a piece's WOs. **Optional** (handmade → no routing). |
| `estCost` | number? | volume × SG × karat-adjusted price × casting markup + labor. **Optional**; for concepts, computed with **live metal rates**. |
| `suggestedRetail` | number | |
| `status` | enum | `concept \| cad \| approved_for_production \| retired` (lifecycle; distinct from `productType`) |

**Indexes:** `{designID:1}` unique · `{dropID:1}` · `{status:1}`.

---

## `pieces` 🆕 (S4)

One physical instance. Where real COGS accrues and availability lives. A Piece may be created
**directly** (handmade / on-hand, with a bare or no Design) — the estimate path is optional, COGS is
always recorded (Production Pipeline goal).

| Field | Type | Notes |
|---|---|---|
| `pieceID` | uuid | unique |
| `designID` | string? | **optional** — null for a handmade/on-hand piece with no design spec |
| `gemstoneId` | string? | linked stone's `productId` (Pipeline goal) — carried from the Design; threads to Product |
| `dropID` | string? | |
| `sku` / `serialNumber` | string | serialization scheme TBD in S4 |
| `metalType` / `karat` | string | chosen for THIS piece |
| `actualMaterials[]` | array | `{ materialID, description, qty, unitCost }` — **at cost, no markup** |
| `accruedMaterialCost` | number | |
| `workOrderIDs[]` | string[] | routing steps on benches |
| `accruedLaborCost` | number | rolled up from labor logs across those WOs |
| `totalCOGS` | number | materials + labor |
| `status` | enum | `planned \| casting_ordered \| in_finishing \| qc \| completed \| available \| reserved \| sold \| scrapped \| returned` |
| `productID` | string? | link once listed |
| `customerID` | string? | present when this piece is a custom |
| `billing` | object? | present when custom (retail/quoted) |

**Indexes:** `{pieceID:1}` unique · `{designID:1}` · `{status:1}` · `{productID:1}`.

**Availability is derived:** a Product's "in stock" = count of its pieces with `status: available`.

---

## `products` ♻️ (S5) — **storefront-read shape**

⚠ efd-admin and efd-shop **share the `products` collection**; the storefront reads documents
**directly** (no API). The shape is therefore dictated by the storefront — see
[product-page-data-contract.md](./product-page-data-contract.md) (**authoritative**; field names &
casing are normative, e.g. `productId` not `productID`). Admin (S5) writes exactly that shape.

**Storefront-read fields (must match the contract):** `productId` (string handle), `status` /
`isPublic`, `title`, `vendor`, `description`, `pricing.retailPrice` (+`compareAtPrice`) or top-level
`price`, `availability` (`ready-to-ship` | `made-to-order`), `jewelry{ type, metals[], ringSize,
weight, dimensions, production }`, `images[]`, `viewer{ glbUrl, meshMap[], environment?, orientation?, … }`,
plus (Production Pipeline goal — decision 0004, **accepted by Lead Shop**): `productType`,
`runSize{ type, size?, remaining? }`, `references.gemstoneId`.

### Polymorphic types + editions + gemstone thread (Production Pipeline goal)

| Field | Type | Notes |
|---|---|---|
| `productType` | string | `gemstone` \| `concept` \| `jewelry` (existing field; **`concept` is new**). `gemstone` = listed loose stone; `concept` = a Design listed with no finished Piece (made-to-order, live-metal priced); `jewelry` = finished/piece-backed. Absent → treat as `jewelry`. |
| `runSize` | object | `{ type: one_of_one \| limited \| unlimited, size?, remaining? }`. `size` required for `limited` (edition cap N). `remaining` = **admin-computed, shop-read** = `size − produced` (count of pieces created for this product); present for `limited` only. Shop renders edition **language** ("One of one" / "Edition of N" / "Made to order"), and "N remaining" only when `remaining` is provided — never as a stock/inventory count. A **production cap**, not stock; availability still derives from piece status (D6). Absent → `unlimited`. |
| `references.gemstoneId` | string? | originating gemstone's `productId`, threaded Design → Piece → Product (the flywheel). Optional; shop-read (enables "cut from this stone"). |

**Concept financials (like customs):** a `concept` product's `pricing.retailPrice` is derived from the
Design's `estCost` computed with **live metal rates** (stored on the doc, refreshed by admin — the shop
reads a number, not a live calc). `pricing.costBasis` holds the **estimated** design cost until a Piece is
produced + linked, then flips to the Piece's **actual** COGS (same as `buildProductFromPiece`); margin =
`retailPrice − costBasis`. `pricing.costBasisSource` (`estimated | actual`, admin-internal) records which,
so reported profit is never estimated-as-real.

**Admin-internal fields (stripped/ignored by storefront):**

| Field | Notes |
|---|---|
| `pricing.costBasis` | **= Piece COGS** (or estimated design cost for a `concept`; stripped by storefront) — our `cost`/margin source |
| `pricing.costBasisSource` | `estimated` \| `actual` — whether `costBasis` is a live-metal estimate or real produced COGS (Pipeline goal) |
| `references` | `{ designId?, pieceID?, gemstoneId? }` — provenance links (note existing casing: `designId` / `pieceID`) |
| `internalNotes` | stripped by storefront |
| `seller` | `{ type: house \| artisan, artisanId? }` (marketplace, S6) |
| `custody` | `consignment \| artisan_held` (S6) |
| `listingSurfaces[]` | `efd_shop \| minisite \| in_store` (S6) |
| `pieceIDs[]` | backing Piece inventory (optional; availability derived from their status) |

Media has three cases (photos / 3D / both); `viewer.meshMap` is built in admin via the storefront's
`POST /api/glb/inspect`. `viewer.glbUrl` derives from the Design's exported GLB. Enforce the contract's
§8 validation checklist before publish; S3 bucket must send CORS for the storefront origin.

---

## `sales` / orders 🕓 (S5/S6) — sketch

Captures the fee-resolution inputs at sale time; produces an artisan payout.

| Field | Type | Notes |
|---|---|---|
| `channel` | enum | `in_store \| efd_shop \| minisite` |
| `custodyAtSale` | enum | `consignment \| artisan_held` |
| `fulfilledBy` | enum | `efd \| artisan` |
| `feeBasis` | object | resolved pillars (storefront/custody/fulfillment) |
| `efdFee` | number | resolver output |
| `artisanPayout` | number | sale total − efdFee → feeds payroll via `salePayouts` |
| `pieceID` | string? | the consumed piece (status → reserved → sold) |

---

## `customTickets` 🟢 FROZEN/legacy (S7)

**Frozen** — not extended; existing tickets drain their lifecycle on the legacy code/UI (relabeled
"Custom Tickets (Legacy)"). NEW customs go to `customOrders` (below), which reuses the same 3D-viewer/share
contract. The legacy 3D-viewer/share fields still apply to any legacy ticket that adopts them — see
[custom-design-viewer-contract.md](./custom-design-viewer-contract.md) (authoritative):

| Field | Type | Notes |
|---|---|---|
| `ticketID` | string | key |
| `designModel` | object | `{ glbUrl, meshMap[], environment?, orientation?, background? }` — same shape as product `viewer` |
| `shareTitle` | string | non-PII title shown on portal + public share page |
| `share` | object | `{ token, enabled, createdAt }` — set by the API (createShareLink / setShareEnabled) |
| `designLink` | string | LEGACY Shapr3D link; shown only if `designModel` absent |

Admin actions (`POST /api/custom-designs/tickets`): `updateDesignModel`, `createShareLink`,
`setShareEnabled`. The `meshMap` is built via the shared `POST /api/glb/inspect` (same as products).
The share page `/d/<token>` is storefront-hosted; admin only mints/revokes the token.

## `customOrders` 🆕 (S7) — NEW customs on the production engine

A custom = customer + Design + Piece(s) + billing, with full billing parity. Reuses the engine
(Design/estCost, Piece/COGS, routed work orders → bench → labor→payroll, billing modes) + the 3D-viewer
contract + `clients` + notifications.

| Field | Type | Notes |
|---|---|---|
| `customID` | string | key (`CO-{ts}-{rand}`) |
| `clientID` | string | reuse `clients` |
| `customerName` / `customerEmail` / `customerPhone` | string | snapshot/contact |
| `title` / `description` / `type` / `priority` | | |
| `status` / `statusHistory[]` | enum / array | lifecycle (`{status, changedAt, changedBy, reason}`) |
| `designIDs[]` / `pieceIDs[]` | string[] | engine linkage (fabrication → bench → COGS) |
| `quote` | object | `{ materialCosts[], laborCost, laborHours, castingCost, shippingCost, designFee, rushMultiplier, markup(0.40), quoteTotal }` — customer price (revenue) |
| `billing` | object | `{ mode }` (S1) |
| `designModel` / `shareTitle` / `share` | | 3D viewer + share link (per the viewer contract) |
| `createdAt` / `updatedAt` / `createdBy` | | |

**Invoices** for customs live in a single source keyed by `customID` (deposit / progress / final /
partial; payment-progress; **50% production threshold** → notify) — preserving legacy *behavior* without the
embedded-vs-collection dual-write. **COGS** comes from linked pieces; **margin = `quote.quoteTotal` −
Σ piece COGS** (incl. your bench labor). The **bench labor log is the single source of custom-labor pay**;
the quote is customer-revenue only.

## `designRequests` 🟢 legacy (World 1) — peer design-request seed

The original gemstone/design-request flow: a `designRequests` doc links a **gemstone `product`**
(`gemstoneId`) to a requested/submitted design. **Currently half-broken** (create throws — missing
`getServerSession` import; `complete` only flips gemstone flags, spawns no production) and **disconnected
from the production engine.** Fields as-is: `gemstoneId`, `status`, `requirements`, `priority`, `dueDate`,
`requestedBy`, `assignedTo`, `assignedAt`.

**Fate (Production Pipeline goal M6 — strangler-fig):** rebuilt onto the engine so "produce" spawns a real
Design + Piece via `createPieceFromDesign` (gemstone-linked), and the stub UI is filled. Not extended
until then; documented here so the SoT acknowledges it.

## Fee model 🕓 (S6) — services continuum

EFD's cut = composition of the **service pillars** it renders for a sale:

| Pillar | Present when |
|---|---|
| **Storefront** | efd_shop / in_store / minisite (minisite = mostly artisan's own traffic) |
| **Custody** | EFD physically holds the goods (consignment) |
| **Fulfillment** | EFD picks/packs/ships |

- **Consignment fee** = Storefront + Custody + Fulfillment (highest).
- **Marketplace fee** = Storefront only (lowest).
- **Hybrid** (e.g. minisite + EFD custody/fulfillment) = marketplace base + add-ons → between.

Rates live in **`feeSchedule`** (admin-configurable) and per-artisan overrides in
`artisanAgreements`. **Actual percentages are deferred — not yet decided.**

---

## Salvaged assets (keep, don't rebuild)

- `src/utils/stlVolumeCalculator.js` — STL → volume (divergence theorem) + bounding box.
- `src/constants/metalTypes.js` — specific-gravity cost model (karat/purity adjust, casting markup, labor).
- STL/OBJ/GLB viewer components (`src/components/viewers/*`).

## Abandoned (delete/ignore, do not migrate)

- `inventory`, `inventoryTransactions`, `inventoryReorderSuggestions` — **data** is junk, dropped in S0.
  Note: this is NOT a rejection of materials-inventory as a *capability* — that concept (supply stock
  for cost management, distinct from products/pieces) is **parked indefinitely**, to be reimagined later.
- `src/app/api/designs/route.js` mock-designs GET; `src/app/api/cad-requests/[id]/volume/route.js`
  (hardcoded `jewelry-ecommerce` DB); the `@/lib/mongodb` connection helper (unify on `lib/database.js`).
