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
  **size-tiered ROUGH rates** — `rates: [{ upToCt, ratePerCarat }]` — the $/ct the cutter pays for
  rough (NOT a retail rate; see §2b pricing). Tiers exist because rough $/ct is NOT linear in size.
  Resolution is STRICT: first tier whose `upToCt` ≥ the chosen carat; beyond the last tier = special
  request — never a silent fallback (validated: a purchasable variant's tiers must cover caratMax).
- `yield` — finished ÷ rough carats, default **0.25** (1ct finished needs ~4ct rough); per-variant
  override.
- `maxPieces` (optional) — **this variant's slice of the design edition**: "10 total, but only 2 of
  this species." Design edition = the total cap; maxPieces sub-caps a variant within it.
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

**STL on gem designs — required for the size machinery, NOT for pricing.** Pricing is pure
carat-driven math (no geometry). But the carat⇄mm control and mm display need the design's exact
base weight, and the **STL (a watertight CAD solid) gives it precisely**:
`carat₀ = stlVolumeCm3 × SG × 5` (1ct = 0.2g) — reusing the existing CAD-upload volume machinery.
The GLB's display mesh must never be volume-measured (open meshes over-report). Practical rule: a
gem design lists and sells without an STL, but the shop's size customizer / "≈ mm" display only
lights up once the STL is uploaded.

**RI / angles:** the same outline needs different pavilion angles per refractive index — that's
exactly what variants gate. The cutter lists only species the design is optimized for; the GLB is
the customer-facing look, not the per-species cutting spec.

## 2. Ordering a gem

pick **species** (variant) → pick **color** (quality bucket) → pick **size** within [min, max] —
**carat (0.25ct steps) OR dimensions (~0.25mm steps), linked two ways**: the design's ratios are
locked, so size is one uniform scale; mm ⇄ carat converts via the design's base weight × scale³
(SG per species; see `docs/refrakt/FR-gem-size-customizer.md` — the live model-scaling control is
a REFRAKT feature request; NOT volume×SG on the raw mesh, which over-reports on open gem meshes) →
`price = (carat ÷ yield × roughRate(color, carat) + cutLaborCost + shared) × markup`, live →
- variant is `purchase` → buy now (made-to-order cut, lead time). **MTO stones carry a ± cut
  tolerance** — the cutter shoots for the target (e.g. 1.5ct) but may land a bit over/under.
  **Payment: 50% deposit on the estimate at order; the balance is charged at the FINAL carat
  weight** once cut (price recomputed at actual ct).
- variant is `special_request`, carat out of range/beyond tiers, or `lotQty`/`maxPieces`
  exhausted → **special request through the EXISTING customs pipeline** (customOrders intake →
  quote → deposit), never a second quote flow.

**Size is chosen by carat OR dimensions — snapping applies only to the edited field**, the other
floats as a labeled estimate ("1.25ct → ≈ 8.6 × 4.3mm" or "8.5 × 4.25mm → ≈ 1.2ct"). **The edited
field is the order's PRIMARY spec — the cutter's target**: ordered by carat, hit the carat (dims
approximate); ordered by dims, hit the dims (carat approximate; billing still trues up at final
carat weight).

The **Piece** records `resolvedConfiguration: { sizeMode: 'carat'|'dimensions', species, color,
carat (target), finalCarat, targetMm?, tolerance? }` — color is the rate key and sizeMode is the
cutter's target, so payout math and the cut WO both depend on them being captured.

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

**Pricing recipe = jewelry's (cutter's revision, 2026-07-22): material + labor, × markup.**
Material = rough cost: `(finished ct ÷ yield) × rough $/ct` — the tiered color rates are what the
cutter PAYS for rough, with yield ≥ 25% converting finished→rough carats (1ct finished ⇒ ~4ct
rough). Three money streams, named: **rough $/ct × rough ct = material · cutLaborCost = the
cutter's bench time · design fee = the cutter's IP royalty.** Retail = (material + labor + shared)
× markup; at sale, the payout nets out EFD's consignment portion via salePayouts.

A gem **listing** shows a computed **"from $X"** (cheapest color at caratMin) — variants carry no
fixed retail; the true price is a function of the shopper's carat, served by a pricing endpoint
(Phase 4). The public product doc **never carries the rate table** — `publicGemstoneSpec` strips
rough rates, cut labor, lots (colors become bare labels), like `costBasis` is stripped on jewelry.

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
  (match-lane); buildable rollup off edition counters; shop surfaces (species/color picker + the
  REFRAKT carat⇄mm size control, FR-gem-size-customizer +
  special-request path).

## 6. Committed follow-ups (decided, not yet built)
- **Artisan self-service access** (owner, 2026-07-22): jewelers/engravers/CAD designers create
  jewelry + see customs they're assigned; **gem cutters create/manage their gemstone designs**
  (today the design page + API are admin/dev-only — the cutter can't set his own rates); onsite
  jewelers get repairs. Route by `artisanApplication.artisanType` (lib/artisans.js).
- **Species SG table** — REQUIRED for Phase 4 shop UX: "2ct amethyst" means nothing without
  "≈ 8.1mm"; carat↔mm also drives the jewelry-slot coupling. Per-species SG + per-variant override.
- **Jewelry slot linking (Phase 2) pins species + COLOR** — color is the rate; species alone can't
  price. WOs for jewelry-consumed gems carry target mm + tolerance (cut-to-fit).
- Wiring gem sale lines → salePayouts (consignment); deposit/true-up billing per §2.
- Cert upload on the Piece; price-at-carat endpoint for the shop; rate-staleness nag surface
  (`ratesUpdatedAt` is stamped only when rates actually change).
- **STL → auto-GLB for gem designs** (gems ONLY, never jewelry): one STL upload computes volume
  (carat₀ calibration) AND generates the viewer GLB client-side (three STLLoader → single mesh
  named `Gemstone`, flat facet normals, mm→m scale → GLTFExporter). Works because a gem is one
  mesh whose look is the variant's preset; jewelry needs authored named parts. Manual GLB stays
  as an override.
- Species → default-toggle list (precious vs semi) to prefill new variants.
- Tier boundaries should sit at trade-magic weights on purpose (price cliffs at 1ct/2ct are
  trade-real, but set them deliberately).
