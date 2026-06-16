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
| `drops` | 🆕 | production releases/collections | S3 |
| `designs` | 🆕 | manufacturing spec + IP + estimated cost | S3 |
| `pieces` | 🆕 | physical instances + actual COGS + availability | S4 |
| `products` | ♻️ | sellable listing + price | S5 |
| `sales` / orders | 🕓 | sale event + fee resolution + payout | S5/S6 |
| `artisanAgreements` | 🕓 | per-artisan type + negotiated rates | S6 |
| `feeSchedule` | 🕓 | admin-configurable fee pillar rates | S6 |
| `inventory`, `inventoryTransactions`, `inventoryReorderSuggestions` | ⛔ | **data dropped** in S0 (junk). The *materials-inventory concept* (supply stock for cost mgmt — not products, not pieces) is **parked indefinitely** | S0 |

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

## `drops` 🆕 (S3)

| Field | Type | Notes |
|---|---|---|
| `dropID` | uuid | unique |
| `name` / `slug` / `theme` / `description` | string | |
| `channel` | enum | `showcase \| show \| online \| wholesale` |
| `status` | enum | `planning \| in_production \| released \| archived` |
| `targetReleaseDate` | date | |
| `createdAt` / `createdBy` | | |

---

## `designs` 🆕 (S3)

Reusable spec + IP. Absorbs the salvaged CAD estimator (`stlVolumeCalculator` + `metalTypes`).

| Field | Type | Notes |
|---|---|---|
| `designID` | uuid | unique |
| `dropID` | string? | optional |
| `name` / `description` | string | |
| `designerUserID` | string | |
| `cadFiles[]` / `renders[]` / `referenceImages[]` | string[] | S3 storage paths |
| `stlVolumeCm3` | number | from `stlVolumeCalculator` |
| `metalOptions[]` | array | metal/karat combos it can be made in |
| `bom` | object | `{ castingEstimate, stones[]{type,shape,size,qty,estUnitCost}, findings[]{materialID,qty}, estMaterialCost }` |
| `routing[]` | array | ordered ops: `{ seq, discipline, process, estLaborHours }` — becomes a piece's WOs |
| `estCost` | number | volume × SG × karat-adjusted price × casting markup + labor (per `metalTypes.js`) |
| `suggestedRetail` | number | |
| `status` | enum | `concept \| cad \| approved_for_production \| retired` |

**Indexes:** `{designID:1}` unique · `{dropID:1}` · `{status:1}`.

---

## `pieces` 🆕 (S4)

One physical instance. Where real COGS accrues and availability lives.

| Field | Type | Notes |
|---|---|---|
| `pieceID` | uuid | unique |
| `designID` | string | |
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
weight, dimensions, production }`, `images[]`, `viewer{ glbUrl, meshMap[], environment?, orientation?, … }`.

**Admin-internal fields (stripped/ignored by storefront):**

| Field | Notes |
|---|---|
| `pricing.costBasis` | **= Piece COGS** (stripped by storefront) — this is our `cost`/margin source |
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
