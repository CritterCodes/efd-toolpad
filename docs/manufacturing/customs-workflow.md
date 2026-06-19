# Customs Workflow & Data Model (UI parity + production spine)

**Status: DESIGN — for red-line. Not yet built.** Owner is co-designing this; nothing here is
implemented until this doc is approved. Update this doc in the same PR as any data change (anti-drift).

This defines how the **new `customOrders` system** (not legacy `customTickets`) runs a bespoke order
end-to-end: quote → assignment → CAD (STL) → CAD QC peer review → GLB → casting → bench labor →
setting/finishing → QC → delivery, with COGS rolling up to margin, on the unified bench + payroll we built.

---

## 1. Vision (owner's words, synthesized)

- A **custom order is a parent** that spawns **independent work orders incrementally** across disciplines.
  A single custom can hold **multiple jewelry items** (rare — e.g. a matched ring + band set); each item
  has its **own quote, designer, and work-order chain**, all rolling up to the order.
- **Building the quote = defining the work.** You can't quote properly until a **CAD designer is assigned**,
  because the designer's **own CAD fee** (from their profile) is a COGS line. So **assignment is a quoting step.**
- **Assigning an artisan does three things at once:** (a) snapshots their fee into the quote/COGS,
  (b) auto-creates a **work order on that user's My Bench**, (c) grants them **access to the comms channel**
  (both internal + client threads) and the custom's info.
- **Two distinct CAD file stages — STL ≠ GLB:**
  - **STL** — for the **manufacturer/casting** process. Uploaded **with no stones in the settings** (metal only).
  - **GLB** — for the **web viewer** (client review + efd-shop products). **You need the STL to make the GLB.**
  - **GLB creation is its own CAD work order** with its own cost, folded into the custom (or product) COGS.
- **QC is a paid peer review (CAD only).** After a CAD designer uploads the STL via My Bench, the WO moves to
  **QC**. QC is **not assigned** — it's **available to other CAD designers** to claim. The reviewer checks the
  work against a **design-standards SOP** and earns a **flat QC review fee** (a setting). Approve → production.
- **Labor is not credited until QC passes.** Artisans accrue labor on a WO but it is **not payable** until the
  QC step for that work approves it.
- **Casting = a material cost line** that also **propagates to the expense ledger**; both the inline COGS line
  and the ledger entry carry the **casting vendor's invoice number**.
- **COGS = designer CAD fee + GLB-creation fee + QC review fee + casting (material) + gemstones + other
  materials + bench-jeweler labor + shipping.** Marked up per admin settings → quote. Margin = quote − COGS.
- **All COG marked up by a settings multiplier.** Reuse the existing engine (see §4).
- **Client-management bonus:** the assigned designer is expected to **manage the client** via comms. If they do,
  they earn a bonus; if they push the communicating onto admin, **no bonus**.

---

## 2. Adopt the existing quote engine (do NOT reinvent)

The legacy custom-tickets already runs **`src/services/pricing/customQuote.pricing.js` (formula v2.0)** —
richer than the new system's flat-40% `src/services/customs/customQuote.js`. **Decision: the `customOrders`
system adopts/aligns to formula v2** (or reuses it directly). v2 already does:

| Component | v2 behavior | Source |
|---|---|---|
| Materials (incl. **gemstones**: centerstone + accentStones, mounting, additional) | summed into `materialsCost` | quote line items |
| Labor (bench tasks) | summed into `laborCost` | quote line items |
| **COG = materials + labor** | `cogPrice = cog × cogMarkup` | `adminSettings.financial.cogMarkup` (def 2.5) |
| **Designer fee** | `designPrice = designerFee × designFeeMarkup`; artist **paid base** `designerFee` (payout) | `artisanApplication.customDesignFee`; markup from settings (def 1.5) |
| **Shipping** | pass-through (`shippingPrice`), not marked up | quote line items |
| Rush | `rushUpcharge = cogPrice × (rushMultiplier − 1)` | `adminSettings.financial.rushMultiplier` (def 1.5) |
| Margin/analytics | grossProfit, grossMargin, commission, `belowMarginFloor` vs `targetMarginFloor` | settings |
| Settings snapshot | locked into the quote at publish so later setting changes don't mutate published quotes | — |

