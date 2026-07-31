# feat/production-pipeline-m1 — DEAD (owner, 2026-07-31)

**Verdict: dead branch. Do not merge.** ~90% superseded by main. Four items are worth salvaging if a
future need arises; exact commits are listed below so they can be cherry-picked without re-analysis.

The branch is **pushed to origin** (it was local-only until 2026-07-31 — 34 commits on one laptop with
no backup). It is being kept, not deleted, precisely so the salvage list stays reachable.

---

## What it was

34 commits, all from **a single day: 2026-07-07**. Never PR'd. Nothing branched off it. Everything the
branch did *before* that day is already on main — the merge-base is itself a "Merge main into
feat/production-pipeline-m1" commit that lives on main's history. Then one big day of UI work landed and
attention moved to the blue-green cutover.

## Why it's dead

Main solved the same problems **later and more thoroughly**, on different paths. The decisive comparison:

| Screen | Main | Branch |
|---|---|---|
| Design detail | `products/drops/[dropId]/designs/[designId]/page.js` — **1,921 lines** | `production/designs/[designID]/page.js` — **197 lines** |
| Drops list | `products/drops/page.js` — 261 lines | `production/drops/page.js` — 168 lines |
| Drop detail | `products/drops/[dropId]/page.js` — 369 lines | `production/drops/[collectionID]/page.js` — 343 lines |

Main additionally has drop edit, new drop, design edit, new design, a **variant configurator**
(`variants/[variantId]/configure`), artisan self-service design pages (`artisan/designs/*`), a
panel-based product editor (`products/[id]/` with Media/Pricing/SEO/Status panels), its own unified
products catalog (tasks #23 and #30), and its own products normalize migration (pp2).

**Analysis note, recorded because it bit twice:** an earlier pass of this document called the branch's
CRUD pages "the real prize — main has nothing here." That was wrong. It checked only
`/dashboard/production/` and concluded absence, missing that main built the same screens under
`/dashboard/products/drops/`. Same failure mode as the auth-sibling misses in the security work: **check
every path that could serve the capability before declaring a gap.**

## The four salvageable items

Cherry-pick targets, in descending value. All against `feat/production-pipeline-m1`.

### 1. Piece detail / edit / new pages — the only substantial gap

Main has **six piece API routes** (`route.js`, `start`, `recompute`, `materials`, `list-product`) and
**only a list page**. You cannot open, edit, or create a piece from the UI. These commits wire that up —
the commit message says it outright: *"wire orphaned lifecycle routes."*

```
fa97510  Piece detail page — wire orphaned lifecycle routes
2fef2c7  U-13 (edit) — Piece /edit page + detail Edit button
033e6a1  U-13 (create) — full-page New Piece form
ed05ac5  U-10 — piece detail Media gallery + Alert→Snackbar
```
Also needs `src/components/production/PieceForm.jsx` and the shared card/header components.

### 2. Per-entity images for collections and pieces

Main already has product images (`api/products/[id]/images/`, with a test). Missing: collections and
pieces.

```
4be17c2  U-4 — per-entity image upload/delete routes (MinIO)
3dd7900  U-2 — shared <EntityThumbnail> + <EntityGallery>
```
⚠️ **These are upload routes written before the security sweep.** They must get a session/role gate and
ownership scoping before merging, or they land as new holes.

### 3. Multi-metal pricing fix — verify against main first

```
ceab93b  fix(pricing): per-slot volumeCm3 metal pricing (no multi-metal double-count)
ce3b0df  test(pricing): 2-metal route-level HTTP fixture (#196 follow-up)
311b4db  warn when a metal slot lacks volumeCm3 (under-count guard)
```

**Open question worth ten minutes:** main's `estimateMetalCost` in `services/production/designCost.js`
takes a **single** `volumeCm3`. If that means main double-counts metal on two-tone pieces, it is a live
error in customer-facing retail prices — the highest-value item on this branch, and it's one function.
Check before assuming.

### 4. Rate limiting

`src/lib/rateLimit.js` + test, from `ae7ad5d`. Nothing on main rate-limits anything. Small, standalone.

## Explicitly NOT worth taking

- The products catalog and `productsNormalize` work — main did it twice, better. One branch commit even
  tries to **delete main's** normalize migration (*"drop non-spec pp2-products-normalize"*).
- Design and drop CRUD pages — main's are newer and an order of magnitude more developed.
- `MaterialStudio.jsx` / the customize page — main has the REFRAKT variant configurator instead. A
  separate product decision, not a merge.
