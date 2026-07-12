# EFD Production Pipeline — Flow Spec (agent reference)

> Companion to `Custom Order Pipeline.dc.html` (the interactive swimlane chart, in Claude Design project
> eea2db91-d414-4b02-b531-75b9f9ba576e). This is the same model in prose, structured so an agent can reason
> about the flow without opening the diagram. Builds on the code-verified custom-order backbone in
> `CUSTOM_ORDER_PIPELINE.md` (referenced as "backbone §N"). Authored by the owner in Claude Design 2026-07-11.

---

## 0. TL;DR

The pipeline is **source-agnostic**. Two entry sources produce jewelry through **one shared spine**:

- **Custom order** — client-driven. A client commissions a piece; billing/CRM gates (quote → invoice → 50% deposit) precede fabrication.
- **Production run** — owner-driven. The owner decides to make/sell a product; no client, no deposit gate.

Both sources converge on the shared core: **Design → CAD (STL/GLB + materials) → price (one engine) → Piece → casting → bench work orders → COGS → listing/delivery.** Work orders are keyed by `sourceType` + `sourceID`, so the *same bench and payroll* serve repairs, custom orders, and production runs.

Two jobs run through the whole thing, at fixed points:
1. **LABOR credit** — who worked, credited into shared `laborLogs`.
2. **PRICE** — cost estimate → markup → a price (a customer quote for custom; a suggested/live retail for production).

---

## 1. Lanes (actors / responsibility bands)

| Lane | Owns |
|---|---|
| **Client / Billing** *(custom only)* | quote publish, invoices, deposit/50% gate, final payment, delivery |
| **Owner / Admin** | order creation, spec, assignment, quote build, margin, completion |
| **Design / CAD / Listing** | CAD uploads + QC, material/meshMap assignment, pricing, customizer, concept/handmade listings |
| **Casting surface** | needs-ordering board, Carrera vendor orders, casting-received |
| **Bench + Payroll** | in-house casting WO, bench work orders, QC, completion, payroll |

Legend: **[LABOR]** = labor-credit point · **[PRICE]** = price calc · **[NEW]** = surface that did not exist in the backbone · **[shared]** = source-agnostic.

---

## 2. State vocabulary (use these exact names)

- **Order status** (custom only, forward-only): `pending → consultation → design → quote → deposit → in_production → qc → completed → delivered` (+ `cancelled`).
- **Work-order status**: `READY FOR WORK → IN PROGRESS → QC → COMPLETED` (reject: `QC → IN PROGRESS`).
- **Piece status**: `planned → available | reserved | sold`.
- **Design status**: `concept → cad → approved_for_production → retired`.
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

### 3b. Production run (owner-driven)
1. **START** — owner opens a production run. No client.
2. **Owner designs a product** → `design: concept → cad`. In-house or request a designer.
3. **DECISION — CAD-modeled, or handmade?** [NEW]
   - **CAD-modeled** → shared CAD steps (§4).
   - **Handmade** → the handmade sub-flow (§7). No STL/GLB, no work orders.

---

## 4. Shared CAD (both sources) — two upload+QC gates

Optional first: **Link gemstone (optional)** [NEW, shared] — pick a `productType:'gemstone'` Product → set `Design.gemstoneId`. Threads forward to Piece and Product.