**Markup model — DECIDED (overrides v2's three-bucket split): single COG bucket.**
Fold **everything** into one COG bucket — materials, **gemstones**, bench labor, **designer CAD fee**,
**GLB-creation fee**, **QC review fee**, **casting**, and **shipping** — then `price = COG × cogMarkup`.
There is **no separate `designFeeMarkup` bucket** anymore (the design fee is folded into COG and marked up by
`cogMarkup` like everything else). Artists are still **paid the base fee** as a payout; the marked-up amount is
the customer price. `margin = price − COG = COG × (cogMarkup − 1)`.
- _(Note: shipping is folded into COG and therefore marked up too, per owner. Flag if you later want shipping
  pass-through instead.)_

**Other additions for this spine:**
- **QC review fee** — flat, from a **new setting** `adminSettings.financial.qcReviewFee`; into COG (marked up).
- **GLB-creation fee** — a CAD fee line (its own WO); into COG (marked up).
- **Casting** — a material line (see §7); into COG.
- Per-item quotes when a custom has multiple items (aggregate to order totals).
- **Client-management bonus** = `clientMgmtBonusPct × margin` (a **% of profit** from settings), paid to the
  assigned designer **only if they managed the client comms**; comes out of net profit (does not change price).

---

## 3. The lifecycle (per item)

```
1. Intake            customOrder created (customer, spec, moodboard images, description)
2. Assign designer   pick CAD designer → fee snapshot into quote + WO on their My Bench (cad) + comms access
3. Quote             build quote (designer fee + materials + gemstones + labor + casting est + shipping) × markup → client
4. Deposit           invoice (existing) → ≥50% advances to production (existing)
5. CAD (STL)         designer works the cad WO, uploads STL (no stones) via My Bench → WO → QC
6. CAD QC peer       another CAD designer claims the QC WO, checks vs SOP, earns flat QC fee → approve → production
   (only on QC pass does the CAD designer's labor become PAYABLE)
7. GLB               (own cad WO) STL→GLB for client review + efd-shop; cost folded in
8. Casting           admin places casting order → material cost line + expense-ledger entry (vendor invoice #)
9. Bench labor       new bench_jewelry WO(s): cast cleanup, stone setting, polish — claimed from bench
10. QC (bench)       finished piece QC → approve (labor becomes payable) → completed
11. Deliver          final invoice / payment → delivered
```

Every WO routes to the right **discipline lane** on the unified bench (`/dashboard/repairs/my-bench`) and is
claimed there. The custom **tracks all child WOs** (across all items) and **rolls up COGS** → margin.

---

## 4. Data model (additions to `customOrders`)

- **items[]** (NEW; optional, defaults to a single implicit item): each `{ itemID, title, designerUserID,
  quote, designIDs[], pieceIDs[] }`. Single-item customs keep today's flat shape; multi-item uses `items[]`.
- **assignments[]** (NEW): `{ userID, name, role: 'cad'|'bench'|'qc_reviewer', feeSnapshot, assignedAt, assignedBy }`.
  Assigning a `cad` designer snapshots `customDesignFee`; spawns their bench WO; grants comms access.
- **notes[]** (NEW): internal notes `{ id, text, author, createdAt, type: 'internal'|'client_visible', tags[] }`.
- **communications** (NEW): message thread(s) — **client thread** (synced to efd-shop portal) + **internal thread**.
  Assigned artisans see **both**. (Mirror legacy `/communications`; fire-and-forget notifications.)
- **images / moodBoard[]** (NEW): S3-uploaded reference images `{ url, key, caption, uploadedBy, uploadedAt }`.
- **spec fields** (NEW): jewelryType, metalType, karat, size, gemstones[], budget, dueDate, specialRequests.
- **files** per item/piece (NEW): `{ stlUrl, stlKey, stlUploadedBy, glbUrl, glbKey, glbUploadedBy }`.
  STL = casting (no stones); GLB = web viewer (reuses the product `viewer`/meshMap pipeline + `/api/glb/inspect`).
- **clientMgmtBonus** (NEW): tracks whether the assigned designer is managing client comms → bonus eligibility.

Work orders (existing `workOrders`) gain: **file-upload completion** (STL/GLB) and a **payable-on-QC** flag so
labor isn't credited until QC passes (see §6). QC-as-payout becomes a real WO type for CAD.

---

## 5. Assignment model

- Assign by **role**: `cad` (designer), `bench` (jeweler), `qc_reviewer` (CAD QC — but **not assigned**, claimed).
- **CAD designer**: rate = `artisanApplication.customDesignFee` (self-set on profile). Assignment snapshots it
  into the quote/COGS, spawns a `cad` WO on their My Bench, opens comms access (both threads).
- **Bench jeweler**: rate = global `adminSettings.pricing.wage` for now. **Per-jeweler rate later** — requires the
  artisan-management rebuild (current system is inadequate; tracked as a separate effort).
- **QC reviewer (CAD only)**: NOT assigned. The QC WO is **open to other CAD designers** to claim (not the author).
  Flat fee from `adminSettings.financial.qcReviewFee` → COGS.

---

## 6. Labor credit gated on QC

**Change to current bench behavior** (today the bench logs labor at move-to-QC and it's immediately a payroll
candidate). New rule: a WO's labor log is created but **not payable** until its QC approves. Implement via a
`payable: false` (or `pendingQc: true`) flag on the labor log, flipped to payable on QC approval; payroll only
batches payable logs. Applies to CAD work (gated by CAD QC peer review) and bench work (gated by bench QC).

---

## 7. Casting → expense ledger

Recording a casting cost on a custom:
1. Adds a **material/COGS line** to the item's piece (feeds COGS).
2. Writes an entry to the **finance/expenses ledger** (`dashboard/finance/expenses`).
3. **Both** carry the **casting vendor's invoice number**. (Future: hook to Stuller order tools.)

---

## 8. Settings additions (`adminSettings.financial`)

- `qcReviewFee` (NEW, flat $) — CAD QC peer-review payout (into COG, marked up).
- `clientMgmtBonusPct` (NEW, % of profit) — designer bonus for managing client comms; paid out of net profit.
- Reuse existing: `cogMarkup` (the one markup), `rushMultiplier`, `commissionPercentage`, `targetMarginFloor`,
  `defaultDesignerFee`, `pricing.wage`. **`designFeeMarkup` is retired** for customs (design fee now in COG).

---

## 9. UI parity (tabbed detail + rich list)

Rebuild `/dashboard/customs` to the app design system (REPAIRS_UI), mirroring legacy custom-tickets:
- **List**: summary metric cards, full filter bar (type/status/payment), search+sort, paginated rich cards
  (status, customer, thumbnails, payment chips, assigned artisans), multi-step "New Custom" create.
- **Detail tabs**: Overview (customer + spec + description), **Status timeline**, **Assignment**, **Quote**
  (materials/gem/labor/shipping editor + markup + margin via formula v2), **Invoices** (have), **Production**
  (the child-WO tree + casting/material costs + COGS→margin), **Notes**, **Communications** (both threads),
  **Images** (moodboard upload), **3D & Share** (design-model + share — endpoints exist, no UI yet).

---

## 10. Resolved decisions (2026-06)

1. **Multi-item**: ✅ supported (rare). Model as `items[]`; single-item stays flat.
2. **GLB-creation fee**: ✅ folded into **COG** (marked up by `cogMarkup`). And the **designer fee is folded
   into COG too** — single-bucket markup; `designFeeMarkup` retired (see §2).
3. **QC review fee**: ✅ folded into **COG**, marked up by `cogMarkup`.
4. **STL→GLB stones**: ✅ confirmed — the **GLB work order** is where stones/gem-presets are added (meshMap
   builder, U3). STL stays metal-only.
5. **Client-management bonus**: ✅ a **percentage of profit** from admin settings (`clientMgmtBonusPct`), paid to
   the assigned designer **only if they managed the client comms** (no bonus if admin handled it). Out of net profit.
6. **Per-jeweler rates**: ✅ deferred until the artisan-management rebuild; bench uses the global
   `adminSettings.pricing.wage` meanwhile.

---

## 11. Build slices (after approval)

Independent of the open questions (start anytime):
- **C1 ✅** Backend gaps: notes, communications (both threads), images/moodboard upload (MinIO), spec fields.
  (Client-thread notification wiring left as a TODO.)
- **C2 ✅** Detail page → tabbed parity (Overview/Status timeline/Quote/Invoices/Production/Notes/Comms/Images/3D&Share).
- **C3 ✅** List page → rich parity (cards w/ thumbnails, filters, search/sort, pagination, multi-step create).

- **C7 ✅** Casting → expense ledger. `addCastingCost` adds a `casting` material line to the piece (→ COGS) AND
  writes a `businessExpenses` entry (category Materials / Parts, `sourceReferenceType: custom_order`), both stamped
  with the vendor `invoiceNumber` (new field on the expense model). Production tab "Record casting" dialog (amount,
  vendor, invoice #, notes). Verified live (casting 200 → piece COGS 750→950; expense INV-9981 linked to the order).

Depend on the production/quote decisions:
- **C4 ✅** Single-COG-bucket quote engine in `customOrders`: materials+gemstones+labor+casting+shipping+designer
  fee+GLB fee+QC fee → COG × `cogMarkup` (from admin settings, default 2.5) × rush. Verified live (COG 470 → 1175).
- **C5 ✅** Assignment model: assign CAD/bench artisan → snapshot `customDesignFee` into the quote (folds into COG)
  + record comms access. `assignments[]` + `/assignments` endpoints + `/assignable-artisans` + Assignment tab.
  Verified live (assigned CAD designer w/ $350 fee → designFee 100→350, COG 470→720, total →1800). **The bench
  work-order spawn + CAD/STL/QC lifecycle is C6** (deferred so the bench card isn't shipped before it works).
- **C6** Work-order spine (decomposed):
  - **C6a ✅** Incremental WO spawn per discipline + consolidated child-WO view (Production tab) + COGS rollup;
    assigning a CAD designer auto-spawns their CAD WO on the bench (creates a bare piece on demand). Verified live.
  - **C6b ✅** STL upload @ bench (metal-only) → moves the CAD WO to QC. WorkOrders gain a `files` field;
    `uploadCadStl` stores the STL to MinIO + mirrors onto the piece + status→QC; **no hourly labor logged** (CAD is
    paid the flat design fee in the quote, not hours×rate — bench WOs keep the hourly move-to-QC). Route
    `/api/bench/work-orders/[id]/upload-stl` (multipart); bench card shows a discipline-aware "Upload STL (→ QC)"
    for CAD WOs + an "STL uploaded ✓" indicator. Verified live (STL→MinIO, WO→QC, laborValue 0).
  - **C6c ✅** CAD QC peer-review payout. A CAD designer OTHER than the author approves the QC'd CAD WO (server
    blocks reviewing your own). On approval, two **flat-fee** labor logs hit piece COGS: the author's design fee
    (`wo.flatFee`, snapshotted from the assignment) + the reviewer's `qcReviewFee` (admin setting, default 25) —
    this is the **flat-fee-into-COGS reconciliation** + labor-payable-on-QC for CAD. Labor logs gained a
    `creditedValue` override (flat fee, 0 hours); WOs gained `flatFee`. Bench card shows Approve/Reject for CAD QC
    WOs (excluded from the bulk approve) + an STL link. Verified live (author 350 + QC 25 → COGS 375, margin 500/57%).
  - **C6d ✅** GLB work order + labor-payable-on-QC for bench. WOs gain `cadStage` ('design'|'glb'); a GLB CAD WO
    is spawnable from the Production tab (stage + optional assigned designer, fee resolved from profile);
    `uploadCadGlb` stores the GLB to MinIO, mirrors onto the piece, AND sets the order's `designModel.glbUrl`
    (→ 3D & Share / efd-shop), status→QC; the same CAD QC peer-review (C6c) pays the flat fees. Bench card is
    stage-aware (Upload STL vs Upload GLB). **Bench (hourly) labor gate:** move-to-QC logs labor with `pendingQc`
    (excluded from payroll candidates); complete-from-QC releases it. Verified live (GLB approve → COGS 375→750;
    bench claim→QC→complete released labor).
  - Partially lands C8's `qcReviewFee` setting (read with a default; formal settings UI in C8).

**C6 COMPLETE.** Full custom production spine: assign CAD → STL upload → CAD QC peer-review payout → GLB stage →
bench labor (gated on QC) → COGS rollup → margin, all on the unified bench.
- **C7** Casting → expense ledger w/ invoice number.
- **C8 ✅** `qcReviewFee` + `clientMgmtBonusPct` financial settings (validated + persisted via the settings API,
  read with defaults; a dedicated settings-form UI is deferred — no existing financial-settings form to extend,
  tracked with the broader admin/finance UI). **Client-management bonus:** comms messages now store `authorUserID`;
  on order completion, `awardClientMgmtBonus` pays the assigned CAD designer `clientMgmtBonusPct × profit`
  (default 5%) **only if they authored an outbound client-thread message** (admin managing the client → no bonus).
  Logged as a flat-fee labor entry on the CAD WO (payroll + nets out of margin), idempotent. Verified live:
  designer-managed → 43.75 (5% of 875); admin-managed → 0.

## REALIGNMENT (2026-06): the quote IS the production plan

After the parity push, course-corrected back to the original intent: **building the quote plans the work** —
the quote's lines drive production, they aren't a disconnected estimate.
- Each quote **labor task carries a discipline** (cad/bench_jewelry/engraving/gem_cutting).
- **On casting-received**, the quote's labor tasks GENERATE the in-house bench work orders (one per task, in its
  lane, with the estimated hours). Idempotent (`productionGeneratedAt` guard). You can't do bench work (cleanup,
  setting, polish) until the cast metal is physically in hand, which is exactly the "Casting received" event.
