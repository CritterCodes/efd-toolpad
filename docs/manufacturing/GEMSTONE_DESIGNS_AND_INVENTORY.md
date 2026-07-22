# Gemstone Designs — the trimmed model

**Status:** drawing-board rewrite (2026-07-22), after gem-cutter input. Replaces the earlier
rough-lot/inventory model wholesale. One page on purpose — if it can't fit here, it's too complex.

**The shift that killed the murk:** gems are **capability, not inventory**. The cutter doesn't
track rough lots — "reasonable sizes of a given species are reasonable to source; the min/max is
the guard." Inventory only exists for stones that are already cut, and those are just Pieces.

---

## 1. The model

**Design = the cut** (unchanged from what's built)
- GLB (the faceting design — fixes all proportions), cut + cutting technique, gem cutter (artisan),
  **edition cap**. No jewelry category, no metal, no ring sizing.

**Variant = a species the cut is offered in** *(per the cutter, 2026-07-22)*
- `species` — garnet, amethyst, sapphire…
- `availability` **toggle**: `purchase` (semi-precious — buy now) | `special_request` (precious — goes
  to quote). The cutter sets it per variant.
- `caratMin` / `caratMax` — the only sourcing guard ("reasonable sizes of a species are reasonable
  to source"). In range = orderable; out of range = special request.
- `colors[]` — **sub-variant**: each color is a *quality bucket* ("chrome red AAA") carrying
  **size-tiered rates** — `rates: [{ upToCt, ratePerCarat }]` — because $/ct is NOT linear in size
  (a 4ct clean stone costs far more per carat than a 1ct). Resolution: first tier whose `upToCt` ≥
  the chosen carat; beyond the last tier = special request.
- `creation` — natural | lab (a lab sapphire is its own variant).
- `treatment` — **a different treatment is a different variant** (unheated ≠ heated); the field is
  the variant's descriptor and MUST surface on the listing (FTC disclosure).
- `clarity` — descriptor (or baked into the color-bucket label).
- `cutLaborCost` — flat per stone (facet count is fixed by the design; varies only by species
  hardness, which is why it's per-variant).
- `lotQty` (optional) — **special rough is its own variant with a fixed quantity** ("this one
  Oregon sunstone lot: 3"). Blank = capability (uncapped by material). Already-cut stones are RTS
  Pieces, which belong to a variant anyway.
- `leadTimeDays` — shelf rough ≠ dealer-sourced; overridable on a quote.

**No typed dimensions anywhere** — the GLB fixes proportions, the chosen carat fixes scale, and
**specific gravity converts carat ↔ mm** (per-species SG lookup + per-variant override; a 2ct
amethyst is much larger than a 2ct sapphire). SG is required for size display AND the jewelry
coupling (settings are sized in mm).

**RI / angles:** the same outline needs different pavilion angles per refractive index — that's
exactly what variants gate. The cutter lists only species the design is optimized for; the GLB is
the customer-facing look, not the per-species cutting spec.

## 2. Ordering a gem

pick **species** (variant) → pick **color** (quality bucket) → pick **carat** within [min, max] →
`price = (carat × tierRate(color, carat) + cutLaborCost + shared) × markup`, live →
- variant is `purchase` → buy now (made-to-order cut, lead time)
- variant is `special_request`, carat out of range, or `lotQty` exhausted → request → quote.

Already-cut stones in stock are **Pieces** (`status: available`, RTS) — the existing piece engine,
nothing new. A **cert** (lab report) attaches to the Piece (needed for precious; upload support
planned).

**Work orders** (Phase 2/3): a gem order routes to the **`gem_cutting` discipline** (not
bench_jewelry) with the design attached, species/color, and target carat — or, when the stone is
for a jewelry setting, **target mm + tolerance** (cut-to-fit is its own, slower job and may carry a
premium). Cut labor credits to the cutter at QC, same as repairs. Stones break — a WO can be
re-sourced/recut (lead time slips) or refunded (the edition slot releases); note most dealers sell
LOTS not single rough, which softens but doesn't eliminate the re-source case.

## 2b. Money — the cutter owns the stone (consignment)

The cutter owns the rough and the finished stone; **EFD keeps a portion of the sale**, exactly like
artisan jewelry sold through the shop. The machinery ALREADY EXISTS: `salePayouts` (per sale line:
`grossSale`, `consignmentRate`, `consignmentAmount`, labor holdback → `payoutAmount` to
`sellerUserID`, into payroll batches) + `settings.financial.commissionPercentage`. Gem sales create
salePayouts with the cutter as seller — no new model.

Three money streams, named: **$/ct = the cutter's material+margin · cutLaborCost = the cutter's
bench time · design fee = the cutter's IP royalty.** Retail composes from those inputs × markup; at
sale, the payout nets out EFD's consignment portion.

**Rates go stale** (no live gem market feed like metal): show "rates last updated" on each variant
and nag the cutter — that's the whole fix for now.

## 3. Caps — editions matter, and they flow to jewelry

A cutter can say "I'm only cutting 10 of these" or "one of these": the design's **edition**
(`one_of_one` / `limited N` / `unlimited`) caps how many Pieces will ever be cut — same engine as
jewelry (`edition.allocated + committed < cap`).

**Reserve-on-paid already exists:** `editionCapacity.claimMadeToOrder` atomically takes a committed
slot at checkout and mints the planned Piece — that IS the oversell guard, transactional, shipped.
Gems reuse it as-is.

**Jewelry coupling (Phase 2/3):** a jewelry design whose stone slot consumes a gem design is bounded
by that gem's edition:
```
buildable(jewelry) = min( jewelryEditionRemaining,
                          ⌊ gemEditionRemaining ÷ gemsPerPiece ⌋  per finite gem it consumes )
```
Shared across every jewelry design consuming the same gem — two designs can't jointly exceed the
gem's cap. No lot math; it's edition counters all the way down.

## 4. What's deleted (from the old doc + PR)
- Rough-lot tracking (`roughQty`), 45-min soft-holds on lots, lot-level reserve/consume/release.
- Per-variant fixed carat + manually-entered L/W/H dimensions.
- The "variants = rough we hold" framing. Variants = species offerings.

## 5. Built vs. to-reshape (branch `feat/gemstone-designs-p1`)
- **Keeps as-is:** stepper create (type → model? → basics); design-level cut/technique; no jewelry
  category for gems; gem-cutter artisan filtering; carat×rate+labor price card; `productType:
  'gemstone'` listing projection; GLB on the design.
- **Reshape (small):** variant editor — species + availability toggle + caratMin/caratMax +
  colors[{label, ratePerCarat}] + cutLaborCost + clarity/treatment; drop carat/L/W/H/roughQty.
  Pricing card picks up the selected color's rate and a carat within range.
- **Later phases (unchanged in spirit, simpler now):** jewelry stone slots link gem designs
  (match-lane); buildable rollup off edition counters; shop surfaces (species/color/carat picker +
  special-request path).

## 6. Open (parked, not blocking)
- Species → default-toggle list (precious vs semi) + default SG table to prefill new variants;
  cutter can override both.
- Whether shared costs (design fee etc.) apply to gems the same way as jewelry (assume yes).
- Cert upload UI on the Piece; carat↔mm display in ordering (needs the SG table).
- Wiring gem sale lines → salePayouts (consignment) — existing engine, needs the hookup.
