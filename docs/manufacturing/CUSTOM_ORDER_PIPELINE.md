# EFD Custom-Order Pipeline — As Built (the backbone)

> Reverse-engineered from the live code on `efd-toolpad@main` (the S7 customs system; the legacy
> `customTickets` system is frozen). Everything here is verified against code, not docs. This is the
> reference for designing the new **Production** pipeline, which is "this, minus the customer, plus
> gemstone linking." See §13 for that mapping.

---

## 1. The big picture (one paragraph)

A **custom order** is a parent record for one client's bespoke commission. It carries two "brains":
a **customer-facing quote** (estimated cost × markup = the price the client pays) and, once it reaches
the bench, a **real COGS** accrued from actual materials + logged labor. It spawns a **Design** and one
or more **Pieces**, and those Pieces spawn **Work Orders** onto the **same shared bench + payroll that
repairs use**. That last fact is the crux: custom labor is credited and paid through the shared
`laborLogs`/`payrollBatches` machinery — there is no customs-specific labor system. The order's status
is mostly a **CRM/billing state**; the real *fabrication* state lives on the child work orders. And the
**quote is the production plan** — the labor lines you type into the quote are what later become bench
work orders.

**Happy path:** create → consult/design → assign a CAD designer → CAD models it (STL for casting, GLB
for the web viewer) → peer-QC the CAD → build + publish the quote → client pays a deposit (≥50% flips
it to "in production") → casting is ordered and **received** (this generates the bench work orders) →
bench jewelers claim/build/QC each work order (labor credited) → admin marks QC → completed → delivered.

---

## 2. Lifecycle & state machine

**Order status** (`CUSTOM_ORDER_STATUS`, `src/app/api/custom-orders/model.js`). Forward-only by rank;
every change appends to `statusHistory[] {status, changedAt, changedBy, reason}`.

```
pending → consultation → design → quote → deposit → in_production → qc → completed → delivered
  (rank 0)     (1)         (2)     (3)      (4)          (5)         (6)     (7)         (8)
                                        └───────── (any) → cancelled (rank 99) ─────────┘
```

- **Admin-driven (manual PUT):** pending, consultation, design, quote, qc, completed, delivered, cancelled.
- **System-driven (payment only, forward-only):** first invoice paid → **deposit**; cumulative ≥50% of
  quote total paid → **in_production**.
- **Client milestone notifications** fire on entering: `design`, `in_production`, `qc`, `completed`,
  `delivered` (not the others).
- **`→ completed`** additionally awards the client-management bonus (see §6).

> Key idea: the order status is a **billing/CRM lane**. Actual making progress = the child work orders'
> statuses, which the order status does **not** automatically track.

**Work-order status** (the real fabrication state):
```
READY FOR WORK → IN PROGRESS → QC → COMPLETED     (CAD reject: QC → IN PROGRESS)
```
**Invoice status:** `pending_payment → paid` (or `cancelled`).

---

## 3. Data model

Collections: `customOrders`, `customInvoices`, `workOrders`, `pieces`, `designs`, `laborLogs`,
`payrollBatches`, `businessExpenses`.

### `customOrders` (the parent)
Key: `customID` (`CO-<ts36>-<uuid6>`). Grouped by purpose:

- **Identity/client:** `customID`, `clientID` (→ `clients`), `createdBy`, `customerName/Email/Phone`
  (snapshots), `createdAt/updatedAt`.
- **Descriptor:** `title`, `description`, `type` (default `custom-design`), `priority`, `isRush`.
- **Status:** `status`, `statusHistory[]`.
- **Commission spec (what the client wants):** `jewelryType`, `metalType`, `karat`, `goldColor`,
  `size`, **`gemstones[]`** (⚠ free-form/unstructured — raw array, no sub-schema; also feeds the quote
  as cost lines), `budget`, `timeline`, `dueDate`, `specialRequests`.
- **Collaboration (embedded):** `notes[]` (internal|client_visible), `communications[]` (client|internal
  threads, inbound|outbound), `images[]` (moodboard, MinIO-stored).
- **Assignments (embedded):** `assignments[] {id, userID, name, role:'cad'|'bench', artisanType,
  feeSnapshot, commsAccess, assignedAt, assignedBy}`. ⚠ There is **no** scalar `designerId/casterId/
  benchId` — all artisan linkage is here (role-tagged) + on the spawned work orders.
