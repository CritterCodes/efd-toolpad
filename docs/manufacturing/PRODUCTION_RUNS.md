# Production Runs — artisan-initiated production (no shop order required)

**Status:** architecture — hole-poking round DONE (2026-07-23); remaining probes listed in §4g.
**Owner scenario:** an artisan has a sketch, wants a limited run of 10: request CAD → get it back →
build variants → cast X of each variant → bench work (self or someone else) → sellable pieces.

## 0a. Mission & monetization (owner, 2026-07-24) — the "why" behind every money rule

**EFD is a business, but the platform is FREE to use for artisans.** The tracking + management
software (designs, runs, drops, bench, WOs-as-bookkeeping, listings) is provided free — the mission
is to help artisans run their business smoothly and GROW. EFD profits **only when it directly
provides logistics or facilitates infra for the artisan's business** — i.e.:
- **WO markup** on work EFD facilitates for them (a peer/vendor/EFD-employee does the work) — the
  infra fee, captured at the WO regardless of sale.
- **Consignment** on pieces sold *through EFD's shop* — the sales fee.

**Self-fulfilled work is never billed, and there is NO platform/listing/membership fee.** A fully
solo artisan who sells in person pays EFD nothing — that's intentional, the free tier of the
mission, not a leak. EFD earns by *adding value* (doing work for them / selling for them), never by
charging rent on the tools.

**The platform is CURATED — invite / approval only** (`artisanApplication`). "Free to use" is
sustainable because it's a vetted community of real artisans, not an open marketplace.

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

