# @crittercodes/refrakt

Real-time BVH ray-marching gemstone rendering engine for the web (React Three Fiber).
Physically simulates refraction, total internal reflection, dispersion, Beer–Lambert
absorption, velvet turbidity, and clarity/opacity at 60fps in the browser.

Ships these surfaces:
- **`JewelryViewer`** — read-only product viewer (orbit / zoom / turntable) driven by a config.
- **`Customizer`** _(≥1.9.0)_ — customer-facing "Studio-lite" configurator: the shopper clicks a part
  on the live model and picks from the admin-allowed presets. Emits a `RefraktSelection` **live** via
  `onConfigure` on every change (host re-prices) — this surface **never prices**. Driven by
  `meshMap[].customizable` (see INTEGRATION_GUIDE §5a).
- **`ConfiguratorSetup`** _(≥1.9.0)_ — admin authoring surface: per part, toggle "customer can change",
  multi-select the allowed presets, set the default. Emits the `customizable` meshMap the `Customizer`
  consumes (see INTEGRATION_GUIDE §5b). _(≥1.10.0)_ also emits a per-slot `volumeCm3` on metal slots for
  host-side per-part metal pricing (`modelUnit` prop sets the GLB unit). _(≥1.11.0)_ and per-gem
  `lengthMm`/`widthMm`/`depthMm?`/`carat` + a `cut` on gem slots (footprint-measured, unit auto-detected).
- **`Studio`** — full-screen authoring editor (parts tree · viewer · inspector) that *produces*
  that config. Same engine, so what you stage equals what the viewer shows. _(≥1.11.0)_ a per-gem
  **cut selector** (round · oval · princess · cushion · radiant · emerald · asscher · baguette · pear ·
  marquise · heart · trillion) pre-filled from a geometry guess, plus measured mm/carat, land on each gem slot.
- The lower-level engine pieces (`GEM_CONFIGS`, `makeMat`, `resolveGemCfg`, …) for custom scenes.

This is the **single source of truth** for the REFRAKT engine. The standalone demo at the repo
root consumes it via the workspace; `efd-shop` and `efd-admin` install it from GitHub Packages.

## Install (consuming apps)

Add an `.npmrc` next to the app's `package.json`:

```
@crittercodes:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then:

```bash
pnpm add @crittercodes/refrakt
```

Next.js must transpile it (it ships JSX + client components):

```js
// next.config.mjs
const nextConfig = { transpilePackages: ['@crittercodes/refrakt'] };
```

`three`, `@react-three/fiber`, `@react-three/drei`, `three-mesh-bvh`, and `react` are
**peer dependencies** — the app provides them, so there is exactly one copy of three.js.

## Usage

Both components are WebGL — **never SSR them**; load via `dynamic(..., { ssr: false })`.

```jsx
// Read-only product viewer
const JewelryViewer = dynamic(() => import('@crittercodes/refrakt/JewelryViewer'), { ssr: false });
<JewelryViewer glbUrl="/models/ring.glb" config={{ meshMap: [/* … */] }} />

// Authoring editor (produces the config above)
const Studio = dynamic(() => import('@crittercodes/refrakt/Studio'), { ssr: false });
<Studio
  glbUrl={hostedGlbUrl}        // load a model by URL (or omit for the upload drop-zone)
  initialConfig={savedConfig}  // re-open a saved piece for editing
  materials={tenantMaterials}  // optional: this shop's own materials (see below)
  saveLabel="Save & send to QC"
  onSave={(config) => persist(config)}          // emits the full JewelryViewer config
  onSaveMaterial={(d) => persistMaterial(d)}    // optional: "Save as material" → a reusable descriptor
  onClose={() => goBack()}     // renders a close button when provided
