# Production Pipeline & Peer-Jobs Ecosystem — State, Tools, and Vision

> **Canonical orientation doc.** Read this BEFORE any production-pipeline / customs / deploy work.
> Pairs with: `docs/manufacturing/{README.md, data-model.md, sprints.md}` (sprint detail + locked
> decisions), `docs/CAD_REQUEST_REIMAGINING.md` (the design-request spec). Last updated 2026-06-30.

---

## 1. The vision (owner's mental model)

A single manufacturing engine serving **two front doors** that feed **one shared CAD work order**
and exit to **two destinations**:

```
   ORIGIN (the "why")                 SHARED CORE                       EXIT (where it goes)
 ┌─────────────────────────────┐                                  ┌─────────────────────────────┐
 │ CUSTOM ORDER                │──┐                            ┌──│ the client's bespoke piece  │
 │  • client-initiated         │  │     CAD work order        │   │  (fulfilled to that client) │
 │  • SALE COMMITMENT (deposit │  │   discipline:'cad'        │   └─────────────────────────────┘
 │    before production)       │  ├──▶ STL→GLB · bench claim ─┤
 ├─────────────────────────────┤  │   · GLB QC → auto-share   │   ┌─────────────────────────────┐
 │ DESIGN REQUEST (production) │──┘   · refrakt material      └──▶│ store PRODUCT, gemstone-    │
 │  • peer-initiated (gem      │      · labor credited at QC      │ linked (or back to cutter)  │
 │    cutter / designer)       │                                  │ — or a "listed-only" design │
 │  • NO sale commitment       │                                  │   concept linked to a stone │
 └─────────────────────────────┘                                  └─────────────────────────────┘
```

**The CAD work order is identical in both.** Only the *origin doc* (custom order vs. design request)
and the *exit* (client piece vs. catalog product) differ. "cad wo really are the same wo whether it's
a custom or a production pipeline."

### The peer-jobs ecosystem (the flywheel)
The people: **gem cutters**, **designers**, **bench jewelers** — peers who request and fulfill each
other's work. The flow:

1. A **gem cutter lists a stone** → it becomes a gemstone **Product** in the store (the hub).
2. From a listed stone, anyone can **request a piece be made** (a *Design Request*) **or** a
   **designer submits a design** for it.
3. A design can be **produced** (→ Piece → Product) **or** just **listed** as a concept linked to
   that stone (no production yet — a "design-on-a-stone" listing).
4. Produced pieces become catalog **Products**; the **gemstone stays linked** through the whole chain.

The **gemstone is the hub**; design-requests, submitted designs, and produced pieces all orbit it.
Custom orders are the *committed* path (a client paid to have something made); design requests are
the *speculative* path (peers making things for the catalog).

> **Open vision points to refine with the owner** (not yet modeled in code):
> - **Designer-submits-a-design** entry — currently only "request a piece" (design request) exists.
> - **"Listed-only" design concept** — `list-product` today requires a finished Piece; there's no
>   path to list a design *concept* against a stone without producing it.
> - **Gemstone link on the product** — `buildProductFromPiece` keeps `references.{designId,pieceID}`
>   but drops the originating `gemstoneId`. The flywheel needs that link preserved end-to-end.
> - **Cutter ownership / "back to the cutter"** exit — no ownership/return model yet.
> - **Multi-item** custom orders (modeled in data-model.md, not built).

---

## 2. Current state of the build

- **Branch model:** `chore/react-19-upgrade` (HEAD, the working branch) = `feat/manufacturing-
  production-cycle` + React 19 + recent work. **141 commits ahead of `main`.** `feat/…` is kept
  fast-forwarded to HEAD. **`main` is FROZEN** and runs the *legacy* pre-rebuild code.
- **3-database model** (same self-hosted Mongo, logical isolation):
  - `efd-database` — **PROD**. Still the OLD collections (`customTickets`, `repairLaborLogs`,
    `repairPayrollBatches`, `inventory*`). Never targeted except at cutover.
  - `efd-database-DEV` — **canonical dev**, where the rebuild runs. Has the renamed/new collections.
  - `efd-db-migrate` — staging clone of prod to rehearse migrations (created at cutover, not yet).
- **Collection renames** baked into the branch (S0): `repairLaborLogs→laborLogs`,
  `repairPayrollBatches→payrollBatches`, plus new `workOrders, drops, designs, pieces, customOrders,
  customInvoices`. **This is why the branch is DEV-only** — its code reads the new names, which don't
  exist in prod.
- **Backends S0–S7: COMPLETE + verified** (build/lint/unit/e2e on DEV). Customs (S7) is fully built
  **including its UI** and is the most production-ready slice.
- **UI phase:** U1 (unified bench `/dashboard/bench`) done + browser-verified. U2–U6 pending.
- **Recent work (this branch):** bench per-task handoff + admin-on-behalf + labor-at-QC; quote→WO
  sync; tech-debt (dep prune, `@/lib/mongodb`→`@/lib/database` unify, lazy-db proxy, **S3→MinIO image
  scrub**); **legacy cad-request skeleton removed** (commit `0473265`).