- **Self-QC — REFRAMED (owner, 2026-07-23): peer QC is a STANDARDS gate, not acceptance.**
  Peer CAD QC certifies EFD design standards ("prongs are the right thickness, bands the correct
  thickness, settings the right size") to protect the EFD name — it does NOT judge whether the
  job meets the design request. The WO's *customer* (the client, or the run-owning artisan) is
  the ACCEPTANCE gate ("yes, this LOOKS like what I expected"). Two distinct gates.
  **DECIDED (owner, 2026-07-23):** for solo runs the standards gate moves to RELEASE — drop
  release is already staff-only, so solo work self-certifies at the WO and gets its standards
  review before it can go live in the shop; EFD-paid (outsourced) work keeps peer QC on the WO,
  and the completion invoice fires at standards-QC pass (acceptance = the post-delivery dispute
  window, §4.1). **Remote-worker refinement (owner):** EFD's inhouse jewelers don't cast — the
  one casting artisan works remote in his own shop and must QC his own work; same for a remote
  jeweler benching in his own studio. For remote solo-discipline work, peer standards-QC is
  replaced by **self-certification + the PURCHASING artisan's acceptance/dispute window** as the
  check.
- **Piece labor QC:** move-to-QC → someone completes QC. Same question, lighter stakes (the
  pendingQc release just needs a clicker — self-complete with an audit stamp is probably fine).
- **Gem coupling:** run minting must also claim linked gem editions (same transaction) — this is
  the same guard as gemstone Phase 3; build once, both use it.

## 4. Open decisions
1. **Casting — SETTLED (owner, 2026-07-24): CASTING WOs ARE SCRAPPED. Carrera (vendor) is the ONLY
   casting path for now.**
   **Why (the math that killed peer casting):** the economic unit of casting is the FLASK, not the
   piece, and Carrera's marginal cost for one more small piece is ~zero (they fill flasks daily
   across hundreds of customers). A peer caster pays the WHOLE flask cost against a handful of
   pieces. On $12 silver, a peer needs ~20 pieces in one flask just to TIE Carrera's $65.60
   all-in — before any EFD markup. Worse, 5 artisans in 5 locations = 5 shipments, so shipping
   can't be consolidated on the outbound leg. Fragmented claims make it worse still (2 casters
   splitting 5 jobs → $92/$82 per ring). No pricing shape fixes a structural cost gap.
   **Therefore SCRAPPED:** the `caster` artisan type, `casting`-discipline WOs, the
   lock-price-per-weight + weigh-at-QC machinery, compile-WOs-to-invoice, and the atomic run-job
   claim. Revisit peer casting only if/when volume makes EFD the flask aggregator.
   **What SURVIVES = the S4 casting board (already built + verified):** a vendor casting ORDER per
   run — `needs_ordering → ordered → received (actual cost) → delivered → dispute/accept`,
   ownership-scoped, invoice at receipt, gated from shipping until paid, 48h dispute window.
   **Only refinement needed:** COGS routing splits per-piece WITHIN a variant/metal group (not a
   run-wide equal split), since one order can cover several metals.
   **Rate posture:** do NOT approach Carrera for a better rate yet — too hypothetical without
   volume. Revisit once aggregate volume is real leverage (or once published volume tiers are hit
   naturally, which is not a negotiation).
   **OPEN: how EFD earns on the Carrera path** without marking up above market and without asking
   Carrera for a discount — see §4h.

   _(historical, superseded — the peer-casting design that the math above killed:)_
   **The casting board is ownership-scoped (owner, 2026-07-23)** — same pattern as My Designs/
   My Drops/My Bench: ONE board, API-scoped. An artisan sees THEIR runs' casting queue —
   `needs_ordering → ordered (vendor, est) → received` per batch/piece — "what castings they have
   and haven't ordered"; EFD/staff see everything. Solo self-casting = an in-house `casting` WO
   (no vendor entry). This finally defines the placeholder Production→Casting board.
   **CASTING MODEL — REFINED (owner, 2026-07-24, supersedes the single-batch model built in S4):**
   Casting is **per-DESIGN-order, per-VARIANT/METAL work orders** — NOT one batch over the whole
   run. Each casting WO carries its **metal type** (so ordering 1× each of 5 variants in 5 metals
   = 5 casting WOs, each stamped 925/10kYG/10kWG/14kYG/14kWG — the caster can't accidentally make
   5× silver). The WOs **compile into ONE invoice at completion, exactly like repairs** (itemized
   list of WOs → billed to the purchasing artisan).
   - **PRICE LOCK (new decision):** the caster **locks the price when they've ordered the material
     OR are otherwise ready to fulfill** (covers "need to order the gold" and "already have the
     gold, ready to lock"). Until the lock, the purchasing peer's number is an **ESTIMATE with
     explicit up/down variance — the UI must label it as such.** After lock it's firm and is what
     the completion invoice bills. (This supersedes the earlier "actual cost known at receipt" —
     the lock, not receipt, is when the price becomes firm.)
   - **COGS routing:** each casting WO routes to the VARIANT it matches; its cost splits **per
     piece within that WO's variant group** (2× 925 silver at $200 → $100 COGS on each of those
     two pieces). Not split across the whole run.
   - Casting still **gated from shipping to the artisan until the compiled invoice is paid**
     (nothing-is-fronted).
   **DECIDED (owner, 2026-07-24) — the full casting build spec (retire the S4 `castingBatches`
   collection; casting is a first-class WO discipline on the bench spine):**
   - **(a) Casting is a `casting`-discipline WORK ORDER on the existing workOrders spine** — lands
     on the bench like everything else, compiled into an invoice at completion like repairs.
   - **(b) New artisan type `caster`.** Unassigned casting WOs are **claimable in the bench** (lane,
     caster-gated). The purchasing artisan may instead **assign a WO to a specific caster**, **use
     an outside vendor**, or **cast it themselves**.
   - **(c) Price lock = the METAL PRICE PER WEIGHT, locked when the caster orders material / confirms
     ready.** The WO total is NOT fully fixed at lock — it uses the **FINAL WEIGHT weighed at QC**:
     `invoiceLine = recordedWeightAtQc × lockedPricePerUnit × 1.3 (casting markup) + castingLaborFee`.
     Before lock, the purchaser's number is a labeled ESTIMATE (up/down variance). The caster eats
     variance in the *price* (locked) but the *weight* is the actual casting's weight at QC.
   - **(d) Solo self-cast: still lock, still weigh, but NO bill.** COGS is still recorded (weight ×
     locked price × 1.3 + casting labor fee); the casting labor fee is what the artisan "pays
     themselves" — accrues as earned labor (self scope, realized at sale), never invoiced.
   - **COGS routing:** each casting WO → its variant's pieces, split per-piece within that WO's group.
   **THE SHIPPING-FRAGMENTATION HOLE (owner flagged, 2026-07-24) + PROPOSED fix:** if a run's 5
   per-metal casting WOs are claimed by 5 different casters, that's 5× shipping. Fix = **the
   claimable unit is the RUN's casting JOB (all its per-metal WOs), claimed ATOMICALLY — no partial
   claims.** One caster takes the whole run's casting or none → one caster, one shipment per run.
   The per-metal WOs remain (metal instructions + per-variant COGS + per-WO price-lock/weigh) as
   line items of the job. Cross-run consolidation (one caster holding several runs for one
   purchasing artisan) rides the shipments model: **one shipment per caster→artisan handoff covers
   all their pieces = one shipping charge**, regardless of how many jobs. Edge: a caster who can't
   do every metal in a run can't claim the atomic job — the purchasing artisan may then deliberately
   split/assign (accepting the extra shipping).
   **MARKUP — DECIDED (owner, 2026-07-24): EFD's wholesale markup APPLIES to outsourced casting
   (Option B).** The reasoning generalizes to ALL fulfilled WOs and is WHY the WO markup exists:
   two separate revenue streams — **WO markup = EFD's INFRASTRUCTURE fee** (charged at the work
   order every time the pipeline fulfills work, regardless of whether/where the piece sells) vs
   **consignment = EFD's SALES fee** (only when sold through EFD's shop). The consignment is
   avoidable (artisan sells in person → EFD never sees it), so EFD must capture its infra fee at
   the WO. For a PEER/VENDOR casting: the **caster receives the full `1.3 metal markup + casting
   labor fee`** (their margin + work); **EFD's wholesale markup applies on top** (artisan pays
   `casterCharge × wholesaleMarkup`; caster keeps casterCharge; EFD keeps the delta). Not double-
   dipping — caster and platform are distinct providers. **Self-cast is the exception (no bill, no
   markup):** you ARE the caster, paying yourself `1.3 + labor`; EFD charges no infra fee on your
   own solo work (§0a — the platform is free; EFD only earns when it does work for you or sells for
   you). The owner is the degenerate self≈efd case.
   **Casting liability — DECIDED (owner, 2026-07-23):** casting failures are the CASTER's
   liability — "they paid for 10, they get 10"; how many casting sessions that takes is the
   caster's business (vendor and in-house casting WO alike). After delivery the ordering artisan
   gets a **48-hour dispute window** (a delivered casting that fails their inspection can be
   disputed; auto-accept when the window lapses). Once accepted, damage during later work is the
   OWNING artisan's liability — with a built-in avenue to **scrap the piece, RELEASING its
   edition slot and REUSING its number, and order another**.
   **Numbering — DECIDED (owner, 2026-07-24, supersedes the earlier "fresh number"):** a pre-sale
   scrap never reached a customer (it was a manufacturing failure), so its number goes back into a
   reuse pool and the replacement takes it — a limited-N edition stays numbered **1..N forever**
   (no "#11 of 10" in anyone's collection). → the edition engine frees the number on scrap/cancel
   (nulls it on the scrapped piece, keeps `scrappedEditionNumber` for audit) and the next mint
   draws freed numbers (lowest first) before a fresh one. Pre-sale scrap only. **SHIPPED (S1).**
2. **Shipping legs:** minimum viable = a `shipments` record per handoff `{ from, to, carrier,
   tracking, pieceIDs, status }` + "piece is physically at X".
   **Billing — DECIDED (owner, 2026-07-23):** the owning artisan pays shipping as a line on
   their invoice; the person doing the packing/shipping gets that labor via payroll like any
   other labor. **NOTHING SHIPS UNPAID** — every deliverable ships only after its invoice is
   paid ("you order a casting, invoice paid, then shipped").
   **Insurance/custody — DECIDED (owner, 2026-07-23):** declared-value insurance on every leg,
   billed through like the postage; while a piece sits at another artisan's bench, that artisan
   is the bailee (liable for it). Both go in the artisan agreement.
3. **Materials — DECIDED (owner, 2026-07-23):** the owning artisan pays for ALL bench materials
   their piece consumes (solder, gemstones, anything) — **EFD collects labor + materials on the
   completion invoice**. ONSITE EFD jewelers are supplied from EFD stock (EFD keeps the
   materials money); OFFSITE jewelers buy their own materials and are paid for them through
   payroll. Casting metal → piece COGS split still open.
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

## 4b. Settlement direction — Stripe Connect (owner, 2026-07-23)

**Stripe Connect is the designated settlement layer** — adopt when consignment volume warrants,
but **build the money model Connect-compatible from day one**:
- Every ledger row that pays a person (`laborLogs`, `salePayouts`, artisan invoices) carries a
  **per-artisan payee identity** (`payeeUserID` today; a `stripeAccountId` alongside it when
  Connect onboards) — so flipping to Connect is a settlement swap, not a re-architecture.
- Target flows: consignment sales = destination charge with EFD's cut as the application fee
  (automates salePayouts→payroll and gets 1099s handled); laborer payouts = optional transfers
  at QC-release; **artisan billing at WO completion stays plain Stripe invoices** (the customs
  rail generalized) — Connect not required there.
- `laborLogs`/`salePayouts` remain the SOURCE OF TRUTH; Connect only moves the money. Release
  gates (pay-at-completion, casting-at-receipt) are enforced by the pipeline, never assumed of
  Stripe.

## 4c. WO terms — quote up front; freeze & forfeiture (owner, 2026-07-23)

- **Quote accepted at creation:** "the person creating the WO needs to know what they are
  getting into." Every artisan-ordered WO shows its cost up front (CAD flat fee from the
  designer's profile, bench = est. hours × rate) and the artisan ACCEPTS that quote at creation;
  the completion bill is the actuals, anchored to the accepted estimate.
- **Unpaid bill ⇒ FREEZE:** all run/WO activity for that artisan halts until the bill is paid.
- **Unpaid past X days ⇒ LIQUIDATION — REFRAMED (owner, round 3, 2026-07-23): "forfeiture" is
  just EFD monetizing what it ALREADY OWNS.** Under nothing-is-fronted, **title passes at
  payment** — an unpaid deliverable was never the artisan's property, so nothing is ever seized.
  When a bill dies, EFD liquidates the withheld deliverable; what EFD owes the artisan depends
  on what of THEIRS is embedded in it:
  - **Their paid-for property embedded** (e.g. they paid CAD + casting + their stone, stiffed
    the BENCH bill): the lien case. **On ANY liquidation sale EFD's consignment cut applies
    first** (EFD is selling — same as always), then the unpaid bills (markup-inclusive) +
    direct costs are recovered. **EQUITY-CAP — DECIDED (owner, 2026-07-23):** the remainder
    returned to the artisan is capped at their **documented paid-in equity** (what they can
    prove they paid — casting, stones); **all profit from the liquidation sale is EFD's** as
    liquidated damages, and EFD prices the liquidation sale at its sole discretion. This kills
    the stiffing arbitrage (equity+surplus-back had made stiffing net-identical to paying
    honestly with zero cash up front): honest = profit; stiffing = break-even at best.
    Serial stiffing is structurally impossible: FREEZE at first overdue bill stops all new
    runs/WOs/listings, and a repeat after liquidation = expulsion (two-strike policy).
  - **Their design IP embedded** (design paid-for and theirs, physical asset EFD's — e.g.
    stiffed CASTING bill): EFD finishes/sells at its own expense and **keeps all profit on the
    physical asset it owned from the beginning, but pays them the design fee/royalty on the
    recovery sale** — the artisan RETAINS design rights; the recovery sale is one-off, and
    continued production of their design still requires an EFD-run agreement (§4e).
  - **Nothing of theirs embedded** (stiffed the CAD bill itself; stiffed a gem-cut bill): the
    deliverable never became theirs. Stiffed CAD ⇒ the design was never paid for, never theirs
    — EFD owns it outright and may list/produce; artisan gets nothing. Stiffed stone ⇒ the stone
    returns to the cutter's sellable listing pool (cutter paid via consignment on its eventual
    sale, net of fronted rough); the jeweler gets nothing.
  Liquidation extinguishes the debt up to the recovered amount; account-standing consequences
  persist. All clauses live in the signed artisan agreement. X + cadence: open (suggested 60
  days, reminders at 7/30, freeze immediate).
