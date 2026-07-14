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
| `drops` | ♻️ | release/production workspace that owns Designs and publishes eligible listings together | PP revision |
| `collections` | ♻️ | smart/manual merchandising rules resolving Products; independent from Drops | PP revision |
| `designs` | 🆕 | reusable jewelry spec + edition policy + embedded Variants; CAD optional | S3/PP |
| `pieces` | 🆕 | physical instances + actual COGS + availability | S4 |
| `products` | ♻️ | sellable listing + price | S5 |
| `sales` / orders | 🕓 | sale event + fee resolution + payout | S5/S6 |
| `customTickets` | 🟢 frozen/legacy | existing custom system — **frozen**, drains its lifecycle, untouched | S7 |
| `customOrders` | 🆕 | NEW customs on the production engine (customer + Design + Piece(s) + billing) | S7 |
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
| `sourceType` | enum | `repair \| production_piece \| custom_piece \| sale_service \| design` |
| `sourceID` | string | id of the source doc (repairID / pieceID / saleID …) |
| `seq` | int | routing order within the source (1, 2, 3 …) |
| `discipline` | enum | `bench_jewelry \| cad \| casting \| engraving \| gem_cutting` — gates claiming |
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
`casting`→Caster/Jeweler, `engraving`→Hand Engraver, `gem_cutting`→Gem Cutter.

**Indexes:** `{workOrderID:1}` unique · `{sourceType:1, sourceID:1}` · `{assignedToUserID:1, status:1}` · `{discipline:1, status:1}` · `{status:1}`.

**Claim rule:** a user may self-claim a WO only if `discipline ∈ user.artisanTypes`. Off-lane
WOs are excluded from My Bench. Owner unrestricted; admins may assign across lanes.

**My Bench query:** `{ assignedToUserID: me }` ∪ `{ discipline: { $in: myDisciplines }, status: claimable, assignedToUserID: null }`.

**Sale-service (S2):** sale-driven service (a resize, etc.) is delivered as a **repair-backed work order**
(`sourceType: 'repair'`) tagged with `saleContext`, comped via S1, with labor deducted from the seller
payout — *not* a standalone `sale_service` source. `sale_service` remains reserved. Design CAD work
uses `sourceType: design` with the Design as the durable source record.

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

## `drops` ♻️ (Production Pipeline revision) — release and production workspace

A Drop owns Designs and coordinates a shoppable release. It is not a Collection. See
`catalog-domain.md` and `collection-page-data-contract.md` (retained filename; now the Drop page
contract). Existing Drop/Collection records are disposable test data and will be reset after snapshot.

| Field | Type | Notes |
|---|---|---|
| `dropId` | uuid | stable internal + cross-ref key |
| `slug` | string | **shop URL handle**, unique (drop page) |
| `name` / `description` | string | No required `theme` field. |
| `ownerType` | enum | `efd` (house/collaborative) \| `artisan` (artisan-created). |
| `ownerId?` / `ownerInfo?` | string/object | required for artisan-owned Drops |
| `channels[]` | enum[] | `showcase \| show \| online \| wholesale` |
| `status` | enum | `draft` (building/staging) \| `scheduled` (releaseAt set) \| `released` (live/dropped) \| `archived`. Replaces legacy `isPublished` + drops' status. |
| `releaseAt?` | date | scheduled release moment |
| `releasedAt?` | date | actual release timestamp |
| `designOrder[]` | string[] | optional ordered Design IDs for the Drop workspace/page |
| `heroImage?` / `thumbnail?` / `image?` / `seo?` | | merchandising |
| `createdAt` / `updatedAt` / `createdBy` | | |

**Ownership:** EFD Drops may contain Designs from multiple artisans. Artisan-created Drops are owned by
that artisan. Design collaborators and Product sellers remain the attribution/payout source.

**Release:** resolve the Drop's Designs by `design.dropId`, validate and freeze the eligible Product set,
then atomically publish that set and mark the Drop released. At least one eligible listing is required.
Ineligible Designs remain draft and are returned with actionable errors. The shop renders
`/drops/<slug>`.

**Indexes:** `{dropId:1}` unique · `{slug:1}` unique · `{ownerType:1,ownerId:1}` ·
`{status:1,releaseAt:1}`.

---

## `collections` ♻️ (Production Pipeline revision) — smart merchandising

A Collection resolves Products through rules and manual overrides. It does not own Designs/Pieces and
has no production or release responsibilities.

| Field | Type | Notes |
|---|---|---|
| `collectionId` | uuid | stable internal ID |
| `slug` | string | unique shop handle |
| `name` / `description` / `seo` / `media` | | merchandising |
| `status` | enum | `draft \| published \| archived` |
| `rules` | object | composable predicates over controlled fields, metadata, and tags |
| `manualIncludes[]` / `manualExcludes[]` | string[] | Product IDs overriding rule results |
| `pinned[]` | array | ordered `{ productId, position }` overrides |
| `createdAt` / `updatedAt` / `createdBy` | | |

