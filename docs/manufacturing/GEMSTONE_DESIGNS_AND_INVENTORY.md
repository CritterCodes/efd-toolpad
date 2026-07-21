# Gemstone Designs & Inventory Coupling — architecture

**Status:** draft for review (architecture-first; no code until this settles)
**Owner decisions captured:** gemstone = a Design (reuse the engine); reserve-on-paid; only finite
gems impose caps; **concept is a status, not an edition type**; simulated never used (natural | lab).

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

- **Pricing** is gem-appropriate (by carat / rarity / cut labor), not metal-volume + bench labor.
  Kept as a distinct pricing recipe; can start simple (flat retail) and grow.
- **No mounting/metal**; its "variants" are cut/size/quality variants of the stone.
- **REFRAKT**: a gem may have its own GLB (for the viewer/customizer) or none (concept).

### Edition type (same vocabulary as jewelry) — this is the CAP
- `one_of_one` → supply 1
- `limited` → supply N
- `unlimited` → no cap (∞)

### Status — the LIFECYCLE (orthogonal to edition; a concept can be any edition type)
- `concept` — **not yet cut.** Nothing physical exists; everything is made-to-order (lead time).
  A concept can be 1-of-1, limited, or unlimited — status ≠ cap.
- `cut` / `ready` — physical stone(s) exist / cuttable now.
- (mirrors jewelry design statuses: draft → … → ready → retired)

> **Key clarification:** "concept" does **not** change the cap. A `limited(5)` concept still caps at 5;
> it just means those 5 aren't cut yet (made-to-order with lead time). Availability math keys on
> **edition type**; status only affects in-stock-vs-made-to-order and lead time.

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

On a jewelry variant stone row, when linked to a gem design:
- `gemDesignId` (+ variantId if the gem has variants) replaces the SKU link.
- `gemsPerPiece` = qty of that gem consumed by ONE finished piece (usually 1; 3 for a 3-stone).
- Cost flows from the gem design's price (like SKU-linked rows flow from catalog cost).

## 6. Availability — the "available-to-promise" engine

### The rule
```
gemAvailable(G)      = supply(G) − reserved(G) − consumed(G)          // ∞ if unlimited
buildableFromGem(D)  = ⌊ gemAvailable(Gd) ÷ gemsPerPiece(D→Gd) ⌋       // per finite gem the design needs
buildable(D)         = min( editionRemaining(D), min over finite gems Gd of buildableFromGem(D) )
```
And the shared-cap invariant across every consumer:
```
Σ reserved(G) over all jewelry pieces  ≤  supply(G)
```

### Lifecycle of a unit (reserve-on-paid)
- **Checkout (unpaid):** soft-hold (short TTL) so two carts don't race the last stone. Optional but
  recommended; not the hard guard.
- **Paid order:** **reserve** — decrement gemAvailable atomically. This is where oversell is prevented.
  A paid order that can't reserve its gem fails/queues (shouldn't happen if buildable was enforced at
  add-to-cart, but the atomic check at payment is the source of truth).
- **Production/QC:** **consume** — reservation converts to consumed; the physical stone is set.
- **Cancel/refund:** release reservation back to available.

### Concept (not-yet-cut) gems
`gemAvailable` still = edition cap − reserved. A paid order on a `limited(5)` concept reserves one of
the 5 and creates a **cut work-order** for the artisan (made-to-order). Unlimited concept = pure
made-to-order, no cap, just lead time.

### Where the guard bites
- **Add-to-cart / configure:** show `buildable(D)`; block quantities above it.
- **Payment:** atomic reserve on each finite gem (the real guard; handles races + multi-design
  contention on a shared gem).
- **Admin edition edit:** can't set a jewelry edition higher than the gem allows if already committed.

## 7. Customizer tandem (REFRAKT)

The shop customizer must let a shopper configure the jewelry **and** its gem (pick a gem design /
variant, or customize a made-to-order gem). This is a REFRAKT `<Customizer>` concern — nesting a gem
configuration inside a jewelry configuration, emitting both selections. → REFRAKT feature request
(sibling to the size/cut and natural/lab FRs). Availability shown in the customizer comes from §6.

## 8. Open decisions

1. **Melee as a gem design?** Assumed no (commodity only). Confirm.
2. **Gem variants** — do gem designs need variants (e.g. one design, multiple sizes/qualities), or is
   each size/quality its own design? Affects the BOM link granularity.
3. **Soft-hold at checkout** — implement the TTL hold, or rely solely on the paid-time atomic reserve?
4. **Gem pricing recipe** — flat retail to start, or model carat×rate + cut labor now?
5. **Migration** — convert existing `products/gemstone` listings into gemstone Designs (each current
   listing = a `one_of_one`, status `cut`, its physical stone = the single piece).

## 9. Phased plan

1. **Unify the model** — gemstone Design (`category:'gemstone'`), edition types + `concept` status,
   gem pricing recipe. Migrate existing listings (§8.5). *No jewelry coupling yet.*
2. **BOM link + match lane** — jewelry stone row can link a gem design; match engine searches gem
   designs (the amethyst appears); cost flows from the gem.
3. **Availability engine** — buildable rollup, reserve-on-paid (atomic), consume-at-production,
   release-on-cancel, shared-cap invariant across consumers; surface `buildable` in admin + storefront.
4. **Customizer tandem** — REFRAKT FR + wiring so shoppers configure jewelry + gem together.

Related: [[production-pipeline-vision-doc]], the stone-match system in
`src/app/api/products/stones/*` + `src/services/stuller/stoneSearch.js`, and
`docs/refrakt/FR-gem-creation-natural-lab.md`.
