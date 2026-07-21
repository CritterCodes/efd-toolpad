# Gemstone Designs & Inventory Coupling — architecture

**Status:** draft for review (architecture-first; no code until this settles)
**Owner decisions captured:** gemstone = a Design (reuse the engine); reserve-on-paid; only finite
gems impose caps; **"concept" is the EXISTING listing state (a Design with no finished Piece, listed
MTO and priced off estimate — ripens to RTS when a Piece exists), NOT a new status or edition**;
simulated never used (natural | lab); **shop selection is DISCRETE — jewelry setting sizes are fixed
(swap species/creation only), gem purchase = pick an in-stock rough variant, off-menu = special
request → quote; NO continuous size customization and NO new REFRAKT FR (existing customizer covers it).**

---

## 1. Problem

A jewelry design can be set with a gemstone that **we** produce (an artisan cuts it), not just a
commodity Stuller stone. That gem is itself a product with its own supply. Two things must hold:

1. A jewelry design that "calls for" a gem design must be **linked** to it (BOM), price from it, and
   let the customizer configure both.
2. **No overselling.** If a jewelry design can make 10 but the gem it needs has only 5 left, only 5
   are buildable. If two jewelry designs each say 10 but share one gem capped at 10, the *combined*
   builds can't exceed 10.

## 2. Where we are today (the seam)

There are **two disconnected "stone" concepts**:

| Concept | Collection | Nature | Used by |
|---|---|---|---|
| **Component stone** | `stoneSkus` | commodity melee/calibrated, Stuller wholesale, cron-priced | jewelry variant stone rows (built) |
| **Gemstone listing** | `products` (`productType:'gemstone'`) | ONE physical stone — carat/cut/cert/acquisition, `inventory:{available,reserved,usedInProductId}` | storefront listing, gem-cutter created |

The stone-match engine (just shipped) searches `stoneSkus` + live Stuller. It does **not** search the
gemstone listings — which is why an artisan-cut amethyst can't be found from a jewelry design yet.

The gemstone listing is implicitly a **1-of-1 with boolean availability**. The vision needs supply
(1 / N / ∞), lifecycle (cut vs concept), and consumption accounting — i.e. it needs to be a Design.

## 3. Model — gemstone as a Design

Reuse the Design engine with `category: 'gemstone'`. It inherits editions, variants, pieces, status,
and (the point) availability accounting. Differences from a jewelry design:

- **Pricing = carat × rate + cut labor** (DECIDED). Per-carat rate by material/quality, plus a cut-
  labor line — computed LIVE at the chosen size (like metal, like the existing concept estimate).
- **No mounting/metal.**
- **REFRAKT**: a gem may have its own GLB (for the viewer/customizer) or none (concept).

### Variants = ROUGH inventory (the supply) — DECIDED
A gem design's **variants are the rough we actually hold** — this is what keeps us from selling a
stone the rough can't yield. Each variant describes one lot of rough:

- `quality` (clarity/color grade), `material` (matches the design),
- `sizeRange` — the min/max finished size **cuttable from that rough** (carat and/or mm),
- `roughQty` — how many stones that lot can yield (usually 1 per rough piece → effectively 1-of-1;
  a matched lot → limited(N)).

Examples the owner gave: *"5 pieces of rough, same material, 5 different qualities/sizes"* → 5 variants
(or grouped by spec); *"3 can cut 1ct flawless, 2 can cut 2ct slightly-included"* → variant A
`{1ct, VVS, qty 3}`, variant B `{2ct, SI, qty 2}`.

**Buying a gem design = picking an available rough variant** (DECIDED — the customer does NOT slide a
continuous size). The shop lists the design's in-stock rough variants, each an **immediately-buyable**
cut (its size + quality). Selecting one cuts a **Piece** from that rough. A species/size/clarity with
**no matching rough in stock = a special request** — a gem-cutter sources rough for it → quote/MTO,
NOT an instant buy. `sizeRange` on a variant describes what that rough *can* be cut to (capability),
but the shopper's choice is **discrete** (this variant), not a free number.

> Variants (not a piece-only field) are the right home: supply + cuttability live on the rough, so we
> never promise a stone the rough can't yield. The finished size is captured on the **Piece** when cut.

### Edition type (same vocabulary as jewelry) — this is the CAP
- `one_of_one` → supply 1
- `limited` → supply N
- `unlimited` → no cap (∞)

### Status — the SHARED design vocabulary (no gemstone-specific status)
Gemstone designs use the **same statuses as jewelry**: `draft, cad_requested, cad_in_progress,
cad_qc, ready, retired`. We do **not** add a "concept" status.

