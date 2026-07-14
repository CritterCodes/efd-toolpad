# Production Revision Delivery Plan

**Status:** planning gate. EFD remains paused. Do not dispatch or merge the production-foundation,
Shopify-exit, or dependent concept/customizer tasks from this document alone.

## Existing BARF Task Reconciliation

| Task | Decision | Required revision |
|---|---|---|
| #33 Product media manager | Retain, rescope | Product media remains useful. Design CAD/sketch/STL/GLB revision management belongs in the Design editor/CAD workflow, not this Product-only task. |
| #35 Casting surface | Retain branch, block merge | Casting remains under Production. Repair transition atomicity, side-effect ordering, source type, work-order generation, isolated preview seed, and review brief before merge. |
| #36 Gemstone threading | Retain branch, reverify | Design -> Piece -> Product gemstone provenance still applies. Rebase to revised Design/Variant/Piece shape and verify sale lifecycle atomically. |
| #37 Admin concept listing | Supersede wording/scope | Replace with Design -> primary Product, Variants, edition accounting, and made-to-order offer. Remove `concept`. Depends on Design/Variant/Piece foundation and repaired casting. |
| #38 Shop concept listing | Supersede wording/scope | Render Variant offers: exact ready-to-ship Pieces and made-to-order/Refrakt paths on one Product. Remove `concept`. Depends on revised product contract and #37 replacement. |
| #39 Per-listing customizer | Rescope | Embed Refrakt `ConfiguratorSetup` on a base Design Variant. Persist constrained mesh-map options; every selection is MTO and snapshots onto order/Piece. |

Do not create replacement BARF tasks until this revision is owner-reviewed and the task set can be
created as a small dependency graph rather than dozens of independent branches.

## Proposed Delivery Epics

### A. Schema reset and contracts

- Snapshot then delete Drop/Collection test data only.
- Introduce separate `drops` and smart `collections` models.
- Remove `concept` from Design/Product contracts.
- Add Design Variants, sizing allowance, collaboration, edition counters, and exact Piece configuration.
- Add guarded, atomic edition allocation at production start.
- Create deterministic DEV/preview seeds and reset commands.

### B. Products information architecture

- Navigation: Products / Catalog / Drops / Collections / Gemstones; Production / Casting.
- Remove primary Designs/Pieces navigation; preserve contextual redirects where useful.
- Full-page create/edit routing; no primary modal forms.
- Catalog links to Design, Variant, Piece, Product, and Drop context without exposing internal clutter.

### C. Drop workspace

- Full-page Drop create/edit with real EFD/artisan ownership selection.
- Drop detail with Designs and Pieces tabs/grids.
- Full-page Design and Piece create/edit routes nested under Drop context.
- Guarded schedule/go-live operation publishing all eligible primary Products atomically.
- Shop `/drops/<slug>` integration.

### D. Design, CAD, and collaboration

- Full Design editor: identity, category, controlled attributes, tags/metadata, edition, primary artisan,
  collaborators/roles, sketches/references, production method, Variants, pricing, and history.
- `Request CAD` form using Design-sourced CAD work orders; named assignment or open queue.
- Revisioned STL and GLB uploads, mesh-map builder, peer QC, rejection/revision history, labor credit.
- Handmade path skipping CAD/Refrakt while retaining Variant/Piece/work-order/COGS accounting.

### E. Variants, Pieces, and offers

- At least one Variant per sellable Design.
- Ring nominal size + min/max sizing allowance; outside allowance creates special request/new Piece review.
- Automatic Piece creation from MTO orders and manual creation from Design.
- Exact ready-to-ship matching only for `available` Pieces.
- Same Product may offer ready-to-ship and made-to-order/customizer paths.
- Design-wide one-of-one/limited/unlimited cap across every Variant/configuration.

### F. Smart Collections

- Safe rule registry and evaluator over controlled fields, metadata, and tags.
- Manual include/exclude and pinned ordering.
- Full-page Collection editor and shop routes.
- Initial smart Collections: One of One, Made to Order, Signature Designs, Rings, plus owner-defined rules.

### G. Preview review contract (BARF)

- Isolated per-preview writable database or namespace; never production.
- Deterministic seed/reset command attached to deployment.
- Mandatory review brief: scope/non-scope, routes, records, steps, expected results, environment,
  inherited defects, commit/deployment/build evidence.
- BARF dashboard renders the brief and blocks review-ready/merge while it is missing.

## Resolved Policy Details

1. Paid MTO checkout atomically claims `committed` limited-edition capacity. Production start converts
   it to `allocated`; cancellation/refund before start releases it. Remaining sellable capacity subtracts
   both counters, preventing overselling without counting unstarted Pieces as made.
2. Design collaborator assignments own roles and visible credit. Revenue splits use a separate,
   versioned collaboration agreement with independent approval/audit history.

## Dependency Order

```text
G Preview safety/briefs
  -> A Schema reset/contracts
      -> B Information architecture
      -> D Design/CAD/collaboration
          -> C Drop workspace/release
          -> E Variants/Pieces/offers
              -> repaired #35/#36 foundation
              -> revised #37 admin listing
                  -> revised #38 shop listing
                  -> revised #39 customizer
      -> F Smart Collections (after Product projection is stable)
```

Only one feature epic is reviewed/merged at a time. A dependent task remains backlog until every
prerequisite is on main and its preview brief is accepted.