- The **CAD work order stays spawned at assignment** (design happens before the quote is finalized).
- Casting (C7) + actual materials are recorded on the piece as real cost; the quote lines are the CHARGE.
- Margin still = quote total − actual piece COGS. Manual "Add work order" remains a supplement.
- **Generation trigger = casting-received** (`addCastingCost`), superseding the earlier deposit/in_production
  trigger. Owner's real workflow: quote → client approves → order from vendor → vendor invoices on completion →
  pay → receive the cast piece **with the receipt** → that receipt moment records the vendor invoice
  (→ piece COGS + expense ledger) AND creates the in-house bench WOs. The deposit/in_production hooks were removed
  from `customInvoices.service` and the order PUT route.
- **Model quoter feeds the Mounting line.** The CAD STL upload computes the model volume (mm³→cm³, stored on the
  piece as `printVolumeCm3` and surfaced on the order as `designModel.stlVolumeCm3`). The Quote tab's Mounting
  section has **"Estimate from model"**: pick a metal → live per-gram prices × volume → `estimateMetalCost`
  fills the mounting cost. This replaces the "get a casting quote from the vendor" step before ordering.

**🎉 CUSTOMS BUILD COMPLETE (C1–C8 + client-base intake).** Full parity UI on the new model + the entire
quote → assignment → CAD/STL → CAD QC peer-review payout → GLB → casting (→ expense ledger) → bench labor
(gated on QC) → COGS → margin → client-management bonus flow, all on the unified bench/payroll.