### "Concept" = an existing LISTING state (reuse it), not a status
The catalog already models this: `list-concept` lists a Design that has **no finished Piece** as a
`concept` product, priced off a LIVE estimate (metal for jewelry; carat/rate for a gem). When a Piece
is actually produced, `list-product` **ripens** that concept product into a real (ready-to-ship) one.
That's the **made-to-order → ready-to-ship** lifecycle (`availability: 'made-to-order'`).

So for gemstones:
- **"Not yet cut" = a gem design with no cut Piece = listed as concept/MTO** (priced off estimate).
  Cutting it (creating a Piece) ripens it to RTS. No new vocabulary.
- This is **orthogonal to edition type**: a `limited(5)` gem can be a concept (0 cut yet, all 5 MTO)
  or partially cut (2 Pieces in stock + 3 MTO). Availability math keys on **edition cap**; concept vs
  ripened only affects **in-stock (RTS) vs made-to-order (lead time)**, never the cap.

> **Key clarification:** "concept" never changes the cap. A `limited(5)` concept still caps at 5; it
> just means none are cut yet (all made-to-order). Availability = edition cap − reserved − consumed;
> concept-vs-RTS is a fulfillment/lead-time distinction, handled by the existing list-concept → ripen
> machinery — identical to an MTO jewelry design.

## 4. Three stone sources, reconciled

A jewelry variant stone row can resolve to one of three sources. The row already carries the measured
spec (type/cut/mm/carat/creation); the *source* is what it links to:

1. **Commodity SKU** (`stoneSkus`, Stuller-backed) — melee/calibrated. Effectively **unlimited** → no
   cap, no BOM node. This is the common case (pavé, melee).
2. **Live Stuller** — sourced then saved as a commodity SKU. Same as (1) for accounting.
3. **Gem design** (`category:'gemstone'`) — an in-house/finite stone. **This is the only source that
   imposes a cap** and creates a BOM edge.

**Principle:** only **finite gem designs** (1-of-1 / limited) create inventory coupling. Melee and
Stuller stay uncapped. This keeps the dependency graph tiny — typically just the center stone.
*(Assumption to confirm: melee is never a finite in-house gem design.)*

The match engine gains a fourth lane: search **gem designs** too (so the artisan amethyst appears),
ranked alongside catalog + Stuller, tagged `kind: 'gemDesign'`.

## 5. BOM link

A jewelry design's **setting size is FIXED** (it's in the CAD). So a stone slot needs a gem of *that*
size — the shopper never changes the carat/dimensions. On a jewelry variant stone row linked to gems:
- the slot pins a **`sizeMm`/carat** (the setting) + an **allowed species set** (e.g. amethyst, peridot,
  sapphire) the shopper may swap between. Each allowed species resolves to gem designs / rough variants
  **of that fixed size**.
- `gemsPerPiece` = qty consumed by ONE finished piece (usually 1; 3 for a 3-stone).
- **Cost flows live** from the chosen gem: carat (the fixed setting size) × material/quality rate + cut labor.
- Wanting a **different size, or a gem the design doesn't offer, = a CAD edit → special request → quote**
  (§ customization), not a self-serve swap.

## 6. Availability — the "available-to-promise" engine

### The rule (supply lives on the VARIANT = rough lot)
```
variantAvailable(V)  = roughQty(V) − reserved(V) − consumed(V)        // ∞ only for the unlimited case
// rough lots that can be cut to the slot's FIXED setting size s (+ chosen species):
satisfying(G, s)     = variants V of G where s ∈ sizeRange(V)
gemAvailable(G, s)   = Σ variantAvailable(V) for V in satisfying(G, s)
buildableFromGem(D)  = ⌊ gemAvailable(Gd, sizeD) ÷ gemsPerPiece(D→Gd) ⌋   // sizeD = the design's setting size
buildable(D)         = min( editionRemaining(D), min over finite gems Gd of buildableFromGem(D) )
```
No rough can cut the setting size (`satisfying(G, s) = ∅`) → **special request** (source rough), not buyable.
Shared-cap invariant across every consumer, per rough lot:
```
Σ reserved(V) over all jewelry pieces  ≤  roughQty(V)
```

### Lifecycle of a unit — soft-hold + reserve-on-paid (DECIDED)
- **Checkout / configure:** **45-minute soft-hold** on the chosen rough lot (Carvana-style) — TTL
  auto-releases if the order isn't paid. Prevents two carts racing the last rough while one checks out.
- **Paid order:** **reserve** — atomically decrement the rough lot. This is the hard oversell guard
  (source of truth; handles races + multiple designs contending for one lot). Converts the soft-hold.