- **EFD's cut on fulfilled WOs — 20% (owner, 2026-07-23):** every EFD-fulfilled work order is
  billed at **COGS × 1.20** (labor + materials, incl. vendor costs like the casting-house
  invoice — same 20% markup wholesale repair carries today). "We are fulfilling everything —
  it's just like wholesaler repair work." **Exception: self-fulfilled WOs** (`self` payer scope)
  bill nothing at all, so no markup. Quotes shown at WO creation are markup-inclusive.
  **Edges CONFIRMED (owner, 2026-07-23):** shipping/insurance legs pass through at cost (no 20%
  on postage); a consumed gem stone is billed at the cutter's gem price via the consignment rail
  ONLY — never × 1.2 again (the gem price already carries its own markup).

## 4d. Gems inside jewelry production (owner, 2026-07-23)

Two triggers, ONE flow. **Concept/MTO:** a jeweler lists a gem-linked design with no physical
piece; a client purchase spins up the pipeline — gem-cut WO (the `gem_cutting` lane's first real
on-ramp), casting to the casting board (vendor order or a casting WO the artisan may assign to
themself). **Production run:** identical flow, triggered by the run instead of a sale. In both:
**EFD fronts the ROUGH if needed; the owning jeweler pays EFD for the stone when the cut is
COMPLETED** (pay-at-completion; stone gated until paid); the cutter is paid through the gem
sale — **DECIDED (owner, 2026-07-23): the cutter's payout runs through the consignment rail NET
of any EFD-fronted rough** ("deduct the fronted rough").