### Intake optimization + efd-shop alignment (2026-06)

Owner: "a new custom is always custom" (drop Type), "title is deprecated" (admin + shop), use dropdowns like the
new-repair form, and the **efd-shop request form must line up with what the admin expects**.

- **Type removed** — the model defaults `type: 'custom-design'`; the New Custom stepper no longer asks.
- **Title deprecated** — custom orders are labelled by **jewelry type + metal** via `customOrderLabel()` (list card,
  detail header, search). `title` stays on the model only for back-compat with legacy rows.
- **Spec dropdowns** — `src/constants/customRequest.constants.js` is canonical: `JEWELRY_TYPES`, `BUDGET_RANGES`
  (stored as the range label, not a number), `TIMELINE_OPTIONS` (rush derived via `isRushTimeline`),
  `GEMSTONE_OPTIONS`; metal + karat **re-export materials.constants** so the custom form matches repair intake.
  Model gained a `timeline` field. NewCustomStepper + OverviewTab edit dialog both use these.
- **efd-shop intake → customOrders (the alignment).** Both apps share one DB. The shop request form
  (`efd-shop/app/custom-work/request/page.js`) dropped Project Title, split Metal into **Metal + Karat** dropdowns,
  and now reads `efd-shop/lib/customRequest.constants.js` (a value-identical MIRROR of the admin constants). On
  submit the shop route creates a **customOrder** (status pending, `source:'efd-shop'`) via
  `efd-shop/lib/customOrderService.js` — the admin system of record, so requests appear in the new
  `/dashboard/customs`. **Transitional bridge:** the legacy `customTickets` doc is still written (client
  portal + image upload unchanged), linked by `sourceTicketID ↔ customOrderID`; the ticket keeps a combined
  `"18K White Gold"` string for portal back-compat while the order stores split `metalType`+`karat`.
  **Follow-up (not done): migrate the 1404-line client portal + upload route onto customOrders, then drop the
  ticket write** ("retire customTickets for new requests"). Verified live: a shop submission created
  `source:'efd-shop'` order, surfaced in the admin API with split metal/karat, gemstones, budget range, timeline,
  rush, empty title.