- **Production/QC:** **consume** — the rough is cut into a Piece at the ordered size; reservation → consumed.
- **Cancel / refund / hold-expiry:** release back to available.

### Concept / made-to-order (not-yet-cut) gems
`gemAvailable` still = edition cap − reserved − consumed, regardless of whether stones are cut. A
paid order on a `limited(5)` gem with 0 cut (concept/MTO) reserves one of the 5 and creates a **cut
work-order** (a Piece) for the artisan — this is exactly the concept→ripen path. A gem with cut
Pieces in stock (RTS) fills from stock. Unlimited + not-cut = pure made-to-order, no cap, just lead
time. Concept-vs-RTS changes fulfillment/lead-time, not the cap.

### Where the guard bites
- **Add-to-cart / configure:** show `buildable(D)`; block quantities above it.
- **Payment:** atomic reserve on each finite gem (the real guard; handles races + multi-design
  contention on a shared gem).
- **Admin edition edit:** can't set a jewelry edition higher than the gem allows if already committed.

## 7. Customization — NO new REFRAKT FR needed

The shop customization rules (owner, DECIDED):

- **Jewelry:** setting sizes are **fixed in the CAD**. A shopper may swap the gem's **species**
  (amethyst ↔ peridot) and **natural/lab**, but **never** the carat/dimensions. → This is *exactly*
  what REFRAKT's customizer already does: pick from admin-allowed **presets** (species/finish, 1.9) +
  **creation** (natural/lab, 1.12). **Nothing new required from REFRAKT.**
- **Different gem the design doesn't offer, or a different size = a CAD edit → special request → quote.**
  Not a self-serve customizer path.
- **Buying a gem design:** the shopper **picks an available rough variant** (a discrete, in-stock cut).
  That's a **product variant selector + special-request** flow — plain commerce, app-side, using the
  gem's own GLB in the viewer. Not a REFRAKT 3D-customization primitive.

So there is **no size-slider and no gem-swap-on-a-piece** to build into REFRAKT. The earlier assumption
(continuous size customization / nesting gem config in jewelry) is dropped. Availability (§6) is shown
in the shop from the host, not the engine.

## 8. Decisions — RESOLVED (2026-07-21)

1. **Melee is never a finite gem design** — commodity only (`stoneSkus`/Stuller), never capped. ✓
2. **Gem variants = rough lots** (§3). One gem design; its variants are the rough we hold (quality +
   cuttable size + qty). **Shop selection is DISCRETE** — buying a gem = pick an in-stock rough variant;
   jewelry setting size is FIXED (shopper swaps species/creation only). Off-menu size or gem = CAD edit /
   special request → quote. **No continuous size customization, no new REFRAKT FR** (§7). ✓
3. **Soft-hold = 45-min TTL** (Carvana-style) at checkout/configure, plus the paid-time atomic reserve
   as the hard guard. ✓
4. **Pricing = carat × (material/quality) rate + cut labor**, computed live at the chosen size. ✓
5. **Migration** — each existing `products/gemstone` listing → a `one_of_one` Design, status `ready`,
   its physical stone = one already-cut **RTS Piece** (ripened, not a concept). ✓

Remaining to nail down during build: exact per-carat rate table (by material/quality) + which cut-labor
task(s); how a "special request" (out-of-range size) enters the pipeline (custom-order intake vs a new
rough variant); whether one rough lot can ever yield >1 stone (assume 1 for now).

## 9. Phased plan

1. **Unify the model** — gemstone Design (`category:'gemstone'`), edition types, rough-variant supply,
   gem pricing recipe (carat×rate+labor). Migrate existing listings (§8.5). *No jewelry coupling yet.*
2. **BOM link + match lane** — jewelry stone slot pins size + allowed species → resolves to gem designs;
   match engine searches gem designs (the amethyst appears); cost flows from the gem.
3. **Availability engine** — buildable rollup, 45-min soft-hold, reserve-on-paid (atomic),
   consume-at-production, release-on-cancel, shared-cap invariant; surface `buildable` in admin + shop.
4. **Shop surfaces** — gem-design variant selector (pick an in-stock cut) + species/creation swap on
   jewelry (REFRAKT already does this — no engine FR) + the special-request → quote path for off-menu.

None of Phases 1–3 depend on REFRAKT. Phase 4 uses REFRAKT's EXISTING customizer (no new FR, §7).

Related: [[production-pipeline-vision-doc]], the stone-match system in
`src/app/api/products/stones/*` + `src/services/stuller/stoneSearch.js`, and
`docs/refrakt/FR-gem-creation-natural-lab.md`.