Initial rule fields are product type, jewelry category, artisan/collaborators, Drop, edition type,
offer type, customizer enabled, metal/karat, price range, status/channels, metadata, and tags. Rules are
evaluated server-side against visible Products. One Product may appear in many Collections.

**Indexes:** `{collectionId:1}` unique · `{slug:1}` unique · `{status:1}`.

---

## `designs` 🆕 (S3)

Reusable jewelry specification + IP. A Design persists before and after Pieces are made. CAD is optional:
CAD-cast and hybrid methods use revisioned STL/GLB/QC; handmade may skip those gates. Every sellable
Design requires at least one embedded Variant. COGS remains on Piece.

| Field | Type | Notes |
|---|---|---|
| `designID` | uuid | unique |
| `dropId` | string? | optional; one Drop owns the Design; null supports backlog/evergreen work |
| `gemstoneId` | string? | linked stone's `productId` (Pipeline goal) — optional; threads to Piece → Product |
| `name` / `description` / `story` | string | merchandising identity |
| `category` / `attributes` / `tags[]` / `metadata` | | controlled fields plus extensible tags/metadata |
| `primaryArtisanId` | string | primary owner/seller attribution |
| `collaborators[]` | array | `{ userId, roles[], credit?, addedAt }`; collaboration is encouraged |
| `edition` | object | `{ type: one_of_one \| limited \| unlimited, limit?, allocated, nextNumber }`; Design-wide across Variants |
| `productionMethod` | enum | `cad_cast \| handmade \| hybrid` |
| `intake` | object | brief, target materials/stones/dimensions, budget, desired date, notes |
| `cadRevisions[]` | array? | revisioned sketches/references/STL/GLB/renders/mesh map + author/QC history |
| `referenceImages[]` / `sketches[]` | string[]? | MinIO paths; drafts may save with only these |
| `stlVolumeCm3` | number? | from `stlVolumeCalculator`. **Optional** (no CAD → no volume). |
| `variants[]` | array | concrete base SKUs/configurations; see below; at least one before listing |
| `bom` | object? | `{ castingEstimate, stones[]{type,shape,size,qty,estUnitCost}, findings[]{materialID,qty}, estMaterialCost }`. **Optional.** |
| `routing[]` | array? | ordered ops: `{ seq, discipline, process, estLaborHours }` — becomes a piece's WOs. **Optional** (handmade → no routing). |
| `estCost` | number? | volume × SG × live material price + casting + stones + labor. Optional until requirements exist. |
| `suggestedRetail` | number | |
| `primaryProductId` | string? | one storefront Product projection for this Design |
| `status` | enum | `draft \| cad_requested \| cad_in_progress \| cad_qc \| ready \| retired` |

### Embedded Variant

| Field | Type | Notes |
|---|---|---|
| `variantId` / `sku` | string | stable unique identifiers |
| `label` / `active` | | admin/shop presentation and availability gate |
| `options` | object | concrete metal, karat, finish, stone configuration, etc. |
| `ringSize?` | number/string | one nominal size; omit for non-rings |
| `sizingAllowance?` | object | `{ min, max }`; requests outside are special requests/new Piece review |
| `pricing` / `leadTimeDays` | | base pricing inputs/output and production promise |
| `viewer` | object? | GLB + base mesh map; may include Refrakt `customizable` constraints |
| `production` | object | dimensions and configuration-specific manufacturing requirements |

Refrakt selections are immutable order/Piece snapshots, not automatically persisted catalog Variants.

**Edition allocation:** reserve the next Design-wide number atomically when physical production begins.
Numbers are not consumed by drafts/plans and are never reused after physical work begins, including scrap.

**Indexes:** `{designID:1}` unique · `{dropId:1}` · `{primaryArtisanId:1}` · `{status:1}` ·
`{variants.sku:1}` unique sparse.

---

## `pieces` 🆕 (S4)

One physical instance. Real COGS and ready-to-ship availability live here. Normal Pieces come from a
Design Variant, automatically after a made-to-order purchase or manually from the Design workspace.
Handmade/on-hand intake still creates a minimal Design + Variant so provenance and edition rules remain
consistent; it skips CAD/Refrakt rather than bypassing the domain model.