## 12. Customs v2 — deeper parity (post-build feedback round)

Owner feedback after the first pass. Decisions: viewer → shared `packages/refrakt`; build the quote builder first.

- **CQ — Quote builder ✅ (DONE):** replaced the cramped Edit-Quote *modal* with a rich INLINE builder on the Quote
  tab (`QuoteTab.js`) — view/edit modes, a line-item materials/gemstones table (name, category, qty, unit, line
  total; add/remove rows), labor/casting/shipping/designer-fee/rush fields, GLB/QC fees shown read-only (from
  production), and a **live COG → ×markup → total** preview. Verified live (added a $500 gemstone line → COG 850,
  total 2125). Removed the modal + quoteForm/saveQuote from the detail page.
- **CV — Shared REFRAKT viewer (DECIDED, not built):** the powerful viewer is `efd-shop/lib/refrakt/JewelryViewer`
  (three + @react-three/fiber + drei). This is a **pnpm workspace** (`web/`, with `packages/pricing-engine`,
  `packages/repair-core`). Decision: **extract `efd-shop/lib/refrakt` → `packages/refrakt`** consumed by BOTH apps;
  add fiber/drei to efd-admin (three already present); admin wrapper (dynamic import, ssr:false). Use it for custom
  GLB review (3D & Share / CAD QC) AND **product-create preview** (admin must see what the shop will render before
  saving). Config shape = `{ glbUrl, meshMap[], environment, orientation, background, scale, camera, autoRotate }`
  (already matches our designModel / product `viewer`).