/>
```

**The config** (`{ glbUrl?, environment, background, orientation:[x,y,z]rad, controls?, meshMap[] }`) is what
both components speak — `Studio` outputs it, `JewelryViewer` renders it. `meshMap` slot:
`{ nameContains, match:'exact', type:'metal'|'gem'|'ignore', finish?|gemPreset?, color?, roughness?, ior?, aberration?, fresnel?, facetBlend?, colorMode?, density?, velvet?, opacity?, lengthMm?, widthMm?, depthMm?, carat?, cut? }`.
Gem slots may carry additive geometry fields (`lengthMm`/`widthMm`/`depthMm?`/`carat`/`cut`) stamped by
`Studio`/`ConfiguratorSetup`; viewers ignore unknown keys. Measure a loaded scene yourself with
`measureGems(scene, meshMap)` (unit auto-detected).
`controls: 'orbit'` (default turntable) `| 'arcball'` (free tumble incl. roll — reach any angle).

### AI "Generate render" (optional)

Pass `<JewelryViewer onRender={…}>` and the viewer shows a **Generate render** button, a scene
picker and a **⟲ free-rotate** toggle; the result opens in a modal with **Download** (and, with
`onSaveRender`, **Save as product image**). Your handler receives
`{ image, prompt, materials, scene, context, config }` and calls your image model **server-side** —
the key never touches the client. Easiest path: the packaged helper in a ~5-line route.

```js
// app/api/refrakt-render/route.js  (server)
import { generateRender } from '@crittercodes/refrakt/server';
export async function POST(req) {
  const { image, prompt, materials, scene, context } = await req.json();
  const { url } = await generateRender({ apiKey: process.env.GEMINI_API_KEY, image, prompt, materials, scene, context });
  return Response.json({ url });
}
```

`RENDER_SCENES` (the scene vocabulary) is exported from the package root and `/server`. See
[docs/INTEGRATION_GUIDE.md](../../docs/INTEGRATION_GUIDE.md) §4a.

The barrel also exposes the engine pieces for custom scenes — including the **shared material
resolvers** (the single source of truth used by every viewer):

```js
import {
  GEM_CONFIGS, GOLD_MAT, buildFrag, makeMat, syncBVH, Lights,
  resolveGemCfg, makeMetalMat, METAL_DEFAULTS, gemEff, metalEff,
} from '@crittercodes/refrakt';
```

### Material vocabulary (don't hardcode it)

The list of metals/gems an app may offer or store is **owned by the package** — import it
instead of re-declaring your own `METAL_FINISHES`/`GEM_PRESETS` (which must match the engine
exactly or saves 400 and pickers drift):

```js
import {
  METALS, GEMS, MATERIAL_LIBRARY,     // curated picker lists: { id, label, kind, finishWord, swatch }
  METAL_LABEL, GEM_LABEL,             // id → display label
  isFinish, isGemPreset, validateMeshMap, // validate a config against the engine vocab
} from '@crittercodes/refrakt';
```

`METALS`/`GEMS` are the **offered** options (display order + labels + a flat swatch colour for
non-3D chips). `validateMeshMap`/`isGemPreset` check against the **valid** engine vocab, which is
a superset (e.g. `marquise` is a valid gem the engine renders but isn't offered as a pick — it's a
cut), so a legacy/valid config never gets rejected.

### Bring-your-own materials (per shop)

Those exports are the **baseline**. A shop can extend it at runtime: fetch its own materials from
its DB and pass them to `<Studio materials={…}>` / `<JewelryViewer materials={…}>`. The package
**merges** them over the baseline (new `id` adds, same `id` overrides), so they appear in the
picker and render — and the package never touches a DB (the app owns the fetch). A material is one
**descriptor**: `{ id, kind:'gem'|'metal', label, params:{…}, offered?, finishWord?, swatch? }`.
Validate before storing with `validateMaterial`; build a registry for server-side validation with
`createRegistry`. Full design in [`docs/MATERIAL_REGISTRY_SPEC.md`](../../docs/MATERIAL_REGISTRY_SPEC.md).

## Releasing

Use the repo skills, not ad-hoc npm: **publish-refrakt** (bump + publish to GitHub Packages)
then **bump-refrakt-consumers** (roll into efd-shop / efd-admin). Record every version in
[`CHANGELOG.md`](./CHANGELOG.md) and update the affected docs (see the repo `CLAUDE.md`).
