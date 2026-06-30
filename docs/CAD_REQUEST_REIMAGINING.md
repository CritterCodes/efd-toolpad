# Production pipeline & the "Design Request" — reimagining the legacy CAD-request (#35)

The legacy CAD-request was **v1 of the gemstone production pipeline**, built by embedding everything
in `products.cadRequests[]` *before* the modern manufacturing spine (`/api/production/*`) existed.
There is **no `cadRequests[]` data** (0 docs) and the feature is a half-disabled skeleton, so we
remove it and rebuild the *intent* on the modern spine. This doc is the spec.

## The two origins, one shared core, two exits

| | **Custom order** | **Production / Design Request** (reimagined CAD-request) |
|---|---|---|
| Driven by | **Client** | **Peer** — gem cutter or designer |
| Sale commitment | **Yes** (deposit before production) | **No** — speculative |
| Exit | the client's bespoke **piece** | a **Product in the store**, gemstone-linked (or back to the cutter) |

**The CAD work order is the same primitive in both.** A custom order and a production design-request
both spawn the identical `discipline:'cad'` work order (STL→GLB stages, bench claim, GLB QC →
auto-share, refrakt `<Studio>` material assignment, labor credited at QC — all built/hardened this
session). Only the **origin doc** and the **exit** differ:

```
   ORIGIN                         SHARED CORE                         EXIT
 Custom order ───┐                                          ┌──▶ client piece (fulfilled)
                 ├──▶  CAD work order (bench) ──▶ Design ────┤
 Design request ─┘     STL→GLB · QC · auto-share · labor     └──▶ store Product (gemstone-linked)
                                                                  or "listed-only" design concept
```

## North star — the gem-cutter flywheel
A gem cutter **lists a stone** → it's a gemstone Product in the store → from it, anyone can
**request a piece be made** (Design Request) **or** a designer can **submit a design**. A design can
be **produced** (→ Piece → Product) or just **listed** as a concept linked to that stone. The
**gemstone is the hub**; design-requests, submitted designs, and produced pieces all orbit it.

## What's already built (backend) vs. on the UI slate
The manufacturing spine exists as APIs; the UI is the deferred work:
- **`/api/production/*` (11, no UI):** `designs` (+`/assets`, `/estimate`), `pieces` (+`/materials`,
  `/recompute`, **`/list-product`** = piece→store product), `drops`. → this is **U2**.
- **`/api/design-requests/*`** (claim/complete) + a partial `design-requests` page — the speculative
  entry seed.
- **`/api/products/*` (18)** + product/gemstone/jewelry pages — product mgmt exists; the
  contract-aligned editor + publish gate is **U4**; marketplace controls are **U5**.
- The Work-Order spine + Drop/Design/Piece model is the backbone (see manufacturing/data-model.md).

**So #35's reimagining IS the U2 production-catalog build:** Design Request → shared CAD work order
→ Design → `list-product` (concept listing) or produce → Piece → Product, with the gemstone as hub.

## DONE: legacy skeleton removed (no data at risk)
**Deleted** (all confirmed dead — the only external caller of the legacy `/api/designs/create`
was the deleted cad-request hook; the modern bench/production CAD pipeline in
`pieceWorkOrderActions`/`benchActions`/`customProduction` is self-contained):
- `api/cad-requests/**` (10 routes)
- `api/designs/{create,upload,[designId]/approve,[designId]/decline}` route handlers (the legacy
  designs flow built on embedded `gemstone.cadRequests[]`)
- `dashboard/cad-requests/**`, `dashboard/requests/**`
- `dashboard/products/cad-design/**` + `hooks/products/useCadDesign` (a *cad-request* list viewer
  mislabeled as a product page — fetched `/cad-requests`)
- `api/products/cad-designs/**` (productType `cad-design` CRUD — zero callers; the page never used it)
- `components/cad-requests/**`; hooks `cad-requests/useCadRequests`, `requests/useCadRequests`,
  `requests/useCADRequest`; `products/jewelry/[id]/components/JewelryCadRequests.js`

**Cleaned:** NotificationBell `cad_` fallback (target was deleted); jewelry editor page + its hook
(`useJewelryEditor` cad-request state/handlers); `cadRequests[]`/`references.cadRequestId` seeds in
`products/{route,gemstones,jewelry}`; the "CAD Designs" card on the products hub.

**Kept (modern):** `api/designs/{model,[designId],[designId]/configure}`; the whole
`api/production/*` + `design-requests` + `useDesignRequests` flow; the `cad_request` WO-source enum
(`api/workOrders/model.js`) and the `CAD_*` notification-type constants (forward vocab for the
reimagined pipeline — currently orphaned but harmless).

Verified: whole-`src` dangling-import grep clean; `next lint` on edited files green. Full
`next build` deferred (dev server holding `.next`).

## Later (U2): build the reimagined Design Request
Thin entry doc (peer, no commitment) → spawns the shared CAD work order on the bench (reuse
`pieceWorkOrderActions` + `submitCadGlbToQc`/`approveCadQc` + auto-share) → on GLB approval, a Design
that either lists against the gemstone or produces a Piece (`/api/production/pieces`) → `list-product`
publishes the catalog Product. Proper owner/role auth; one screen in nav; gemstone-as-hub linking (U5).