- **CI — Stripe payment-link invoices (TODO):** invoices should generate a Stripe payment link, **emailed** to the
  client, **tied to the quote**. Build on the existing Stripe integration (`api/repair-invoices/stripe.js`
  createStripePaymentIntent / stripeRequest; the generic `lib/paymentService.createPaymentLink` is a stub).
- **CS — Quote status + efd-shop acceptance (TODO):** quotes need a status (draft/sent/accepted/declined). The
  client views + **accepts the quote in the efd-shop custom portal**; invoices are also **accessible in that portal**.
  Needs a quote-status field + a contract the shop reads/writes (analogous to the product / custom-design-viewer
  contracts). efd-shop UI is shop-side (same workspace, separate app).
- Also: re-audit the detail page for any remaining legacy custom-ticket parity gaps as we go.
- **Detail parity audit ✅ (done):** diffed legacy custom-ticket detail vs the new detail and closed the in-model
  gaps — header High-priority chip + Created/Updated dates; status timeline per-status icons + description; Overview
  Client ID + Quote-total reference + gemstones; Notes tags + scrollable list; Assignment shows assigned date.
  **Deliberately NOT ported (legacy-only, not in the customOrders model — would render empty):** affiliate/referral
  attribution, `needsAttention`, `requestDetails` timeline / est-completion, artisan slug, admin-vs-user note-author
  icon, the granular requiresAction status matrix. Flag if any of these should become real customs features.

Related future work (noted, not in scope here): **rebuild the artisan-management system** (enables per-jeweler
rates), and the **CAD design-standards SOP** (placeholder at `docs/manufacturing/cad-design-standards-sop.md`).
