# EFD Production Pipeline — Flow Spec (agent reference)

> Companion to `Custom Order Pipeline.dc.html` (the interactive swimlane chart, in Claude Design project
> eea2db91-d414-4b02-b531-75b9f9ba576e). This is the same model in prose, structured so an agent can reason
> about the flow without opening the diagram. Builds on the code-verified custom-order backbone in
> `CUSTOM_ORDER_PIPELINE.md` (referenced as "backbone §N"). Authored by the owner in Claude Design 2026-07-11.

---

## 0. TL;DR

The pipeline is **source-agnostic**. Two entry sources produce jewelry through **one shared spine**:

- **Custom order** — client-driven. A client commissions a piece; billing/CRM gates (quote → invoice → 50% deposit) precede fabrication.
- **Drop or standalone Design** — owner-driven. A Drop owns a release's Designs; backlog/evergreen
  Designs may remain outside a Drop. No client or deposit gate.

Both sources converge on the shared core: **Design → Variant → optional CAD (STL/GLB + materials) →
price (one engine) → planned Piece → production start/edition allocation → casting/bench → COGS →
listing/delivery.** A Design
persists and may produce many Pieces. Work orders are keyed by `sourceType` + `sourceID`, so the same
bench and payroll serve repairs, customs, CAD requests, and production.

Two jobs run through the whole thing, at fixed points:
1. **LABOR credit** — who worked, credited into shared `laborLogs`.
2. **PRICE** — cost estimate → markup → a price (a customer quote for custom; a suggested/live retail for production).

---

## 1. Lanes (actors / responsibility bands)

| Lane | Owns |
|---|---|
| **Client / Billing** *(custom only)* | quote publish, invoices, deposit/50% gate, final payment, delivery |
| **Owner / Admin** | order creation, spec, assignment, quote build, margin, completion |
| **Design / CAD / Listing** | Design intake, Variants, CAD requests/uploads/QC, pricing, Refrakt config, listings |
| **Casting surface** | needs-ordering board, Carrera vendor orders, casting-received |
| **Bench + Payroll** | in-house casting WO, bench work orders, QC, completion, payroll |

Legend: **[LABOR]** = labor-credit point · **[PRICE]** = price calc · **[NEW]** = surface that did not exist in the backbone · **[shared]** = source-agnostic.

---

## 2. State vocabulary (use these exact names)

- **Order status** (custom only, forward-only): `pending → consultation → design → quote → deposit → in_production → qc → completed → delivered` (+ `cancelled`).
- **Work-order status**: `READY FOR WORK → IN PROGRESS → QC → COMPLETED` (reject: `QC → IN PROGRESS`).
- **Piece status**: `planned → casting_ordered → in_finishing → qc → completed → available → reserved → sold`,
  with terminal/exception paths `scrapped | returned` where applicable.
- **Design status**: `draft → cad_requested → cad_in_progress → cad_qc → ready → retired`.
- **Invoice status** (custom only): `pending_payment → paid | cancelled`.
- **Casting** [NEW]: `needs_ordering → ordered → received` (backbone had only the single `received` event).
- **Gemstone link**: `Design.gemstoneId → Piece.gemstoneId → Product.references.gemstoneId`; the stone's own piece flips `reserved` (on sale) → `sold` (on delivery).

---

## 3. Entry — the two sources

### 3a. Custom order (client-driven)
1. **START** — client commissions a piece.
2. **Create custom order** → `status: pending`.
3. **Consultation & spec** → `consultation`. jewelryType, metal/karat, `gemstones[]` (free-form), budget, moodboard.
4. **Assign CAD designer** → `design`. `assignments[] role:cad` spawns flat-fee CAD WOs. → shared CAD (§4).

### 3b. Drop / standalone Design (owner-driven)
1. **START** — EFD or an artisan opens a Drop, or creates a backlog/evergreen Design without a Drop.
2. **Create Design draft** with ownership/collaborators, edition policy, at least one planned Variant,
   sketches/references, tags/metadata, and production method. Drafts may remain incomplete.
3. **DECISION — CAD-modeled, or handmade?** [NEW]
   - **CAD-modeled/hybrid** → request CAD from a named artisan or the open CAD queue (§4).
   - **Handmade** → handmade sub-flow (§7). No STL/GLB or Refrakt requirement.

---

## 4. Shared CAD (both sources) — two upload+QC gates

Optional first: **Link gemstone (optional)** [NEW, shared] — pick a `productType:'gemstone'` Product → set `Design.gemstoneId`. Threads forward to Piece and Product.

