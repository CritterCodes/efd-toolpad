# Product Page Data Contract (efd-shop)

> **Authoritative, owned by the storefront team.** efd-admin and efd-shop **share the MongoDB
> `products` collection** — the storefront reads each product document **directly** (no API in
> between). Therefore this contract *is* the Product schema: the admin product editor (S5) must write
> documents in exactly this shape. Field names and casing are normative (e.g. `productId`, not
> `productID`).
>
> **Production revision 2026-07-14:** jewelry Products project one Design and its Variants/offers.
> `concept` is removed. See [catalog-domain.md](./catalog-domain.md).

---

## 1. Visibility

A product is shown only if **either** `status === "published"` **or** `isPublic === true`.
Anything else is `404`. `internalNotes` and `pricing.costBasis` are stripped server-side and never
exposed. The URL handle is `productId` (or Mongo `_id`): `/products/<productId>`.

## 2. Document schema

```jsonc
{
  "productId": "efd-amethyst-ring-001",   // string, REQUIRED — URL handle
  "status": "published",                   // "published" | other; or use isPublic
  "isPublic": true,                         // alternative to status

  "title": "Amethyst Solitaire",            // REQUIRED
  "vendor": "Engel Fine Design",            // optional
  "description": "…",                       // optional (plain text)

  "pricing": {
    "retailPrice": 1850,                    // number USD. Fallback: top-level "price"
    "compareAtPrice": 2100                  // optional (strikethrough)
  },
  "price": 1850,                            // optional fallback if pricing.retailPrice absent

  "availability": "ready-to-ship",          // optional derived summary for legacy shop surfaces

  "jewelry": {                              // all optional (Details panel)
    "type": "ring",
    "metals": [ { "type": "gold", "purity": "18k", "color": "yellow" } ],
    "ringSize": "7",
    "weight": 4.2,                          // grams
    "dimensions": "…",
    "production": { "estimatedLeadTimeDays": 21 }
  },

  "productType": "jewelry",                 // "gemstone" | "jewelry"; absent -> jewelry
  "designId": "design-amethyst-ring",
  "defaultVariantId": "amethyst-18k-yellow-7",
  "edition": { "type": "limited", "limit": 10, "allocated": 7, "remaining": 3 },
  "variants": [
    {
      "variantId": "amethyst-18k-yellow-7",
      "sku": "AM-RING-18Y-7",
      "label": "18k Yellow Gold / Size 7",
      "active": true,
      "options": { "metal": "gold", "karat": "18k", "finish": "yellow" },
      "ringSize": "7",
      "sizingAllowance": { "min": "6", "max": "8" },
      "pricing": { "retailPrice": 1850 },
      "offers": {
        "readyToShip": { "quantity": 1, "pieceIDs": ["piece-amethyst-007"] },
        "madeToOrder": { "enabled": true, "leadTimeDays": 21, "customizerEnabled": true }
      },
      "viewer": { /* base GLB/meshMap; customizable blocks constrain Refrakt choices */ }
    }
  ],
  "references": { "gemstoneId": "efd-sapphire-loose-014" },

  "images": [ "https://efd-repair-images.s3.us-east-2.amazonaws.com/products/efd-001/a.jpg" ],

  "viewer": { /* §4 — present ONLY if the product has a 3D model */ }
}
```

## 2.1 Design, Variants, offers, edition, and gemstone link

- **`productType`** — `"gemstone" | "jewelry"`; never `"concept"`. A jewelry Design with no available
  Piece is represented by a made-to-order offer.
- **`designId`** — required for Design-backed jewelry Products.
- **`defaultVariantId`** — required when a jewelry Product has multiple active Variants; drives initial
  selection and all top-level compatibility summaries.
- **`variants[]`** — concrete active base SKUs/configurations. Every sellable Design has at least one.
- **Ring size** — one nominal `ringSize` per Variant. `sizingAllowance.min/max` describes safe resizing;
  an outside request is a special order requiring a new Piece/production review. Omit for non-rings.
- **`offers.readyToShip`** — derived only from matching Pieces whose status is `available`. Other Piece
  states never count.
- **`offers.madeToOrder`** — enabled while Design-wide edition capacity remains and production gates pass.
  Refrakt/customizer selections always use this path.
- **`edition`** — `{ type: "one_of_one" | "limited" | "unlimited", limit?, allocated, remaining? }`,
  projected from Design and shared across every Variant/custom configuration. Allocation occurs atomically
  when physical production begins.
- **`references.gemstoneId`** — optional originating gemstone Product cross-link.