## 4e. Who can start a run (owner, 2026-07-23)

- **Own design:** the design's owning artisan (or staff).
- **Collab design:** **dual-signature** of the collaborators — a collab run NEEDS an agreement,
  because *who funds it changes the split* (the funder took on more risk). **DECIDED (owner,
  2026-07-23): v1 = single payer (the run creator) + a dual-signed declared payout split stored
  on the run record**; contribution-weighted formulas deferred.
- **EFD-owned drops:** EFD can run a design in its drops — EFD funds it, **owns the product**,
  and pays the designing artisan for their inputs (e.g. CAD labor) plus the **right to the bench
  labor** (first refusal on the bench WOs before they hit the queue).
  **Royalty — DECIDED (owner, 2026-07-23): open negotiation with the design owner, per run.**
  Guaranteed floor = any labor they did + associated design fees; a per-piece royalty on top is
  "reasonably fair" — default shape: **REVERSED CONSIGNMENT** (EFD owns the product and keeps
  the gross; the designing artisan receives the commission-side percentage EFD would have taken
  as its cut had the artisan owned the product). Negotiated + signed at run creation.

## 4f. Sales tax on artisan invoices (owner, 2026-07-23)

Same policy as wholesalers: **collect resale/sales-tax permits from artisans**; permit on file ⇒
exempt, none ⇒ they pay tax where liable. Stripe supports this directly — Stripe Tax carries
per-customer **exemption certificates** and computes per-state rates/registrations on invoices
(and Connect handles 1099s). Build: permit on the artisan profile → exemption flag on their
Stripe customer; artisan invoices run through Stripe Tax.

