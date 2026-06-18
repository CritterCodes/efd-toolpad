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
  - **C6c** CAD QC peer-review payout (unassigned, claimed by other CAD designers; flat fee → COG).
  - **C6d** GLB work order (STL→GLB) + labor-payable-on-QC gating across the bench.
- **C7** Casting → expense ledger w/ invoice number.
- **C8** `qcReviewFee` + `clientMgmtBonus` settings; client-management bonus logic.

Related future work (noted, not in scope here): **rebuild the artisan-management system** (enables per-jeweler
rates), and the **CAD design-standards SOP** (placeholder at `docs/manufacturing/cad-design-standards-sop.md`).