The same Variant/Product page may expose an exact ready-to-ship Piece and a separate customize/
made-to-order path. A Refrakt selection is stored as an immutable order/Piece snapshot and does not
automatically become another permanent Variant.

Top-level `price`, `availability`, `jewelry.ringSize`, and `viewer` are derived compatibility summaries
for existing storefront surfaces. For Design-backed jewelry, the primary/default Variant is their source;
admin editors must not persist conflicting values in those fields.

## 3. The three media cases (unified `ProductMedia` stage)

| Case | Populate |
|------|----------|
| **Photos only** | `images[]`; omit `viewer` |
| **3D only** | `viewer` (with `glbUrl` + `meshMap`); `images` empty |
| **Both** (typical) | both — 3D is the default tile, photos are thumbnails that swap the stage |

No flags needed; layout is inferred from which fields are present.

## 4. The `viewer` object (REFRAKT 3D viewer)

```jsonc
"viewer": {
  "glbUrl": "https://…/efd_amethyst_ring.glb",   // REQUIRED
  "meshMap": [ /* §5 — REQUIRED, built in admin */ ],
  "environment": "city",      // optional HDRI: city|studio|sunset|dawn|forest|night|park|warehouse
  "background": "#080808",    // optional, default "#080808"
  // Optional overrides — usually OMIT (viewer auto-fits):
  "orientation": [1.57, 0, 0],   // [x,y,z] euler RADIANS, only if model not exported upright
  "scale": 50,                   // override auto-scale
  "camera": { "position": [0,0.05,2.8], "fov": 36 },  // override auto-framing
  "autoRotate": true,            // default true
  "autoRotateSpeed": 1.2,        // default 1.2
  "enableZoom": true             // default true
}
```

**Auto-fit:** the viewer measures the model bounding box and auto-normalizes size, frames the camera,
and pivots the turntable on center — so `scale`/`camera`/rotation are normally unnecessary.
**Orientation caveat:** auto-fit doesn't fix "which way is up." Most CAD/Blender exports are upright;
for one that isn't, set `viewer.orientation` (e.g. legacy `efd_ring.glb` needs `[1.5708 - 0.765, 0, 0]`).

## 5. `meshMap` — assigning materials to meshes (built by the admin UI)

```jsonc
"meshMap": [
  { "nameContains": "Ring_Mounting", "type": "metal", "finish": "gold" },
  { "nameContains": "Gem_Amethyst",  "type": "gem",   "gemPreset": "amethyst" },
  { "nameContains": "Diamond",       "type": "gem",   "gemPreset": "diamond" }
]
```

**Matching:** `nameContains` is a **case-insensitive substring** match against the GLB's **node names**;
**first matching slot wins**. One rule can cover many meshes (`"Diamond"` → `Diamond_00…Diamond_11`).
Order most-specific → least-specific.

| `type` | Extra field | Notes |
|--------|-------------|-------|
| `"metal"` | `finish` | `gold` \| `satin` \| `whiteGold` \| `roseGold` \| `platinum` \| `silver` |
| `"gem"` | `gemPreset` | `diamond` \| `amethyst` \| `ruby` \| `sapphire` \| `emerald` \| `marquise` \| `moissanite` |
| `"gem"` (custom) | `ior`, `color:[r,g,b]`, `aberration`, `fresnel`, `facetBlend`, `colorMode` | one-off stone instead of `gemPreset` |
| `"ignore"` | — | hides the mesh |

Unmatched meshes keep their original GLB material (fine for non-gem/non-metal parts). **Gems must be
mapped to `type:"gem"`** or they won't get the refraction shader (look dull/flat).

## 6. Admin workflow + GLB inspect endpoint (lives in efd-shop)

**`POST /api/glb/inspect`** (storefront-hosted; SSRF-guarded — absolute URLs must be the S3 asset
bucket or same-origin). Request `{ "glbUrl": "https://…/model.glb" }`. Response includes
`meshNodeNames`, `meshNames`, `materials`, and a heuristic `suggestedMeshMap`.

**Match `meshMap.nameContains` against `meshNodeNames`** (not `meshNames`/`materials`).

Steps: (1) upload `.glb` to S3, store URL → (2) `POST /api/glb/inspect`, render mapping UI from
`meshNodeNames` pre-filled with `suggestedMeshMap` → (3) user assigns Metal+finish / Gem+preset / Ignore
(collapse substrings, e.g. one `Diamond` rule) → (4) save `viewer.glbUrl` + `viewer.meshMap`
(+ optional `environment`/`orientation`) onto the product.

## 7. Storage + CORS (required)

