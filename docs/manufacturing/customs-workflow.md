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

**Additions formula v2 needs for this spine (new):**
- **GLB-creation fee** — a CAD labor/fee line (its own WO), folded into COG (or its own marked-up bucket — see Open Q3).
- **QC review fee** — flat, from a **new setting** `adminSettings.financial.qcReviewFee`; folded into COG.
- **Casting** — a material line (see §7), counts in COG.
- Per-item quotes when a custom has multiple items (aggregate to order totals).

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

- `qcReviewFee` (NEW, flat $) — CAD QC peer-review payout.
- `clientMgmtBonus` (NEW) — designer bonus for managing client comms (flat or % — Open Q5).
- Reuse existing: `cogMarkup`, `designFeeMarkup`, `rushMultiplier`, `commissionPercentage`, `targetMarginFloor`,
  `defaultDesignerFee`, `pricing.wage`.

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

## 10. Open questions (to resolve before/while building)

1. **Multi-item**: confirmed supported (rare). Model as `items[]`; single-item stays flat. OK?
2. **GLB-creation fee**: its own marked-up bucket like the design fee, or folded into COG (×cogMarkup)?
3. **QC review fee markup**: marked up to customer (like design fee) or pure pass-through cost paid flat?
4. **STL→GLB stones**: GLB needs stones rendered (gem presets via meshMap); STL is metal-only. Confirm the GLB
   WO is where stones/gem-presets get added (the meshMap builder, U3).
5. **Client-management bonus**: flat amount or %? How measured — designer is the sender of ≥X client messages,
   or admin toggles "designer managed client"? Where paid (payroll line)?
6. **Per-jeweler rates**: deferred until the artisan-management rebuild. Confirm bench uses global wage meanwhile.

---

## 11. Build slices (after approval)

Independent of the open questions (start anytime):
- **C1** Backend gaps: notes, communications (both threads + notifications), images/moodboard S3 upload, spec fields.
- **C2** Detail page → tabbed parity shell (Overview/Status/Quote/Invoices/Production/Notes/Comms/Images/3D&Share).
- **C3** List page → rich parity (cards, filters, pagination, multi-step create).

Depend on the production/quote decisions:
- **C4** Adopt quote formula v2 in `customOrders` (gemstones, shipping, designer fee, settings markup).
- **C5** Assignment model (roles, fee snapshot, spawn WO, comms access) + artisan profile CAD-rate surfacing.
- **C6** Work-order spine: incremental WO spawn per discipline; STL upload @ bench → QC; **CAD QC peer-review
  payout**; **GLB** WO; **labor-payable-on-QC**; consolidated child-WO tree + COGS rollup.
- **C7** Casting → expense ledger w/ invoice number.
- **C8** `qcReviewFee` + `clientMgmtBonus` settings; client-management bonus logic.

Related future work (noted, not in scope here): **rebuild the artisan-management system** (enables per-jeweler
rates), and the **CAD design-standards SOP** (placeholder at `docs/manufacturing/cad-design-standards-sop.md`).
