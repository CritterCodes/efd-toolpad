# Production Runs — artisan-initiated production (no shop order required)

**Status:** architecture draft (2026-07-23) — poke holes before building.
**Owner scenario:** an artisan has a sketch, wants a limited run of 10: request CAD → get it back →
build variants → cast X of each variant → bench work (self or someone else) → sellable pieces.

## 0. First axiom — SOLO-FIRST (owner, 2026-07-23)

**The pipeline must be fully usable without outsourcing anything.** If one person does their own
CAD, casting, and bench work, the work orders are *bookkeeping* — and that bookkeeping is the
point:

- **WOs are the earnings ledger.** Labor credited at QC → `laborLogs` → payroll, *even when paid
  to yourself*. The owner runs EFD this way today: the WO system gates his own draws so he never
  withdraws more than he's "earned." Artisans get the same guarantee for free.
- **WOs default PRIVATE.** A run's WOs spawn **pre-assigned to the creator** — mechanically
  invisible to everyone else's bench (the queue only shows unclaimed lane work + your own). No
  flag needed for the solo case; it falls out of assignment.
- **Outsourcing = releasing.** Unclaim (or spawn unassigned) → the WO enters the lane queue for
  any type-matched artisan to claim; or direct-assign a specific artisan. Three modes, one field:
  `assignedToUserID` (self | null/queue | someone).

## 1. What already exists (the run rides on it)

| Stage | Machinery | State |
|---|---|---|
| Order-less piece minting | `beginManualPieceProduction` — edition-checked, transactional, assigns edition # | ✅ engine (admin-only route) |
| Edition cap ("only 10") | edition counters; 11th piece refused | ✅ |
| WOs per discipline + lane claiming + QC + labor at QC | full bench machinery incl. `gem_cutting` lane | ✅ |
| CAD WO flow (STL→QC→approve, flat fee) | built — but only customs spawns it | ✅ flow, ❌ on-ramp |
| Design CAD statuses (`cad_requested/…/cad_qc`) | enum exists, nothing drives it | ❌ on-ramp |
| Casting | piece status + inline cost on customs; **no casting lane/board/service** | ⚠ weakest link |
| Shipping between artisans | nothing | ❌ |
| Artisan access to any of this | pieces/WO creation is admin-only | ❌ |

## 2. The Run model

```
run: {
  runId, designID, createdBy (artisan), status: planned|cad|casting|bench|qc|done|cancelled,
  items: [{ variantId, qty }],          // "4× variant A, 6× variant B"
  pieceIDs: [],                          // minted via beginManualPieceProduction (edition-checked)
  solo: true|false                       // default WO assignment = creator vs queue
}
```

Stages (each optional — skip what you don't need):
1. **Request CAD** (pre-variants): a `cad` WO on the DESIGN (sketch attached) — drives the existing
   `cad_requested → cad_in_progress → cad_qc` statuses; claimable or self-assigned. Approval lands
   STL/GLB on the design (same uploads as today).
2. **Build variants** (existing editor).
3. **Start the run**: mint `Σ qty` pieces transactionally (all-or-nothing against the edition cap),
   spawn the routing WOs per piece with the run's assignment mode; **casting batch** = one casting
   action covering the run's pieces (vendor order OR in-house — see open decisions).
4. **Bench/finish**: existing WO flow; labor credits at QC to whoever did it.
5. **Done** → pieces `available` (RTS) → list/attach to a drop.

## 3. Solo-mode wrinkles (design around these)

- **Self-QC:** CAD approval currently REQUIRES a peer (can't approve your own work). Solo runs
  need a policy: (a) admin QCs, (b) solo runs skip peer review with an explicit "self-certified"
  stamp on the log, or (c) QC fee simply isn't credited when self-approved. Owner call.
- **Piece labor QC:** move-to-QC → someone completes QC. Same question, lighter stakes (the
  pendingQc release just needs a clicker — self-complete with an audit stamp is probably fine).
- **Gem coupling:** run minting must also claim linked gem editions (same transaction) — this is
  the same guard as gemstone Phase 3; build once, both use it.

## 4. Open decisions
1. **Casting: a WO lane or a vendor order?** In-house casters want a `casting` discipline WO
   (claim/QC/labor like any lane). Outsourced casting is a purchase (vendor, invoice →
   businessExpenses, received-date) — probably BOTH, chosen per run.
   **The casting board is ownership-scoped (owner, 2026-07-23)** — same pattern as My Designs/
   My Drops/My Bench: ONE board, API-scoped. An artisan sees THEIR runs' casting queue —
   `needs_ordering → ordered (vendor, est) → received` per batch/piece — "what castings they have
   and haven't ordered"; EFD/staff see everything. Solo self-casting = an in-house `casting` WO
   (no vendor entry). This finally defines the placeholder Production→Casting board.
   **Payment-timing sub-question (nothing-is-fronted applied to castings):** when an artisan uses
   EFD's casting-house account, does the artisan pay EFD (a) UP FRONT at order placement (EFD
   never fronts the vendor invoice) or (b) at receipt, with the casting GATED before it ships to
   them (EFD fronts vendor cost for days)? Strict reading of the axiom says (a). Owner call.
2. **Shipping legs:** minimum viable = a `shipments` record per handoff `{ from, to, carrier,
   tracking, pieceIDs, status }` + "piece is physically at X". How much more?
3. **Materials for runs:** casting metal cost lands on piece COGS how (per-piece split of the
   vendor invoice, like customs' inline recorder)?
4. ~~Who pays whom~~ **DECIDED (owner, 2026-07-23) — the ledger split + PAY-AT-COMPLETION.**
   Every labor log gains a `payer` scope; the rule is mechanical (laborer == the piece's owning
   artisan → `self`, else → `efd`):
   - **`efd` (outsourced run work):** the laborer is credited at QC and paid by EFD payroll as
     normal — but **the owning artisan is billed AT COMPLETION, not at sale. NOTHING IS FRONTED**
     (owner, verbatim intent): no product, digital or physical, is released to the artisan on
     credit. WO fulfilled → invoice the artisan (the Stripe customs-invoice rail generalizes to
     artisan billing) → **the deliverable is gated on payment** — CAD files don't unlock, castings
     don't ship, finished pieces don't hand off until the bill is paid. "They make a work order
     and it is fulfilled; they are liable for paying that bill." EFD's exposure is bounded by the
     release gate, and consignment payouts stay clean (pure gross − EFD cut; no labor clawbacks).
   - **`self`:** solo work on your OWN piece. Never payroll-payable and never billed (you don't
     invoice yourself) — accrues into the piece's COGS and my-work as earned-but-unrealized value,
     realized at sale through the consignment payout.
   - The owner himself is the degenerate case where self ≈ efd (he IS EFD), which is why his
     pay-himself-via-WOs flow already works without the field.
   - `salePayouts.estimatedLaborHoldback`/`actualLaborDeduction` remain what they are today (the
     repair/sales context) — they are NOT used for run labor; runs settle at completion.

## 5. Sequencing vs gemstone Phase 3
Both need the same core: **hardened non-order production entry + claim-time gem coupling**.
Suggested order: (1) run minting + gem-edition claim in one transactional service (serves both),
(2) Request-CAD on designs, (3) casting decision + batch, (4) shipping legs, (5) artisan-facing
run UI. Related: `GEMSTONE_DESIGNS_AND_INVENTORY.md`, `ARTISAN_DROPS_AND_COLLABORATION.md`.