1. **Request CAD** [shared] — a Design brief with sketches/references creates Design-sourced CAD work
   orders, assigned to a specific CAD artisan or the open queue. Do not create a separate design-request
   domain record.
2. **Upload revisioned STL** [shared] — `stlVolumeCm3` → metal weight for pricing.
3. **QC — STL** [shared] — peer review (author cannot review their own work). Reject → `IN PROGRESS`.
4. **Upload GLB & assign materials** [shared] — GLB + mesh map validated against `productContract`.
5. **QC — GLB + materials** [shared, LABOR] → `WO: COMPLETED`. Approval credits the designer's flat
   `cad_design_fee` + reviewer's `cad_qc_review`; rejection creates another revision cycle.

Approved artifacts attach to the Design. A CAD-backed Design may be manufactured after STL approval.
A 3D/customizable listing additionally requires GLB + validated mesh map. Photo-only handmade listings
do not require either artifact.

**After required CAD gates pass the flow splits by source:** Custom → Build quote (§5). Production →
Variant pricing/offers (§6).

---

## 5. Custom billing branch (custom only)

1. **Build quote** [PRICE] → `status: quote`. `computeQuote`: `cog × cogMarkup(2.5) × rush(1.5) + tax`. The quote **is** the production plan — its `laborTasks[]` become the bench WOs.
2. **Publish quote to client** → `quotePublished: true`.
3. **Invoices & payment** → `invoice: pending_payment → paid`. Deposit (default 50%) / full / custom; Stripe or admin mark-paid.
4. **DECISION — ≥50% of total paid?** First paid → `deposit`; cumulative ≥50% → `in_production`.
5. **IN PRODUCTION — "order the parts"** → `in_production`.
6. **Spawn Design + Piece(s)** → `piece: planned`. `piece.customOrderID` back-pointer. With Link-gemstone it now threads through. → shared Casting surface (§8).

## 6. Production pricing + offers (production only)

1. **Define Variants** — every sellable Design has at least one concrete base SKU/configuration. Ring
   Variants have one nominal size and may define a safe min/max sizing allowance.
2. **Cost estimate = the SAME engine** [PRICE] — per Variant: STL/slot volume × daily metal price,
   labor × rate, stones, casting, × markup. No customer, tax, or deposit gate.
3. **DECISION — Offer Refrakt customization?** [NEW]
   - **Yes** → use `ConfiguratorSetup` to constrain options on the base Variant. Every shopper selection
     is made to order and persists an immutable resolved-configuration snapshot.
   - **No** → sell the concrete Variant as designed.
4. **Compute offers per Variant/configuration:**
   - A matching `Piece.status: available` creates a **ready-to-ship** offer for that exact configuration.
   - While uncommitted Design-wide edition capacity remains, the Variant may also expose **made-to-order**.
   - The same Product page may offer both an exact ready-to-ship Piece and customize/made-to-order.
5. **Paid made-to-order purchase** atomically claims committed capacity, creates a `planned` Piece,
   copies the Variant and resolved configuration, and threads `gemstoneId`. The guarded transition into
   physical production converts the commitment into the Design-wide allocation/edition number and routes
   the Piece to its production or casting path. Cancellation/refund before production releases capacity.

---

## 7. Handmade sub-flow (production only) [NEW]

Hand-fabricated/traditional Designs skip STL, GLB, Refrakt, and automatic casting requirements. They do
not skip Design, Variant, Piece, edition, labor, or COGS accounting.

1. **Handmade Design** → `productionMethod: handmade`; sketches/photos and manual specification are valid.
2. **Define Variant** — concrete material/size/configuration and any safe ring sizing allowance.
3. **Price — same engine, no automatic casting** [PRICE] — materials + labor entered manually; no
   STL-derived weight. Manual routing may create normal discipline work orders when labor is required.
4. **Create Piece** manually or from a made-to-order purchase. The Piece records exact configuration,
   actual materials/labor/COGS, and edition number when production begins.
5. **List Product** with ready-to-ship and/or made-to-order offers according to Piece availability and
   remaining edition capacity.

---

## 8. Shared Casting surface (both sources) [NEW]

Replaces the backbone's single after-the-fact `addCastingCost` record with an explicit workflow.

1. **Casting board — NEEDS ORDERING** [NEW, shared] → `casting: needs_ordering`. One cross-item queue of every open piece (custom OR production) whose casting isn't sourced yet.
2. **DECISION — Order from Carrera, or cast in-house?**
   - **Order out** → **Mounting ordered — Carrera** [NEW] → `casting: ordered`. Vendor PO, invoice #. Purchased material — caster earns **no labor**; `businessExpenses` entry.
   - **Cast in-house** → **Casting work order (in-house)** [NEW, LABOR] → `WO: casting`. Rides the bench flow and **credits labor** (hours × rate).