Host `.glb` + images on `efd-repair-images.s3.us-east-2.amazonaws.com` (allowlisted for
`/api/glb/inspect` + Next image domains). The bucket **must return CORS headers allowing the storefront
origin** (`Access-Control-Allow-Origin` + `GET`/`HEAD`) — the viewer fetches the GLB cross-origin; without
it the viewer fails silently (blank).

## 8. Validation checklist (enforce in admin before publish)

- [ ] `productId` present, URL-safe, unique
- [ ] `title` present
- [ ] `pricing.retailPrice` (or `price`) is a number
- [ ] jewelry Product has `designId` and at least one active Variant
- [ ] `defaultVariantId` resolves to an active Variant (required when more than one is active)
- [ ] each Variant has stable `variantId`, SKU, options, and numeric retail price
- [ ] ring Variant has one nominal size; sizing allowance (if any) has ordered min/max
- [ ] ready-to-ship Piece IDs resolve to matching `status: available` Pieces
- [ ] made-to-order is disabled when edition capacity is exhausted
- [ ] if `viewer` present: `glbUrl` reachable **and** `meshMap` non-empty
- [ ] every `meshMap` slot has a valid `finish`/`gemPreset` (§5)
- [ ] every gem mesh in the GLB covered by a `gem` slot (warn otherwise)
- [ ] `images[]` reachable
- [ ] at least one of `viewer` / `images` present
- [ ] `productType` is `gemstone` \| `jewelry` (absent → `jewelry`)
- [ ] limited edition has positive `limit`; `allocated`/`remaining` agree with Design-wide accounting

## 9. Examples

**Photos only:**
```jsonc
{ "productId": "efd-pendant-007", "status": "published", "title": "Garnet Pendant",
  "productType": "jewelry", "designId": "design-pendant-007",
  "edition": { "type": "one_of_one", "allocated": 1, "remaining": 0 },
  "variants": [{ "variantId": "pendant-14y", "sku": "PEND-007-14Y", "active": true,
    "options": { "metal": "gold", "karat": "14k", "finish": "yellow" },
    "pricing": { "retailPrice": 640 },
    "offers": { "readyToShip": { "quantity": 1, "pieceIDs": ["piece-pendant-007"] } } }],
  "images": ["https://…/p1.jpg", "https://…/p2.jpg"] }
```
**3D only:**
```jsonc
{ "productId": "efd-solitaire-002", "status": "published", "title": "Diamond Solitaire",
  "productType": "jewelry", "designId": "design-solitaire-002",
  "edition": { "type": "unlimited", "allocated": 0 },
  "variants": [{ "variantId": "solitaire-14w-7", "sku": "SOL-002-14W-7", "active": true,
    "options": { "metal": "gold", "karat": "14k", "finish": "white" }, "ringSize": "7",
    "sizingAllowance": { "min": "5", "max": "9" }, "pricing": { "retailPrice": 4200 },
    "offers": { "madeToOrder": { "enabled": true, "leadTimeDays": 28, "customizerEnabled": true } },
    "viewer": { "glbUrl": "https://…/efd_final_ring.glb",
      "meshMap": [ { "nameContains": "Mesh_0", "type": "metal", "finish": "whiteGold" },
                   { "nameContains": "Gem_CenterStone", "type": "gem", "gemPreset": "diamond" } ] } }] }
```
**Both (typical):**
```jsonc
{ "productId": "efd-amethyst-ring-001", "status": "published", "title": "Amethyst Solitaire",
  "vendor": "Engel Fine Design", "productType": "jewelry", "designId": "design-amethyst-ring",
  "edition": { "type": "limited", "limit": 10, "allocated": 1, "remaining": 9 },
  "images": ["https://…/a.jpg", "https://…/b.jpg"],
  "variants": [{ "variantId": "amethyst-18y-7", "sku": "AM-001-18Y-7", "active": true,
    "options": { "metal": "gold", "karat": "18k", "finish": "yellow" }, "ringSize": "7",
    "sizingAllowance": { "min": "6", "max": "8" }, "pricing": { "retailPrice": 1850 },
    "offers": { "readyToShip": { "quantity": 1, "pieceIDs": ["piece-amethyst-001"] },
                "madeToOrder": { "enabled": true, "leadTimeDays": 21, "customizerEnabled": true } },
    "viewer": { "glbUrl": "https://…/efd_ring.glb", "environment": "city",
      "meshMap": [ { "nameContains": "Ring_Mounting", "type": "metal", "finish": "gold" },
                   { "nameContains": "Gem_Amethyst", "type": "gem", "gemPreset": "amethyst" },
                   { "nameContains": "Diamond", "type": "gem", "gemPreset": "diamond" } ] } }] }
```
