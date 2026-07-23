# Feature request — Customizer **gem size** control (carat ⇄ dimensions, live model scaling)

**From:** efd-admin (gemstone designs — cut stones sold as design products)
**For:** REFRAKT lead
**Status:** request
**Prior art:** FR-gem-size-and-cut (shipped 1.11), FR-gem-creation-natural-lab (shipped 1.12)

---

## 1. What we need

EFD sells **gemstone designs** — a faceting design (its own GLB; the whole model IS the stone) cut
to order in a species the shopper picks. The shopper must be able to choose the stone's **size**,
with two linked controls that stay in sync:

- a **carat** picker (0.25 ct steps), bounded by a host-supplied `[caratMin, caratMax]`, and
- a **dimensions** slider (~0.25 mm steps on the length axis).

**Dimensions are locked ratios** — the design fixes all proportions, so sizing is a single
**uniform scale** of the model. Slide the mm up → the model grows → the carat readout climbs.
Pick 1.5 ct → the model scales to match → the projected "≈ L × W mm" updates. Ideally the mesh
**rescales live in the viewer**; at minimum the readouts stay linked.

The chosen size must come out in the selection the host persists (`buildSelectionFromCustomize`):
`{ carat, lengthMm, widthMm, scale }`.

## 2. Why REFRAKT and not the host

Same reason as the 1.11 FR: REFRAKT owns the loaded geometry, the unit detection, and the
customizer seam. Live rescaling, base-size measurement, and emitting the choice through the
selection contract are engine concerns; the host supplies business inputs (SG, bounds, steps) via
config and prices the result.

## 3. The math (and a trap we already hit)

Uniform scale makes this closed-form — no per-step re-measurement:

```
dims(s)  = baseDims × s                 // locked ratios
carat(s) = carat₀ × s³                  // weight scales with volume

carat → scale:  s = (carat / carat₀)^(1/3)
mm    → scale:  s = chosenLength / baseLengthMm
```

Everything hinges on one good **carat₀** (the stone's weight at scale 1) for the shopper's species.

**⚠ Do NOT compute carat₀ as signedVolume × SG.** Cut-stone meshes are not watertight — we proved
on a real asset that `signedVolumeOfMesh` over-reports (a 1.3 mm melee "measured" a volume larger
than its own bounding box; it's why 1.11's `measureGems` uses the girdle footprint). Two robust
options, either is fine:

1. **Footprint calibration (recommended — reuses 1.11):** `measureGems` already yields a
   diamond-equivalent carat from `0.00364 × L × W²` (diamond SG 3.52). Rescale by species density:
   `carat₀ = caratDiamondEq × (SG_species / 3.52)`. Zero new geometry code.
2. **Convex-hull volume × SG** — the hull is stable on open meshes (slight over-estimate on the
   pavilion, acceptable for ordering; the cutter trues up at final weight anyway).

**SG is per-species and host-supplied** (a 2 ct amethyst is much larger than a 2 ct sapphire —
SG 2.65 vs 4.0). REFRAKT should treat SG as an opaque config input, not maintain a species table.

## 4. Suggested API surface

Config (per gem slot, or design-level for a whole-model stone; additive — viewers ignore it):

```js
sizing: {
  enabled: true,
  sg: 2.65,                    // host-supplied specific gravity (species/variant)
  caratMin: 1, caratMax: 4,    // host bounds (the cutter's range)
  stepCt: 0.25, stepMm: 0.25,  // picker granularity
}
```

Customizer behavior when `sizing.enabled`:
- render the linked carat ⇄ mm control (either input drives the other);
- uniform-scale the gem mesh (whole scene for a gem-design GLB) live;
- clamp to `[caratMin, caratMax]` after snapping to steps;
- include `{ carat, lengthMm, widthMm, scale }` in the emitted selection/choice;
- fire the existing change callback so the host can reprice live (price is a host function of
  carat — rough $/ct tiers × yield — REFRAKT never prices).

## 5. Non-goals

- **Jewelry designs**: setting sizes are FIXED — this control never appears on a jewelry GLB's
  stones (shoppers there swap species/creation only, which 1.9/1.12 already handle).
- Non-uniform scaling, per-facet edits, or cut changes — the design's ratios are locked.
- Pricing, deposits, tolerance handling — host concerns keyed off the emitted carat.

## 6. Acceptance

- A gem-design GLB with `sizing` config shows the linked carat ⇄ mm control; dragging either
  updates the other, the model visibly rescales, and steps/bounds are respected.
- Selection output carries `{ carat, lengthMm, widthMm, scale }` and round-trips through
  `applyChoicesToMeshMap`/`buildRefraktSelection` (re-opening a saved selection restores the size).
- carat₀ sanity: for a round-ish design at base size, carat₀ ≈ footprint diamond-equivalent ×
  SG/3.52 within a few percent; no dependence on signed volume of open meshes.
