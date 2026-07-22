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

**Variant = a species the cut is offered in**
- `species` — garnet, amethyst, sapphire…
- `availability` **toggle**: `purchase` (semi-precious — buy now) | `special_request` (precious — goes
  to quote). The cutter sets it per variant.
- `caratMin` / `caratMax` — the only sourcing guard. In range = orderable; out of range = special request.
- `colors[]` — **sub-variant**: each color carries its own `ratePerCarat` (green garnet ≠ red garnet).
  One-color species = one entry.
- `cutLaborCost` — flat per stone.
- `clarity` / `treatment` — descriptors.

**Nothing else.** No rough lots, no per-variant fixed carat, no typed dimensions — the GLB fixes
proportions, the chosen carat fixes scale.

## 2. Ordering a gem

pick **species** (variant) → pick **color** (sets $/ct) → pick **carat** within [min, max] →
`price = (carat × ratePerCarat + cutLaborCost + shared) × markup`, live →
- variant is `purchase` → buy now (made-to-order cut, lead time)
- variant is `special_request`, or carat out of range → request → quote.

Already-cut stones in stock are **Pieces** (`status: available`, RTS) — the existing piece engine,
nothing new.

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
- Species → default-toggle list (precious vs semi) to prefill new variants; cutter can override.
- Whether shared costs (design fee etc.) apply to gems the same way as jewelry (assume yes).
