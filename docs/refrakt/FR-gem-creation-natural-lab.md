# Feature request — customizer should offer **Natural vs Lab-Grown** per stone

**From:** efd-admin (design / drop pricing + shop customizer)
**For:** REFRAKT lead
**Status:** request. The admin side is BUILT (per-stone `creation` on variant stones + Stuller
sourcing filters by it). This asks REFRAKT to expose the same choice to shoppers in the customizer.

---

## 1. What we need

A **per-stone `creation`** attribute — **`natural | lab`** (binary; we never sell simulated) —
that the **Customizer** lets a shopper choose, per stone, and that lands in the built selection /
config the same way finish and gem preset do.

```js
// gem slot in the config / customizer selection
{ nameContains: 'Diamond_00', type: 'gem', gemPreset: 'diamond',
  lengthMm: 2.0, widthMm: 2.0, carat: 0.03, cut: 'round',
  creation: 'natural' }   // ← the new field (default 'natural')
```

## 2. Why it's per-STONE, not per-design or per-variant

The owner is explicit: creation is **not** a design property and **not** a global variant property —
**a single variant or customized piece can mix natural and lab** (e.g. a natural center with lab-grown
melee, a very common cost play). So it must live on the **individual gem slot**, selectable per stone
(or per group of identical stones), never as one switch for the whole piece.

## 3. Why it belongs in REFRAKT (the customizer), not just the admin

This is the one gem attribute that crossed the line into REFRAKT's territory: **the shop customizer is
REFRAKT's `<Customizer>`, and the owner wants shoppers to pick natural vs lab there.** It's a selectable
option on the customization surface, alongside metal/finish. Everything downstream (pricing, sourcing)
already reads it — see §5.

Note it is **not a visual change** — a lab and a natural diamond render identically, so REFRAKT never
has to shade them differently. It's a selectable, stored attribute that rides on the gem slot.

## 4. Suggested surface

- Add `creation` to the gem material vocabulary / customizable option set, values `['natural','lab']`,
  default `'natural'`.
- In `<Customizer>`, expose it as a per-stone (or per-gem-group) toggle, defaulting from the config.
- Include it in `buildRefraktSelection` / `buildSelectionFromCustomize` output so the host reads the
  shopper's choice per slot.
- In `<Studio>`, a matching per-slot default so the admin can set the design's baseline creation
  (which the shopper can then override in the customizer).

Additive only — viewers/hosts ignore unknown keys, and a missing `creation` means `natural`.

## 5. What the host already does with it (so you can see the shape)

The admin (efd-admin) already treats `creation` as a first-class per-stone field:
- Variant stone rows carry `creation` (`natural | lab`), default natural, editable per row.
- Stuller sourcing branches on it: **serialized centers** use `/v2/gem/diamonds` (natural) vs
  `/v2/gem/labgrowndiamonds` (lab); **melee/calibrated** uses `/v2/products` filtered by the
  `StoneUniqueness` lab-grown facet + SKU/description classification (`DIAMOND-GEN…` natural vs
  `LAB-DIAMOND…` lab — a ~4× price difference at 2 mm, so it matters).
- The catalog auto-match treats creation as a HARD gate (a natural row never links a lab SKU).

So the moment the customizer emits `creation` per slot, the host prices + sources the shopper's exact
choice with zero extra mapping.

## 6. Acceptance

- Customizer shows a natural/lab choice per stone; changing it updates the built selection.
- The choice persists in the saved config / selection per gem slot (mixed natural+lab in one piece works).
- Studio carries a per-slot default; missing value reads as `natural`.

Related: [[FR-gem-size-and-cut]] (this is the same additive-gem-slot-field pattern).