## 4h. Earning on the Carrera casting path (OPEN — options, 2026-07-24)

Constraints: can't mark up above market (the artisan can price-check Carrera), can't ask Carrera for
a discount yet, no platform/membership fee (§0a — the platform is free). So EFD must earn by doing
REAL work in the chain. Ranked by impact × feasibility × mission-fit:

1. **In-house wax/model printing (STRONGEST).** If Carrera's per-item fee covers producing the model
   from the STL, EFD prints the waxes instead (resin + printer time it likely already owns) and
   Carrera casts a supplied model at a lower per-item fee. EFD charges BELOW Carrera's print fee, so
   the artisan saves and EFD books a real service margin. Scales with volume, makes the CAD→print→
   cast pipeline sticky, and is unambiguously value-add rather than rent. **GATE: does Carrera accept
   customer-supplied waxes/models, and what's their per-item fee with vs without the model?**
2. **Metal supply (biggest absolute dollars, needs capital).** EFD buys casting grain at volume
   (spot + small) and supplies it; the artisan sends metal to Carrera, skipping Carrera's 1.3 metal
   markup entirely. Illustrative: 10g of 14k (~$500 metal) → Carrera bills $650; EFD-supplied at
   1.15 = $575 → artisan saves $75, EFD earns ~$35. **A gold/platinum play — negligible on silver**
   ($12 silver saves ~$1.80). **GATE: does Carrera accept customer-supplied metal, and what's their
   loss allowance?**