3. **CASTING RECEIVED** *(event)* → `casting: received`. `addCastingCost` runs its three idempotent effects: (1) casting material line → piece COGS, (2) `businessExpenses` ledger entry, (3) **generates the bench work orders**. "Metal in hand ⇒ bench can start."

---

## 9. Shared bench (both sources)

1. **Bench WOs generated** [shared] → `WO: READY FOR WORK`. One per discipline: `bench_jewelry`, `engraving`, `gem_cutting`.
2. **Jeweler claims WO** [shared] → `WO: IN PROGRESS`. Lane-enforced self-claim; or admin pre-assign / split-task.
3. **move-to-qc** [shared, LABOR] → `WO: QC`. Credits assigned jeweler `Σ estLaborHours × laborRateSnapshot` into `laborLogs`, held `pendingQc:true`.
4. **DECISION — QC pass?** Reject → `IN PROGRESS` (held labor stays `pendingQc`).
5. **complete-from-qc** [shared, LABOR] → `WO: COMPLETED`. `releasePendingQc` flips labor payable; `computePieceCosts` re-rolls `totalCOGS`.
6. **Payroll (shared with repairs)** [shared] → `log: BATCHED → PAID`. Per-artisan, per-week batch. Candidates: `requiresAdminReview:false` AND `pendingQc:false`.

**After complete-from-qc, splits by source:** Custom → Margin reconciliation (§10). Production → list-product (§10).

---

## 10. Exits

### Custom
1. **Margin reconciliation** [PRICE] → `status: qc`. `marginFor` = `quote.quoteTotal − Σ piece.totalCOGS`.
2. **Order completed** [LABOR] → `status: completed`. `awardClientMgmtBonus` if CAD designer sent ≥1 outbound client message (margin × 5%).
3. **Final invoice paid** → `isFullyPaid`.
4. **DELIVERED** *(exit)* → `status: delivered`.

### Production
- **publish primary Product** — projects the Design and active Variants. A Design may publish before a
  Piece exists; that produces only made-to-order offers.
- **complete/list Piece** — finished Piece → `piece: available`; refresh the Product so its exact Variant/
  configuration gains a ready-to-ship offer and carries `references.gemstoneId`.
- **Drop release** — validates and publishes all eligible primary Products owned by the Drop atomically.

---

## 11. Decision points (quick index)

| Decision | Source | Outcomes |
|---|---|---|
| Drop or standalone? | production | Drop-owned release Design · backlog/evergreen Design |
| CAD-modeled, hybrid, or handmade? | production | CAD spine · mixed gates · handmade sub-flow |
| Offer customizer? | production | yes → constrained Refrakt MTO · no → standard Variant |
| Ready to ship and/or MTO? | production | derived per Variant from available Pieces + edition capacity |
| ≥50% of total paid? | custom | in_production · keep invoicing |
| Order from Carrera, or cast in-house? | shared | vendor PO · in-house casting WO |
| QC pass? (bench) | shared | proceed · reject → IN PROGRESS |

## 12. Labor & price points (quick index)

- **LABOR:** CAD flat fees at **QC — GLB + materials**; **in-house casting WO**; **move-to-qc** (accrued, held); released at **complete-from-qc**; **client-mgmt bonus** at custom completion.
- **PRICE:** custom **Build quote** and **Margin reconciliation**; production Variant **Cost estimate**
  and offer pricing; handmade manual-material/labor pricing. All run the one `computeQuote` engine with
  inapplicable lines omitted.

## 13. What's NEW vs the backbone (the build scope)

1. **Source-agnostic framing** — Drops/Designs reuse the custom spine (Design/Piece/WO/bench/payroll/COGS/listing), minus client/billing.
2. **Casting surface** — `needs_ordering → ordered → received` states + a cross-item board + optional in-house casting WO discipline. Backbone had only the single `addCastingCost` "received" event.
3. **Made-to-order Design listing** — publish a Design before a Piece exists without inventing a
   `concept` product type.
4. **Handmade path** — no CAD/Refrakt/automatic casting; same Design/Variant/Piece/edition spine.
5. **Customizer** — optional per base Variant; every configured purchase is made to order.
6. **Gemstone linking** — optional, threaded Design → Piece → Product; fixes the legacy spawn-drop.
7. **Drop/Collection separation** — Drop owns release production; smart Collection merchandises Products.
