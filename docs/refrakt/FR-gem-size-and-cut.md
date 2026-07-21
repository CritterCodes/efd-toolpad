# Feature request — REFRAKT should expose per-gem **size** and **cut**

**From:** efd-admin (design / drop pricing)
**For:** REFRAKT lead
**Status:** request (not yet implemented — admin has a self-contained stopgap; see §7)

---

## 1. What we need

For every **gem mesh** in a GLB, REFRAKT should determine and store two things:

- **`carat`** — a diamond-equivalent carat weight from the stone's measured size.
- **`cut`** — a shape class (at least `round | square | fancy`; more is welcome).

…and write them onto the gem slot in the saved config, e.g.:

```js
{ nameContains: 'Diamond_00', match: 'exact', type: 'gem', gemPreset: 'diamond',
  carat: 0.01, cut: 'round' }        // ← the two new fields
```

Additive fields only — viewers/customizer ignore unknown keys.

## 2. Why REFRAKT and not the host

REFRAKT already **loads + DRACO/meshopt-decodes the GLB (via drei), identifies which meshes are gems (the meshMap), and normalizes the scene.** It's the single place that has both the geometry and the gem identity. Hosts re-parsing the GLB is duplicative and fragile (decoder setup, unit guessing, matrix handling). If REFRAKT stamps size + cut at configure/save time, every host just **reads** them — no second GLB parse. The admin will delete its interim measurer (§7) the moment this ships.

## 3. Smart guessing — **size**

Requirements, learned the hard way on real assets:

1. **Use the girdle FOOTPRINT (bounding-box length × width), NOT signed volume.** Cut-stone meshes are **not watertight**, so `signedVolumeOfMesh` over-reports — on our sample a 1.3 mm melee "measured" a volume larger than its own bounding box. The bbox footprint is reliable and is how the trade sizes stones.
2. **Treat every stone as a diamond** (diamond-equivalent carat). This matches how the bench eyeballs colored stones ("a 5.5 mm amethyst ≈ the 0.5 ct diamond I'd charge for").
3. **Formula we validated** (L, W = the two largest bbox dims, in mm):
   - `carat = 0.00364 × L × W²`  (depth taken as ~0.62 × width; factor calibrated so a 6.5 mm round ≈ 1.00 ct)
   - For a round this reduces to the standard `(diameter / 6.5)³`.
   - Snap L and W to **0.25 mm** (trade increment) before computing, so near-identical stones bucket together.
4. **Auto-detect units — do not require the caller to state them.** glTF's standard unit is meters, and our CAD exports come through that way (a ring's overall bbox ≈ `0.028` model units = 28 mm). Detect from the overall model size: `<1 → meters`, `<5 → cm`, else `mm`. (This supersedes the units-punt in the existing `core/geometry.js` `computeSlotVolumes` doc — thread #133/#137 — at least for gems.)

**Validation target (sample `efd_ring.glb`):** melee read `0.009 / 0.012 / 0.02 / 0.04 ct`, center amethyst `~4.5 ct`. Owner's bench reference: 1.25 mm ≈ 0.0085 ct, 1.5 mm ≈ 0.013 ct, 2 mm ≈ 0.03 ct — matched.

## 4. Smart guessing — **cut**

- Classify from bbox proportions + footprint **fill** (projected outline area ÷ bounding rectangle):
  - aspect (L/W) ≥ ~1.18 → **fancy** (elongated: oval/pear/marquise/emerald/baguette).
  - else fill > ~0.86 → **square** (princess/asscher); else → **round** (a circle fills ~0.79 of its square).
- MVP is `round | square | fancy`. Finer classes (pear vs emerald vs baguette) later via aspect + fill are welcome but not required.
- **Cut should be a human-overridable default, not a pure guess.** Please add a small per-gem **cut selector in the Studio**, pre-filled from the geometry guess, and store the (possibly-overridden) value. The geometry default means nobody hand-picks "round" 18 times; the override makes it authoritative for the odd fancy stone. This authoritative-cut is the main reason to do it in REFRAKT rather than leave it a host-side guess.

## 5. Units / accuracy notes (non-goals)

- Exact per-cut weight factors differ (round ≈ 0.0061, princess ≈ 0.0083, baguette ≈ 0.0092). A **single generic factor is fine** — the host only uses `carat` for coarse setting-labor bands (`<0.49 / 0.5–0.99 / 1ct+`) and for matching a stone to a SKU; final precision comes from the host's linked Stuller SKU, not this estimate.
- Depth from the raw mesh z is unreliable (bezel seats, tilt) — that's why we estimate depth from width rather than measure it.

## 6. Suggested API surface

Either (or both):
- **Config-embedded (preferred):** gem slots carry `carat` + `cut` in the saved config (§1). Host reads from `variant.viewerConfig.meshMap`.
- **Pure helper:** export from `core/geometry.js` something like `measureGems(root, meshMap) → { [slotName]: { carat, cut, lengthMm, widthMm } }`, with internal unit auto-detection, so non-studio callers can measure a loaded scene directly.

## 7. Host stopgap you'll be replacing

The admin currently measures size itself in `GemMeasurer.js` (a headless drei `<Canvas>` on the design page) using only the public `meshMatchesSlot` export + `three`. It implements exactly §3 (footprint → carat, unit auto-detect). It works but re-parses the GLB and has no authoritative cut. **When this request lands, the admin drops `GemMeasurer` and reads `carat` + `cut` from the config.** Happy to share the footprint/carat and convex-hull cut-classifier code as a reference implementation.

## 8. Acceptance

- Sample `efd_ring.glb`: gems report the carats in §3 and a `cut` per stone.
- Values are **stable across variants** (same GLB → same numbers), so downstream setting-labor lines up regardless of the metal/gem-type chosen.
- Studio cut override persists into the saved config.