3. **Freight aggregation with EFD as the hub (the surviving version of consolidation).** Carrera
   ships ONE box to EFD covering many artisans' pieces (one $35 freight = ~$7/piece at 5), then EFD
   forwards each artisan insured small-parcel (~$10). Artisan pays ~$17 vs $35 direct; EFD takes a
   flat handling fee out of the saving and the artisan still nets a win. Costs an extra hop + a few
   days, and EFD does the repack labor — offer it as the artisan's choice: **rush (direct, full
   freight)** vs **hub (consolidated, cheaper, slower)**.
4. **Flat order-handling fee (baseline, honest).** A disclosed flat fee per casting order for work
   EFD genuinely performs: placing/tracking the order, receiving + QC, COGS entry, dispute handling,
   invoicing. Flat, NOT a percentage of metal (§4c — percentage on metal invites adverse selection).
5. **Finishing as bench WOs (natural attach).** Carrera delivers raw castings; someone must sprue-cut,
   tumble, pre-polish. Offer finishing as normal bench WOs — legitimate labor margin at the standard
   WO markup, attached to nearly every casting order.
6. **Scrap/sweeps aggregation + refining (separate business, real margin).** Collect bench scrap,
   filings and polishing sweeps across artisans, refine at volume, keep the spread. Genuine logistics
   no individual artisan can do alone. Independent of Carrera.
7. **Volume tiers reached naturally (free upside).** Qualifying for Carrera's PUBLISHED volume tiers
   by aggregating demand is not a negotiation — track aggregate volume so the tier is claimed the
   moment it's hit.

**Two factual gates block the top two options** (questions for Carrera, not for us): (a) do they cast
customer-supplied waxes/models, and at what per-item fee? (b) do they cast customer-supplied metal,
and at what loss allowance? Also worth pinning: EFD's real insured shipping cost for a single small
piece (the $35 may be a Carrera rate, not physics).

## 4g. Remaining open probes (updated 2026-07-23, round 3)

1. Liquidation timing: X days + reminder cadence (suggested 60d, reminders at 7/30, freeze
   immediate). (§4c)
2. Casting metal cost → piece COGS split. (§4.3)
3. Artisan agreement: plain-language draft lives at `docs/policies/ARTISAN_TERMS_AND_POLICIES.md`
   (owner directive 2026-07-23: "we need to be writing all this in policy pages and user
   agreements") — needs attorney review, then an in-app policy surface + versioned acceptance
   tracking at artisan onboarding (`users.agreements[] { docId, version, acceptedAt }`).

## 5. Sequencing vs gemstone Phase 3
Both need the same core: **hardened non-order production entry + claim-time gem coupling**.
Suggested order: (1) run minting + gem-edition claim in one transactional service (serves both),
(2) Request-CAD on designs, (3) casting decision + batch, (4) shipping legs, (5) artisan-facing
run UI. Related: `GEMSTONE_DESIGNS_AND_INVENTORY.md`, `ARTISAN_DROPS_AND_COLLABORATION.md`.