1. **Upload STL** [shared] — `stlVolumeCm3` → metal weight for pricing. Own CAD work order.
2. **QC — STL** [shared] — peer review (author can't review own work). Reject → `IN PROGRESS`.
3. **Upload GLB & assign materials** [shared] — GLB (viewer) + the **meshMap** (validated against `productContract`). *This IS the `designModel`.* The login-free REFRAKT viewer built here is shown to client (custom) or storefront (production). **No meshMap ⇒ no listing later.**
4. **QC — GLB + materials** [shared, LABOR] → `WO: COMPLETED`. Approval credits the designer's flat `cad_design_fee` + reviewer's flat `cad_qc_review` (once per piece). Reject → `IN PROGRESS`. A passing GLB auto-enables the shared viewer.

**After QC-2 the flow splits by source:** Custom → Build quote (§5). Production → Cost estimate (§6).

---

## 5. Custom billing branch (custom only)

1. **Build quote** [PRICE] → `status: quote`. `computeQuote`: `cog × cogMarkup(2.5) × rush(1.5) + tax`. The quote **is** the production plan — its `laborTasks[]` become the bench WOs.
2. **Publish quote to client** → `quotePublished: true`.
3. **Invoices & payment** → `invoice: pending_payment → paid`. Deposit (default 50%) / full / custom; Stripe or admin mark-paid.
4. **DECISION — ≥50% of total paid?** First paid → `deposit`; cumulative ≥50% → `in_production`.
5. **IN PRODUCTION — "order the parts"** → `in_production`.
6. **Spawn Design + Piece(s)** → `piece: planned`. `piece.customOrderID` back-pointer. With Link-gemstone it now threads through. → shared Casting surface (§8).

## 6. Production pricing + disposition (production only)

1. **Cost estimate = the SAME engine** [PRICE] → `product: priced`. Built exactly like the custom quote (`computeQuote`): metal weight from STL volume × daily metal price, labor × rate, stones, casting, × markup. No customer, no tax line, no deposit gate.
2. **DECISION — Offer customizer? (optional)** [NEW] — concepts **and** physical pieces alike.
   - **Yes** → **Set customizer params** [NEW]. A configured purchase becomes a **special order → make-to-order**.
   - **No** → list as designed.
3. **DECISION — Concept listing, or physically make?**
   - **Concept** → **List concept — NOT physically made** [NEW, PRICE LIVE]: sold from the GLB in the REFRAKT viewer, never cast. Requires meshMap (+ params if customizable). **Live price** — recomputed as daily metal price moves. A purchase triggers **make-to-order** → creates a Piece (dashed edge) → Casting surface.
   - **Physically make** → **Create Design + Piece** → `piece: planned`, threads `gemstoneId` → shared Casting surface (§8).

---

## 7. Handmade sub-flow (production only) [NEW]

Hand-fabricated / traditional listings with **no CAD and no work orders**.

1. **Handmade design — no CAD** → `design: handmade`. No STL/GLB, no bench WOs, no casting. Optional linked stone.
2. **Price — same engine, NO casting** [PRICE] → `product: priced`. `computeQuote`; materials + labor entered manually; **no casting line**, no STL-derived weight. Live-repriceable.
3. **List handmade product** *(exit)* → `product: available`. Ready-to-ship. Customizer optional; optional stone flips `reserved → sold`. **Never touches casting or bench.**

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
- **list-product (made exit)** → `piece: available`. `POST /api/production/pieces/[id]/list-product`: finished Piece → store Product carrying `references.gemstoneId`.
- (Concept and handmade have their own listing exits — §6, §7.)

---

## 11. Decision points (quick index)

| Decision | Source | Outcomes |
|---|---|---|
| CAD-modeled, or handmade? | production | CAD spine · handmade sub-flow |
| Offer customizer? | production | yes → set params · no → as designed |
| Concept listing, or physically make? | production | concept listing · create Piece |
| ≥50% of total paid? | custom | in_production · keep invoicing |
| Order from Carrera, or cast in-house? | shared | vendor PO · in-house casting WO |
| QC pass? (bench) | shared | proceed · reject → IN PROGRESS |

## 12. Labor & price points (quick index)

- **LABOR:** CAD flat fees at **QC — GLB + materials**; **in-house casting WO**; **move-to-qc** (accrued, held); released at **complete-from-qc**; **client-mgmt bonus** at custom completion.
- **PRICE:** custom **Build quote** and **Margin reconciliation**; production **Cost estimate**, **List concept** (live), handmade **Price**. All run the one `computeQuote` engine; handmade omits the casting line.

## 13. What's NEW vs the backbone (the build scope)

1. **Source-agnostic framing** — production runs reuse the custom spine (Design/Piece/WO/bench/payroll/COGS/list-product), minus client/billing.
2. **Casting surface** — `needs_ordering → ordered → received` states + a cross-item board + optional in-house casting WO discipline. Backbone had only the single `addCastingCost` "received" event.
3. **Concept listing** — list & sell a Design before it's cast (live-priced). `list-product` previously required a finished Piece.
4. **Handmade listing** — no CAD, no WOs, no casting; same pricing engine.
5. **Customizer** — optional per listing (concept or physical); a configured purchase = special order → make-to-order.
6. **Gemstone linking** — optional, threaded Design → Piece → Product; fixes the legacy spawn-drop.
