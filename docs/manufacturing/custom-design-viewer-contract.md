# Custom-Design 3D Viewer & Share Links — efd-admin Contract

> **Authoritative, owned by the storefront team.** The customs analog of the product-page contract.
> Lets admin (1) attach a 3D model to a customer's custom-design ticket (renders in their client
> portal) and (2) mint a public, login-free share link to text the client. Replaces the legacy
> Shapr3D external link (`designLink`). The model shape is **identical to a product's `viewer`** —
> see [product-page-data-contract.md](./product-page-data-contract.md) for the shared `meshMap` rules
> and the `POST /api/glb/inspect` endpoint. This is S7 scope (Customs).

---

## 1. Where the data lives

- Collection: **`customTickets`** (shared), managed by `CustomTicketService`, keyed by `ticketID`.
- **All writes go through `POST /api/custom-designs/tickets` with an `action` (§4) — do NOT write the
  collection directly.** efd-admin calls these actions.
- Two storefront-hosted surfaces consume it: client portal `/custom-work/portal` (3D Design tab) and
  the standalone public share page `/d/<token>`. Admin builds neither — it only writes via the actions.

## 2. Ticket fields

```jsonc
{
  "ticketID": "TCK-10234",
  "designLink": "https://shapr3d…",   // LEGACY — shown only if designModel absent (transition)

  "designModel": {                      // NEW — same shape as a product's viewer
    "glbUrl": "https://efd-repair-images.s3.us-east-2.amazonaws.com/customs/TCK-10234/design.glb", // REQUIRED
    "meshMap": [ /* REQUIRED — §3 */ ],
    "environment": "city",              // optional HDRI (default "city")
    "orientation": [0, 0, 0],           // optional euler radians; only if not exported upright
    "background": "#080808"             // optional
    // NO scale/camera — viewer auto-fits (centers, scales, frames)
  },

  "shareTitle": "Sarah's Engagement Ring",   // non-PII title shown under the model on both surfaces
  "share": { "token": "a1b2c3…", "enabled": true, "createdAt": "2026-06-15T…Z" }  // set by the API (§4)
}
```

## 3. `meshMap` — identical rules to products

`nameContains` = case-insensitive substring match vs the GLB's **node names**; first matching slot wins
(`"Diamond"` covers `Diamond_00…11`).

- `type:"metal"` → `finish`: `gold | satin | whiteGold | roseGold | platinum | silver`
- `type:"gem"` → `gemPreset`: `diamond | amethyst | ruby | sapphire | emerald | marquise | moissanite`
  (or custom `{ ior, color:[r,g,b], aberration, fresnel, facetBlend, colorMode }`)
- `type:"ignore"` → hides the mesh
- Unmapped meshes keep their GLB material. **Gems must be mapped** or they render flat.

Get node names from the shared `POST /api/glb/inspect { glbUrl }` → `{ meshNodeNames, materials,
suggestedMeshMap }`. Match against `meshNodeNames`; present `suggestedMeshMap` pre-filled, let the user
edit/collapse.

## 4. API actions — `POST /api/custom-designs/tickets`

All take `ticketID`; responses `{ success, ticket, … }`.

- **Attach/update model:** `{ action:"updateDesignModel", ticketID, designModel:{ glbUrl, meshMap, … } }`
  — requires `designModel.glbUrl`. Client portal swaps from the Shapr3D button to the embedded viewer.
- **Mint share link:** `{ action:"createShareLink", ticketID, shareTitle? }` →
  `{ success, token, url:"https://<site>/d/<token>", ticket }`. Set the model first (the share page
  404s until `designModel.glbUrl` exists). Copy `url`, text it to the client.
- **Revoke / re-enable:** `{ action:"setShareEnabled", ticketID, enabled:false|true }`. `false` → the
  public link immediately 404s; `true` re-enables the same token.
- **Set shareTitle independently:** `PUT /api/custom-designs/tickets { ticketID, updateData:{ shareTitle } }`.

## 5. Share page `/d/<token>` (storefront-hosted)

Public, no auth, full-screen viewer + EFD wordmark + `shareTitle`; `noindex`, marketing banner
suppressed. Looks up by `share.token` with `share.enabled:true`; reads **only** `designModel` +
`shareTitle` — no client identity, pricing, or messages exposed (safe if forwarded). Admin only
mints/revokes the token.

## 6. Storage + CORS (required)

Upload custom `.glb` to `efd-repair-images.s3.us-east-2.amazonaws.com` (allowlisted by `/api/glb/inspect`);
store URL in `designModel.glbUrl`. Bucket **must return CORS** for the storefront origin(s) (`GET`/`HEAD`)
or the viewer blanks silently.

## 7. Admin workflow

1. Upload client `.glb` → S3 URL.
2. `POST /api/glb/inspect { glbUrl }` → mapping UI from `meshNodeNames` + `suggestedMeshMap`.
3. User assigns each mesh (Metal+finish / Gem+preset / Ignore) → `meshMap`.
4. `updateDesignModel { ticketID, designModel:{ glbUrl, meshMap, … } }` → client portal shows viewer.
5. (optional) `createShareLink { ticketID, shareTitle }` → copy `url` → text client.
6. `setShareEnabled { enabled:false }` to revoke at project close.

## 8. Validation checklist (enforce in admin)

- [ ] `designModel.glbUrl` reachable on the allowlisted S3 bucket
- [ ] `designModel.meshMap` non-empty; every gem/metal slot has a valid `finish`/`gemPreset`
- [ ] every gem mesh covered by a `gem` slot (warn otherwise)
- [ ] `shareTitle` (if set) has **no PII** — it's on a public link; use a piece name
- [ ] never surface `share.token` publicly except in the `/d/<token>` URL
- [ ] provide a visible "Revoke link" control wired to `setShareEnabled:false`