- **Production linkage:** `designIDs[]` (→ `designs`), `pieceIDs[]` (→ `pieces`, the COGS source).
- **Quote (the customer price — see §7):** `centerstone{item,cost}`, `mounting{item,cost}`,
  `accentStones[]`, `additionalMaterials[]`, **`laborTasks[]`** (the production plan — each carries
  `hours`, `discipline`, `noWorkOrder`), `shippingCosts[]`, `castingCost`, `designFee`, `glbFee`,
  `qcReviewFee`, `rushMultiplier`, `isRush`, `quotePublished`, `cogMarkup`, `cog`, `quoteTotal`
  (pre-tax), `taxRate`, `taxAmount`, `total` (tax-incl).
- **Billing/casting/viewer/bonus:** `billing{mode: retail|wholesale|internal|comped}`,
  `castingReceivedAt`, `productionGeneratedAt` (idempotency guard), `clientMgmtBonus*`,
  `designModel{glbUrl, meshMap[], ...}`, `shareTitle`, `share{token, enabled, createdAt}`.

### Related collections (key links)
- **`customInvoices`** — one row per invoice, `customID` FK, `type: deposit|progress|final|partial`,
  `amount` (tax-incl), `status`, Stripe fields. No stored balance/line-items; progress is derived.
- **`workOrders`** — source-agnostic bench unit. `sourceType` (customs use **`production_piece`**),
  `sourceID` = **pieceID**, `discipline: bench_jewelry|cad|engraving|gem_cutting`, `cadStage: design|glb`,
  `status`, `assignedToUserID`, `flatFee`, `tasks[] {process, estLaborHours}`, `files{stl,glb}`.
- **`pieces`** — the COGS spine. `pieceID`, `designID`, **`customOrderID`** (back-pointer to the order),
  `gemstoneId` (⚠ null for customs today), `actualMaterials[]` (incl. casting line), `workOrderIDs[]`,
  `accruedLaborCost`, `totalCOGS`, `status`, `productID`.
- **`designs`** — `designID`, `gemstoneId` (⚠ null for customs today), artisan/collaborator credits,
  CAD revisions, Variants, routing, and revised lifecycle
  `draft|cad_requested|cad_in_progress|cad_qc|ready|retired`. One-way: order references it.
- **`laborLogs`** — per-work-order labor credit (shared with repairs). `workOrderID` FK,
  `primaryJewelerUserID`, `creditedLaborHours`, `laborRateSnapshot`, `creditedValue`, `sourceAction`,
  `pendingQc` (held until QC), `payrollBatchID`, `payrollStatus`.
- **`payrollBatches`** — per-person, per-week payout; links to labor via `logIDs[]`.

### Relationship map
```
clients ─▶ customOrders ─┬─ embeds: notes[], communications[], images[], assignments[], quote{}, statusHistory[]
                         ├─ designIDs[]  ─▶ designs                    (one-way ref)
                         ├─ pieceIDs[]   ─▶ pieces  (piece.customOrderID points back)
                         │                    └─ workOrderIDs[] ─▶ workOrders (sourceType=production_piece, sourceID=pieceID)
                         │                                             └─ laborLogs.workOrderID ─▶ payrollBatches.logIDs[]
                         └─ customID ◀── customInvoices (1→many)
```
- Order→invoices: referenced (1→many). Order→designs/pieces: referenced arrays (+ piece back-pointer).
- **Order→work orders is INDIRECT — always through a Piece.** No `custom_piece`-sourced WO in practice.
- Order→labor/payroll: WO → laborLogs → payrollBatches (no direct custom FK).
- **Margin** = `quote.quoteTotal − Σ pieces.totalCOGS` (casting, labor, materials all land in piece COGS).

---

## 4. Work orders & disciplines

- **Disciplines:** `bench_jewelry`, `cad`, `engraving`, `gem_cutting` (each self-claimable only by the
  matching artisan role; admins bypass).
