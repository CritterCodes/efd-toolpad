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
- a **dimensions** slider (0.25 mm steps on the length axis).

**Dimensions are locked ratios** — the design's GLB fixes all proportions (never entered data), so
sizing is a single **uniform scale** of the model. Slide the mm up → the model grows → the carat
readout climbs. Pick 1.5 ct → the model scales to match → the projected "≈ L × W mm" updates.
Ideally the mesh **rescales live in the viewer**; at minimum the readouts stay linked.

**Snapping applies ONLY to the field being edited; the derived field floats free and is labeled an
estimate.** Worked example — a 2:1 design where 1 ct ≈ 8 × 4 mm:
- editing **carat**: snaps 1.00 → 1.25 → 1.50…; at 1.25 ct the dims read "≈ 8.6 × 4.3 mm"
  (unsnapped, estimate).
- editing **dims**: snaps 8.25 → 8.50 → 8.75 mm…; at 8.5 × 4.25 mm the carat reads "≈ 1.2 ct"
  (unsnapped, estimate).
Never snap both — snapping the derived field would fight the driver and lie about the geometry.

**The edited field is the order's PRIMARY spec** — it's what the cutter targets. Ordered by carat →
carat is the deliverable, dims are approximate. Ordered by dims → the dims are the deliverable,
carat is approximate (final billing still trues up at actual carat weight; host concern). So the
emitted selection must record which one drove:

`{ sizeMode: 'carat' | 'dimensions', carat, lengthMm, widthMm, scale }` — the `sizeMode` field's
value is exact/snapped; the other measurements are derived estimates.

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

**The host supplies `baseCarat` — computed from the design's STL, not the GLB.** Gem designs
upload an STL alongside the GLB (the same CAD-volume machinery jewelry uses): the STL is a
watertight CAD solid, so its volume is exact —

```
carat₀ = stlVolumeCm3 × SG_species × 5        // 1 ct = 0.2 g
```

**⚠ Never compute carat₀ as signedVolume × SG of the GLB's display mesh.** GLB gem meshes are not
watertight — we proved on a real asset that `signedVolumeOfMesh` over-reports (a 1.3 mm melee
"measured" a volume larger than its own bounding box; it's why 1.11's `measureGems` uses the
girdle footprint). Fallback when no STL exists: footprint calibration —
`carat₀ = caratDiamondEq (1.11 measureGems) × (SG_species / 3.52)`.

**SG is per-species and host-supplied** (a 2 ct amethyst is much larger than a 2 ct sapphire —
SG 2.65 vs 4.0). REFRAKT should treat `baseCarat`/SG as opaque config inputs, not maintain a
species table or measure volume itself.

## 4. Suggested API surface

Config (per gem slot, or design-level for a whole-model stone; additive — viewers ignore it):

```js
sizing: {
  enabled: true,
  baseCarat: 2.84,             // host-computed: STL volume × SG × 5 (the model's weight at scale 1)
  sg: 2.65,                    // host-supplied specific gravity (species/variant)
  caratMin: 1, caratMax: 4,    // host bounds (the cutter's range)
  stepCt: 0.25, stepMm: 0.25,  // picker granularity
}
```

Customizer behavior when `sizing.enabled`:
- render the linked carat ⇄ mm control (either input drives the other);
- uniform-scale the gem mesh (whole scene for a gem-design GLB) live;
- snap ONLY the edited field to its step (`stepCt` or `stepMm`); the derived field is continuous
  and rendered as an estimate ("≈");
- clamp the edited field so the resulting carat stays within `[caratMin, caratMax]`;
- include `{ sizeMode, carat, lengthMm, widthMm, scale }` in the emitted selection/choice —
  `sizeMode` = which field the shopper edited last (their primary spec);
- fire the existing change callback so the host can reprice live (price is a host function of
  carat — rough $/ct tiers × yield — REFRAKT never prices).

## 5. Non-goals

- **Jewelry designs**: setting sizes are FIXED — this control never appears on a jewelry GLB's
  stones (shoppers there swap species/creation only, which 1.9/1.12 already handle).
- Non-uniform scaling, per-facet edits, or cut changes — the design's ratios are locked.
- Pricing, deposits, tolerance handling — host concerns keyed off the emitted carat.

## 6. Acceptance

- A gem-design GLB with `sizing` config shows the linked carat ⇄ mm control; dragging either
  updates the other, the model visibly rescales, and bounds are respected.
- Snapping: only the edited field snaps (carat → 0.25 ct steps; mm → 0.25 mm steps); the derived
  field is continuous and visibly marked "≈" — e.g. carat-edit 1.25 ct shows ≈ 8.6 × 4.3 mm on a
  2:1 design; mm-edit 8.5 × 4.25 shows ≈ 1.2 ct.
- Selection output carries `{ sizeMode, carat, lengthMm, widthMm, scale }` and round-trips through
  `applyChoicesToMeshMap`/`buildRefraktSelection` (re-opening a saved selection restores the size
  AND which field was primary).
- carat₀ sanity: for a round-ish design at base size, carat₀ ≈ footprint diamond-equivalent ×
  SG/3.52 within a few percent; no dependence on signed volume of open meshes.
