# Handoff — adopt the package-owned material vocabulary (`@crittercodes/refrakt` 1.2.0)

**For:** the agent working in `efd-admin`.
**Why:** the metal/gem **vocabulary** (which finishes/gems exist + validators) is now owned and
exported by the engine package as of **1.2.0**. efd-admin currently re-declares its own lists,
which must match the engine exactly or saves 400 / pickers drift (the "vocab contract"
chokepoint). Replace admin's hardcoded lists with imports from the package — one source of truth.

> The refrakt package side is **done and published** (1.2.0). This file is only about the
> efd-admin adoption. Do **not** edit the refrakt repo.

---

## The one rule that prevents breakage: **offered ≠ valid**

The package exports two different things — use the right one for the right job:

| Use it for… | Import | Contents |
|---|---|---|
| **UI pickers** (dropdowns, swatches) | `METALS`, `GEMS`, `MATERIAL_LIBRARY` | the **curated** offered set — `{ id, label, kind, finishWord, swatch }`. **6 gems, no `marquise`** (marquise is a *cut*, not a material). |
| **Validation** (DB / config allow-lists) | `VALID_FINISHES`, `VALID_GEM_PRESETS`, `isFinish`, `isGemPreset`, `validateMeshMap` | the **valid engine vocab** — a **superset** that still includes `marquise` and anything the engine renders. |

⚠️ **Trap:** admin's current `GEM_PRESETS` includes `'marquise'`. If you validate against the
*curated* `GEMS` ids, you'll reject legacy/valid configs that contain `marquise`. **Validate
against `VALID_GEM_PRESETS` / `isGemPreset` / `validateMeshMap`** (the superset), never against
the curated picker list.

All exports (`src/index.js` barrel):
`METALS, GEMS, MATERIAL_LIBRARY, METAL_LABEL, GEM_LABEL, METAL_FINISH_WORD, GEM_FINISH_WORD,
VALID_FINISHES, VALID_GEM_PRESETS, isFinish, isGemPreset, validateMeshMap`.
See the package `docs/INTEGRATION_GUIDE.md` §8 and `CHANGELOG.md` (1.2.0).

---

## Steps

### 1. Bump the dependency
`package.json`: `@crittercodes/refrakt` → `^1.2.0`, then `pnpm install` (it'll pull 1.2.0).

### 2. `src/services/products/productContract.js` (lines 13–14) — the canonical lists
These two `export const`s are the root of the duplication and are used by **products *and*
customs**. Lowest-blast-radius swap — re-export from the package so every existing `.includes()`
call site keeps working but now sources the engine's valid vocab:

```js
// was:
// export const METAL_FINISHES = ['gold','satin','whiteGold','roseGold','platinum','silver'];
// export const GEM_PRESETS    = ['diamond','amethyst','ruby','sapphire','emerald','marquise','moissanite'];
export { VALID_FINISHES as METAL_FINISHES, VALID_GEM_PRESETS as GEM_PRESETS } from '@crittercodes/refrakt';
```

These arrays are **validation allow-lists** — `VALID_*` (superset, incl. `marquise`) is the
correct source. **But first check** whether any *UI/form* renders option lists off
`METAL_FINISHES`/`GEM_PRESETS`; if so, point that UI at the curated `METALS`/`GEMS` instead
(so it doesn't start offering `marquise`). `AVAILABILITY` stays local (not engine vocab).

### 3. `src/services/customs/customViewer.js` — `validateDesignModel` (lines 14–33)
It already imports `METAL_FINISHES, GEM_PRESETS` from productContract, so step 2 fixes the data
source with no change here. Optional tidy: replace the `.includes()` checks with `isFinish` /
`isGemPreset` from the package. **Keep admin's business rules** (`glbUrl` required, non-empty
`meshMap`, "gem slot needs a gemPreset OR custom `ior`") — the package's `validateMeshMap` only
covers type + finish/preset validity, not those admin-specific rules. The `setDesignModel` MERGE
behavior (preserves `stlVolumeCm3`) must stay.

### 4. `src/app/api/glb/inspect/route.js` (line 31) — local `GEM_PRESETS` Set
```js
import { VALID_GEM_PRESETS } from '@crittercodes/refrakt';
const GEM_PRESETS = new Set(VALID_GEM_PRESETS); // superset — keeps marquise recognition
```

### 5. Run the contract tests
`customViewer.test.js` and `productContract.test.js` encode the contract — run them and confirm
green. They are the safety net for this swap (esp. that `marquise` still validates).

---

## Verify
- `pnpm build` clean.
- Tests green (`*.test.js` above).
- Round-trip: open a custom order in `<Studio>`, save → `PUT /design-model` succeeds (no 400);
  the `/d/<token>` share view still renders.
- Sanity: a config containing `gemPreset: 'marquise'` still passes `validateDesignModel`.

## Out of scope (separate concern)
Removing the now-dead local `src/components/viewers/MaterialAssigner.jsx` +
`StudioViewer.jsx` is a different cleanup (already on the radar from the migration audit) — not
part of vocab adoption. Keep `GlbReviewModal.jsx` + `JewelryViewerClient.jsx`.

## Net effect
efd-admin stops owning a copy of the material vocabulary; it imports it. Future engine vocab
changes (new gem, new finish) flow in via a version bump — no hand-syncing, no silent 400s.