- **Prod cutover: NOT done.** Documented plan: clone prod→`efd-db-migrate`, run all sprint migrations
  there, rehearse, then run on prod (with mongodump backup), deploy branch in lockstep.

---

## 3. Tools / APIs built — wired vs. unused

### Wired & in use (admin UI calls them today, on DEV)
- **Repairs + unified bench:** `/api/repairs/*`, `/api/bench/my-bench`, `/api/bench/work-orders/[id]/[action]`
- **Customs (S7, full system):** `/api/custom-orders/**` — order CRUD, quote, invoices+checkout,
  payment-progress, assignments, production, work-orders, casting, notes, communications,
  images, design-model, share, task-suggestions. UI: `/dashboard/customs` (list + detail).
- **Products (editors):** `/api/products/jewelry`, `/api/products/gemstones` (+`/[id]`), upload,
  awaiting-approval, status. UI: `/dashboard/products/{jewelry,gemstones}`.
- **Design configurator:** `/api/designs/[designId]` (GET/DELETE) + `/configure` (GET/POST).
- **Sales / payroll / settings / users / affiliates / analytics** — live.

### Built but UNUSED — no UI yet (the "build UI for these" list)
**U2.1 — Design Request (speculative peer front door):**
- `GET /api/design-requests` — list (joins gemstone + design)
- `POST /api/design-requests` — create ⚠️ **BROKEN** (`getServerSession` not imported)
- `POST /api/design-requests/[requestId]/claim`
- `POST /api/design-requests/[requestId]/complete` — only flips a flag; does **not** spawn production
- *UI today: `/dashboard/design-requests` is a stub shell that calls nothing
  (`useDesignRequests` = no-op stubs).*

**U2.2 — Production catalog (engine built, zero screens):**
- Drops: `GET·POST /api/production/drops` · `GET·PUT …/[dropID]`
- Designs: `GET·POST /api/production/designs` · `GET·PUT …/[designID]` ·
  `POST …/[designID]/assets` (CAD/GLB upload→MinIO) · `POST /api/production/designs/estimate` (cost engine)
- Pieces: `GET·POST /api/production/pieces` · `GET·PUT …/[pieceID]` · `POST …/materials` ·
  `POST …/recompute` · `POST …/[pieceID]/list-product` (piece → store product)
- Services behind them: `designCost.js` (estCost), `pieceCost.js` (COGS), `pieceRouting.js`
  (`createPieceFromDesign` → spawns one WO per routing step), `productContract.js`
  (`buildProductFromPiece` + `validateProductContract`).

**U5 — Collections / marketplace grouping:**
- `GET·PUT·DELETE /api/collections/[id]` · `GET·POST·DELETE …/[id]/products` · `POST …/[id]/publish`
- *No dashboard collections page exists.*

### The two backend stitches still missing for the flywheel
1. **Request → production bridge:** `design-requests/complete` should spawn a production Design/Piece
   (reuse `createPieceFromDesign`) instead of only setting a flag.
2. **Gemstone link preserved:** carry `gemstoneId` through `buildProductFromPiece` →
   `product.references.gemstoneId` so store products stay stone-linked.

---

## 4. UI roadmap (maps unused APIs → screens)

| Phase | Screen(s) | Wires these APIs |
|---|---|---|
| **U2.1** | Design Request inbox/board (fill the stub) | `design-requests` (+fix create, +bridge to production) |
| **U2.2** | Production catalog: Drops / Designs (STL upload + live cost) / Pieces editors | all `/api/production/*` |
| **U3** | Shared **meshMap builder** (GLB→`/api/glb/inspect`→assign meshes) | reused by U4 + customs 3D |
| **U4** | Product editor → contract shape + publish gate | `products/*` + `validateProductContract` |
| **U5** | Marketplace admin: collections, fee-schedule, cutter ownership/listing | `collections/*` + S6 payouts |
| **U6** | Polish: billing-mode selector, all-lanes shop board, customs design-model/share | — |

Recommended order U2→U6. U2 (design-request + production catalog) is the direct realization of the
reimagined "CAD request" on the existing production spine.

---

## 5. Hard rules (do not forget)

- **`main` is FROZEN.** No merge/deploy to `main` until the rebuild ships **OR** a deliberate,
  rehearsed prod cutover is performed. A naive merge breaks prod (collection renames hit live repairs).
- **The branch is DEV-only.** It expects renamed/new collections that exist only in `efd-database-DEV`.
- **Prod cutover is a sequence, never a quick merge:** clone prod→`efd-db-migrate` → run all sprint
  migrations there → rehearse → mongodump backup → run on prod → deploy branch in lockstep.
- **No-regression parity:** rebuilds must match-or-beat the legacy form+function.
- Keep `feat/manufacturing-production-cycle` fast-forwarded to the working branch after each commit.
