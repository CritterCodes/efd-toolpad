# Production Pipeline & Peer-Jobs Ecosystem — State, Tools, and Vision

> **Canonical orientation doc.** Read this BEFORE any production-pipeline / customs / deploy work.
> Pairs with: `docs/manufacturing/{README.md, data-model.md, sprints.md}` (sprint detail + locked
> decisions). Last updated 2026-06-30.

---

## 1. The vision (owner's mental model)

The manufacturing engine serves **Custom Orders** as its committed front door, producing Pieces that
exit to the client or to the store catalog:

```
   ORIGIN (the "why")                 SHARED CORE                       EXIT (where it goes)
 ┌─────────────────────────────┐                                  ┌─────────────────────────────┐
 │ CUSTOM ORDER                │                               ┌──│ the client's bespoke piece  │
 │  • client-initiated         │      CAD work order           │   │  (fulfilled to that client) │
 │  • SALE COMMITMENT (deposit │    discipline:'cad'           │   └─────────────────────────────┘
 │    before production)       │──▶ STL→GLB · bench claim ────┤
 └─────────────────────────────┘    · GLB QC → auto-share      │   ┌─────────────────────────────┐
                                    · refrakt material         └──▶│ store PRODUCT, gemstone-    │
                                    · labor credited at QC         │ linked                      │
                                                                   └─────────────────────────────┘
```

> **Note:** the peer/speculative path (Design Request — gem-cutter-initiated, no sale commitment)
> was determined to be a platform-level concept, not EFD-internal. Its produce shape is preserved
> in `docs/platform/peer-request-produce.md` for reuse when the umbrella platform ships a job board.
> Design 6a501ae5 / task #24.

### The gemstone flywheel (production catalog)
The people: **gem cutters**, **designers**, **bench jewelers** — peers who create and fulfill work.
The EFD loop:

1. A **gem cutter lists a stone** → it becomes a gemstone **Product** in the store (the hub).
2. A **designer submits a design** against the stone.
3. A design can be **produced** (→ Piece → Product) **or** just **listed** as a concept linked to
   that stone (no production yet — a "design-on-a-stone" listing).
4. Produced pieces become catalog **Products**; the **gemstone stays linked** through the whole chain.

The **gemstone is the hub**; submitted designs and produced pieces orbit it.
Custom orders are the *committed* path (a client paid to have something made).

> **Open vision points to refine with the owner** (not yet modeled in code):
> - **"Listed-only" design concept** — `list-product` today requires a finished Piece; there's no
>   path to list a design *concept* against a stone without producing it.
> - **Gemstone link on the product** — `buildProductFromPiece` keeps `references.{designId,pieceID}`
>   but drops the originating `gemstoneId`. The flywheel needs that link preserved end-to-end.
> - **Cutter ownership / "back to the cutter"** exit — no ownership/return model yet.
> - **Multi-item** custom orders (modeled in data-model.md, not built).

---

## 2. Current state of the build

- **Branch model:** the rebuild is **merged to `main` and live in prod** (blue-green cutover
  2026-07-01). `main` now carries the full manufacturing/customs rebuild (S0–S7 + React 19). `feat/
  manufacturing-production-cycle` is kept fast-forwarded to `main`; new UI-phase work now ships
  **incrementally to `main`** — the old "no merge to main" freeze is **LIFTED**.
- **3-database model** (same self-hosted Mongo, logical isolation):
  - `efd-database` — **PROD**. Post-cutover: has the **new/renamed collections** (`laborLogs`,
    `payrollBatches`, `workOrders`, `drops`, `designs`, `pieces`, `customOrders`, `customInvoices`).
  - `efd-database-legacy` — **the pre-cutover prod snapshot = rollback point** (original `customTickets`,
    `repairLaborLogs`, `repairPayrollBatches`, `inventory*`). Restore-with-`--drop` to roll back.
  - `efd-database-DEV` — **canonical dev**, where new work is built/verified before shipping.
  - `efd-db-migrate` — staging clone used to rehearse the cutover migrations (its job is done).
- **Collection renames** (S0) are now **live in prod**: `repairLaborLogs→laborLogs`,
  `repairPayrollBatches→payrollBatches`, plus the new production/customs collections. The migrations
  ran on prod at cutover; labor logs kept `repairID` so repair `$lookup`s still work.
- **Backends S0–S7: COMPLETE + verified + LIVE.** Customs (S7) shipped with its UI. Notifications +
  Web Push and the deep-clean/S3→MinIO scrub also shipped.
- **UI phase:** U1 (unified bench `/dashboard/bench`) done + browser-verified. U2–U6 pending — now
  reframed + sequenced under the **"Production Pipeline — Unified Make → List → Drop"** goal
  (`team/goals/production-pipeline.md`), which reconciles the three overlapping half-built worlds
  (production engine, legacy gemstone/design-request, collections) into one spine.
- **Prod cutover: DONE (2026-07-01).** Executed as a blue-green DB swap per `CUTOVER_RUNBOOK.md`
  (clone→migrate→scrub→backup-to-`efd-database-legacy`→promote→deploy). Rollback = redeploy prior
  commit + `mongorestore --drop efd-database-legacy → efd-database`.

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
**U2 — Production catalog (engine built, zero screens):**
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

### The backend stitch still missing for the flywheel
1. **Gemstone link preserved:** carry `gemstoneId` through `buildProductFromPiece` →
   `product.references.gemstoneId` so store products stay stone-linked.

---

## 4. UI roadmap (maps unused APIs → screens)

| Phase | Screen(s) | Wires these APIs |
|---|---|---|
| **U2** | Production catalog: Drops / Designs (STL upload + live cost) / Pieces editors | all `/api/production/*` |
| **U3** | Shared **meshMap builder** (GLB→`/api/glb/inspect`→assign meshes) | reused by U4 + customs 3D |
| **U4** | Product editor → contract shape + publish gate | `products/*` + `validateProductContract` |
| **U5** | Marketplace admin: collections, fee-schedule, cutter ownership/listing | `collections/*` + S6 payouts |
| **U6** | Polish: billing-mode selector, all-lanes shop board, customs design-model/share | — |

Recommended order U2→U6. U2 (design-request + production catalog) is the direct realization of the
reimagined "CAD request" on the existing production spine.

---

## 5. Hard rules (do not forget)

- **The freeze is LIFTED (cutover done 2026-07-01).** `main` is live with the rebuild; new work ships
  **incrementally to `main`**. There is no longer a DEV-only branch gate.
- **Any change that renames/reshapes a live collection is still a migration, never a quick edit:** write
  an idempotent migration under `scripts/migrations/`, `--dry-run` + backup, verify on `efd-database-DEV`,
  then apply to prod. Data-shape changes on prod are deliberate, not incidental.
- **Rollback exists:** `efd-database-legacy` is the pre-cutover snapshot; redeploy the prior commit +
  `mongorestore --drop` to recover.
- **efd-shop shares the prod DB** (`products`, `customOrders`, `pushSubscriptions`) — coordinate any
  shared-shape change with Lead Shop and log it in `team/decisions/` before shipping.
- **No-regression parity:** rebuilds must match-or-beat the legacy form+function.
- Keep `feat/manufacturing-production-cycle` fast-forwarded to `main` after each commit.