| Field | Type | Notes |
|---|---|---|
| `pieceID` | uuid | unique |
| `designID` | string | parent Design |
| `variantId` | string | concrete base Variant |
| `resolvedConfiguration` | object | immutable exact options/Refrakt selection made for this Piece |
| `editionNumber` | int? | allocated atomically when physical production begins |
| `gemstoneId` | string? | linked stone's `productId` (Pipeline goal) — carried from the Design; threads to Product |
| `dropId` | string? | denormalized Design Drop for reporting |
| `sku` / `serialNumber` | string | serialization scheme TBD in S4 |
| `metalType` / `karat` / `finish` | string | actual configuration made |
| `ringSize?` | number/string | exact physical size; omit for non-rings |
| `dimensions` / `weight` / `stones[]` | | actual as-built facts |
| `actualMaterials[]` | array | `{ materialID, description, qty, unitCost }` — **at cost, no markup** |
| `accruedMaterialCost` | number | |
| `workOrderIDs[]` | string[] | routing steps on benches |
| `accruedLaborCost` | number | rolled up from labor logs across those WOs |
| `totalCOGS` | number | materials + labor |
| `status` | enum | `planned \| casting_ordered \| in_finishing \| qc \| completed \| available \| reserved \| sold \| scrapped \| returned` |
| `productID` | string? | link once listed |
| `customerID` | string? | present when this piece is a custom |
| `billing` | object? | present when custom (retail/quoted) |

**Production start:** the guarded transition out of planning allocates edition capacity and number in
the same atomic operation. Cancellation before that transition consumes no edition slot.

**Indexes:** `{pieceID:1}` unique · `{designID:1,variantId:1}` · `{status:1}` · `{productID:1}` ·
`{designID:1,editionNumber:1}` unique sparse.

**Availability is exact:** ready-to-ship quantity is the count of `available` Pieces matching the
Variant/resolved configuration. Other Piece states never count.

---

## `products` ♻️ (S5) — **storefront-read shape**

⚠ efd-admin and efd-shop **share the `products` collection**; the storefront reads documents
**directly** (no API). The shape is therefore dictated by the storefront — see
[product-page-data-contract.md](./product-page-data-contract.md) (**authoritative**; field names &
casing are normative, e.g. `productId` not `productID`). Admin (S5) writes exactly that shape.

**Storefront-read fields (must match the contract):** `productId` (string handle), `status` /
`isPublic`, `title`, `vendor`, `description`, `pricing.retailPrice` (+`compareAtPrice`) or top-level
`price`, Design-level edition projection, Variant offers (`ready_to_ship` and/or `made_to_order`),
`jewelry{ type, … }`, `images[]`, `viewer`, `productType`, and provenance references. One Product may
offer exact ready-to-ship Pieces and a separate made-to-order/customizer path at the same time.

Top-level `price`, `availability`, `jewelry.ringSize`, and `viewer` remain compatibility summaries for
existing shop surfaces. For Design-backed jewelry they are derived from the primary/default Variant;
they are not independently editable sources of truth. Variant pricing, sizing, viewer configuration,
and computed offers are authoritative.

### Types, Variants, offers, editions, and gemstone thread

| Field | Type | Notes |
|---|---|---|
| `productType` | string | `gemstone` \| `jewelry`; never `concept`. A jewelry Product may be made to order without a Piece. |
| `designId` | string? | parent Design for jewelry listings |
| `defaultVariantId` | string? | selected active Variant used for initial shop state and derived compatibility summaries |
| `variants[]` | array | storefront projection of active Design Variants: identity/options/pricing/viewer/sizing and computed offers |
| `variants[].offers` | object | `readyToShip{ pieceIDs[], quantity }?` plus `madeToOrder{ enabled, leadTimeDays, customizerEnabled }?` |
| `edition` | object | Design-wide `{ type: one_of_one \| limited \| unlimited, limit?, allocated, remaining? }` across all Variants/configurations |
| `references.gemstoneId` | string? | originating gemstone's `productId`, threaded Design → Piece → Product (the flywheel). Optional; shop-read (enables "cut from this stone"). |

The production collections retain their existing `designID`/`pieceID` identifiers. The storefront
Product projection intentionally uses contract-cased `designId`/`productId`; projection code maps the
identifiers explicitly at that boundary.

**Made-to-order financials:** Variant pricing is derived from the Design estimate with live material
rates. A made-to-order offer uses estimated cost until its Piece exists; an exact ready-to-ship offer
uses that Piece's actual COGS. Keep estimate and actual separate so reported realized profit never treats
an estimate as actual.

**Admin-internal fields (stripped/ignored by storefront):**

| Field | Notes |
|---|---|
| `pricing.costBasis` | Piece COGS for exact ready-to-ship offers or Design/Variant estimate for made-to-order; stripped by storefront |
| `pricing.costBasisSource` | `estimated` \| `actual` — whether `costBasis` is a live-metal estimate or real produced COGS (Pipeline goal) |
| `references` | `{ designId?, pieceIDs[]?, gemstoneId? }` — provenance links |
| `internalNotes` | stripped by storefront |
| `seller` | `{ type: house \| artisan, artisanId? }` (marketplace, S6) |
| `custody` | `consignment \| artisan_held` (S6) |
| `listingSurfaces[]` | `efd_shop \| minisite \| in_store` (S6) |
| `pieceIDs[]` | backing Piece inventory; offers derive only from matching `available` Pieces |

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