- **Two ways WOs are created for a custom** (both idempotent):
  1. **CAD WO** — spawned when a CAD designer is assigned (`assignArtisan → spawnCustomWorkOrder`,
     `cadStage:'design'`; a second WO for `cadStage:'glb'`). Flat-fee, pre-assigned, status IN PROGRESS.
  2. **Bench WOs** — spawned **in bulk at casting-received** (`generateWorkOrdersFromQuote`), one WO per
     discipline lane derived from `quote.laborTasks`. Guarded by `productionGeneratedAt`; re-synced by
     `syncQuoteToWorkOrders` when the quote is edited.
- **Assignment:** self-claim at the bench (lane-enforced), admin pre-assignment, or admin `split-task`.
- **Completion & labor:** `move-to-qc` logs labor (held `pendingQc`), status → QC; `complete-from-qc`
  releases the labor, status → COMPLETED, re-rolls piece COGS. CAD WOs use `cad-qc-approve/reject`
  (peer review; author can't review own work).
- **Bench actions** (all `POST /api/bench/work-orders/[id]/[action]`): `claim`, `move-to-qc`,
  `complete-from-qc`, `cad-submit-qc`, `cad-qc-approve`, `cad-qc-reject`, `split-task`.

---

## 5. Casting flow

Casting is modeled as an **outside casting-house purchase**, recorded when it **arrives** — there is
**no `casting` work-order discipline** and **no separate "mountings ordered/received" state machine**
today. The single `addCastingCost` call *is* the "received" event.

- **Route:** `POST /api/custom-orders/[customID]/casting` → `addCastingCost` (`customProduction.js`).
- **Body:** `amount` (required), `vendor`, `invoiceNumber`, `notes`, `paymentMethod`, `status`.
- **Three idempotent effects:**
  1. Upserts a `casting`-category material line onto the **piece** (→ COGS → margin).
  2. Writes a **`businessExpenses`** ledger entry (`sourceReferenceType:'custom_order'`, vendor invoice #).
  3. **Generates the bench work orders** from `quote.laborTasks` (the "metal is in hand → bench can start" gate).
- Stamps `castingReceivedAt` + `productionGeneratedAt`; notifies assigned artisans.
- Pre-casting, the CAD **STL** upload computes `stlVolumeCm3`, which the quote's Mounting line uses to
  **estimate** metal cost (`designCost.js`, with a 1.3× casting-house markup baked in).

> ⚠ This is exactly the area your production pipeline wants richer: a **"what needs ordering from the
> casting house" board** and explicit **mounting-ordered → casting-received** tracking. Today it's a
> single "record the casting cost" action.

---

## 6. Labor & crediting

**Custom orders have no labor fields.** All labor is written to the shared `laborLogs` collection, same
as repairs. Credit points:

1. **Bench work → move-to-QC** (`movePieceToQc`): credits the WO's **assigned jeweler**,
   `creditedLaborHours = Σ tasks.estLaborHours × laborRateSnapshot`, `sourceAction:'piece_move_to_qc'`,
   held `pendingQc:true`.
2. **CAD QC approval** (`approveCadQc`): the designer's flat `flatFee` (`cad_design_fee`) + the reviewer's
   flat QC fee (`cad_qc_review`, once per piece). CAD uploads log no hourly labor — CAD is paid its flat fee here.
3. **Order completion** (`awardClientMgmtBonus`): if the assigned CAD designer sent ≥1 outbound
   client-thread message, they earn `margin × clientMgmtBonusPct` (default 5%), logged as `client_mgmt_bonus`.

**Who's credited:** designer (CAD flat fee), QC reviewer (flat fee), bench jeweler (hours × rate),
designer again (client-mgmt bonus). **Caster is NOT credited labor** — casting is a purchased material.

**Credit release:** labor accrues at move-to-QC but is **not payable until QC approves** (`releasePendingQc`
flips `pendingQc` off → becomes a payroll candidate).

**Labor rate** (`getLaborRateSnapshotForUser`, precedence): global shop `wage` (adminSettings) wins first;
else the user's `employment.hourlyRate`; else 0 (forces admin review). Skill multipliers exist
(Basic 75% → Expert 150%); CAD "rate" is a flat per-user `customDesignFee`.

---

## 7. Pricing / cost (the two brains)

**Quote = customer price** (self-contained single-COG-bucket model, `customQuote.js` → `computeQuote`;
NOT the catalog `PricingEngine`):
```
cog        = materials + labor + shipping + casting + design + glb + qc
quoteTotal = cog × cogMarkup × (isRush ? rushMultiplier : 1)     // pre-tax
total      = quoteTotal + quoteTotal × taxRate                   // customer-billed
```
Config (adminSettings.financial): `cogMarkup` (per-quote override → settings → default **2.5**),
`rushMultiplier` (default **1.5**), `taxRate`, `targetMarginFloor` (analytics, default 45%).
`normalizeQuote()` snapshots `cog/quoteTotal/taxRate/taxAmount/total` on every quote save.

**Real COGS = cost basis** (`pieceCost.js → computePieceCosts`): `accruedMaterialCost` (Σ actual
materials incl. casting) + `accruedLaborCost` (Σ labor-log `creditedValue`) = `totalCOGS`, re-rolled
whenever materials/labor change.

**Margin** (`marginFor`): `quote.quoteTotal − Σ piece.totalCOGS`. So the estimated price is set at quote
time; the true cost accrues as work happens; margin reconciles them.

---

## 8. Invoicing & payment

- **Model** `customInvoices`: `type: deposit|progress|final|partial`, `amount` (tax-incl), `status:
  pending_payment|paid|cancelled`, Stripe fields. No stored balance — progress is derived on read.
- **Create:** admin sets amount + type (UI offers deposit = `depositPct%` default 50 / full / custom).
- **Progress** (`computePaymentProgress`, pure): sums *paid* invoices ÷ `quote.total`; yields `totalPaid`,
  `remainingAmount` (running balance), `hasReached50`, `isFullyPaid`, `canStartProduction`.
- **Pay two ways:** admin marks paid (`cash|card|stripe|other`), or **Stripe Checkout**
  (`POST .../invoices/[id]/checkout` → hosted link emailed → `POST /api/stripe/webhook`
  `checkout.session.completed` marks it paid). No Stripe SDK — direct REST.
- **On paid → forward-only order advance:** first payment → `deposit`; ≥50% → `in_production` (fires
  `payment-threshold-reached`).

---

## 9. Payroll

Custom labor rides the **shared repair-payroll pipeline** (same `laborLogs`, same batches).
- Batch = **per-artisan, per-week** (Monday). Candidates = labor logs with `requiresAdminReview:false`
  **and** `pendingQc:false` (so custom labor is payable only after QC releases it), unbatched.
- States: batch `DRAFT → FINALIZED → PAID` (or `VOID`); log `UNBATCHED → BATCHED → PAID`.
- **Paid manually by admin.** Owner/in-house work pays as an owner draw.

---

## 10. UI surfaces (`/dashboard/customs`)

- **List:** metric cards (Total, In production, Awaiting payment, Rush, Pipeline $), filter/search/sort,
  cards with status/rush chips + thumbnail + price. **New-custom stepper** (Client → Spec → Review).
- **Detail:** status timeline stepper (+ change-status), live margin, payment progress. Tabs:
  - **Overview** → `PUT .../[id]`
  - **Quote** → `PUT .../quote` (also re-syncs work orders)
  - **Invoices** (inline) → create / Stripe link / mark paid; shows the **"50% reached — order the parts"** callout
  - **Production** → work orders, **Casting received** action, Piece COGS + margin, STL/GLB downloads
  - **Assignment** → assign/remove artisans (CAD/bench)
  - **Notes / Communications / Images** → the embedded collab arrays
  - **3D & Share** → the viewer + share (see §11)

---

## 11. Media / 3D / share

- **Images (moodboard):** uploaded to self-hosted **MinIO** (S3 SDK), keyed under
  `admin/custom-orders/{customID}/moodboard/`.
- **3D design model:** `order.designModel = {glbUrl, meshMap[], ...}` — **same shape as a product
  `viewer`**. Set via `PUT .../design-model` → validates the REFRAKT meshMap (metal finishes / gem
  presets from the shared `productContract`). STL (metal-only, for casting) and GLB (web viewer) are
  uploaded **on the bench**, each its own CAD work order.
- **Client share:** `POST .../share` mints a token (requires a saved GLB) → login-free, `noindex`
  storefront viewer at `{SHOP_URL}/d/{token}` showing only the model + a non-PII title. GLB passing
  CAD-QC auto-enables the share.

---

## 12. API reference (custom-orders)

| METHOD path | Purpose |
|---|---|
| GET/POST `/api/custom-orders` | list (`?status`,`?clientID`) / create (→pending) |
| GET/PUT `/api/custom-orders/[id]` | get (+margin) / update fields+status |
| PUT `/api/custom-orders/[id]/quote` | save quote, recompute total, re-sync bench WOs |
| POST `/api/custom-orders/[id]/assignments` · DELETE `…/[assignmentID]` | assign (cad/bench) / remove |
| GET `/api/custom-orders/assignable-artisans` | assignable artisans + CAD fee |
| GET/POST `/api/custom-orders/[id]/invoices` | list+progress / create invoice |
| PUT `…/invoices/[invoiceID]` · POST `…/invoices/[invoiceID]/checkout` | mark paid / Stripe link |
| GET `/api/custom-orders/[id]/payment-progress` | % paid + production-ready flag |
| POST `/api/custom-orders/[id]/casting` | record casting → COGS + expense + generate bench WOs |
| POST `/api/custom-orders/[id]/production` | spawn Design+Piece+routed WOs (bulk) |
| GET/POST `/api/custom-orders/[id]/work-orders` | list child WOs / spawn one |
| PUT `/api/custom-orders/[id]/design-model` | set REFRAKT 3D model |
| POST/PUT `/api/custom-orders/[id]/share` | mint / revoke share link |
| POST/DELETE `…/notes` · GET/POST `…/communications` · POST/DELETE `…/images` | collaboration surfaces |
| GET `/api/custom-orders/task-suggestions` | labor-task autocomplete |
| POST `/api/bench/work-orders/[id]/[action]` + `/upload-stl` + `/upload-glb` | unified bench |
| POST `/api/stripe/webhook` | marks custom invoices paid |

---

## 13. Backbone mapping → the new PRODUCTION pipeline

Production = **this pipeline with NO customer, plus gemstone linking**. Concretely:

**Reused as-is (the whole spine already exists):**
- Design + Piece + Work-Order fan-out, the unified bench (claim/QC/labor), `laborLogs` + payroll,
  piece COGS/`totalCOGS`, the casting-received → bench-WO generation hinge, the `designModel` 3D viewer
  + share, and `list-product` (piece → store product, `POST /api/production/pieces/[id]/list-product`).

**Dropped / changed (no customer):**
- No `clientID`/client snapshot, no **customer invoices / deposit / payment-progress**, no
  quote-published-to-client, no client-mgmt bonus, no client-thread comms.
- **Trigger differs:** custom starts on a client commitment (deposit → 50% → produce). Production starts
  from a Drop/Design decision. A made-to-order listing may publish before a Piece exists; purchase creates
  the planned Piece, and the production-start transition allocates its edition slot. An exact available
  Piece creates a ready-to-ship offer.
- **Price:** a custom is priced by the `quote` (customer-facing). A production item is priced from the
  **design/piece cost estimate → markup** (there's already `designCost.estimateDesignCost` +
  `pieces.totalCOGS`); it needs a "suggested retail" surfaced on the Design/Product, not a client quote.
- **Edition and offer model** (new dimension): Design-wide one-of-one, limited, or unlimited capacity;
  made-to-order and exact Piece-backed ready-to-ship offers. This rides on Design edition policy,
  Product Variant offers, and Piece status, not on the make-steps.

**The single missing hand-off — gemstone linking:** the fields already exist (`designs.gemstoneId`,
`pieces.gemstoneId`, `products.references.gemstoneId`) but the custom→spawn path
(`addProductionToCustomOrder` / `ensureCustomPiece`) **drops the stone**. The production pipeline must
thread a chosen gemstone (a `productType:'gemstone'` product) from the design → piece → listed product,
so a made piece stays linked to the stone it was cut for.

**New surfaces production needs that customs lacks:**
1. A **"needs ordering from casting house"** board across open production items (customs records casting
   per-order after the fact; production wants a queue).
2. Explicit **mounting-ordered → casting-received** tracking (today it's one `addCastingCost` event).
3. A **Design-to-Product made-to-order** path where a Design can list without a physical Piece;
   `concept` is not a type or customer label.
4. Design-wide **edition controls** (one-of-one / limited / unlimited), Variants, and exact Piece-backed
   ready-to-ship offers.
