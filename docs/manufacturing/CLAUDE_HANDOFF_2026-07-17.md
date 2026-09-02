# Claude handoff: EFD production catalog, drops, collections, and pipeline

Date: 2026-07-17

This is a high-context handoff from the Codex/BARF recovery session. It captures the owner decisions, known system state, and recommended next work now that BARF is being parked for broad EFD work.

## Read this first

The current repo docs contain older production-pipeline assumptions. The most important conflict:

- Older docs say `collections` absorbed `drops` and that Collection == Drop.
- The latest owner decision is the opposite: **Drops and Collections are separate concepts.**
- Older code/docs may still use `concept`; the latest owner decision is: **do not model "concept" as a separate admin/customer object. A design is a design before and after physical production.**

Until the canonical data model is revised, treat this document as the latest product direction for the Products/Drops/Collections/Designs/Pieces work.

## Current operating decision

BARF is being parked for broad EFD ecosystem work. It is too brittle for sweeping architecture/product workflow changes right now.

What happened:

- The owner used BARF to take broad swings across the EFD ecosystem: production catalog, Drops/Collections/Designs/Pieces, casting, previews, review feedback, and pipeline repairs.
- BARF did produce useful work, but the workflow became hard to trust because task state, preview state, review requirements, stale blockers, and PM chat did not stay clear.
- Broad tasks spawned follow-up tasks and feature previews in ways that made it difficult to tell what had actually shipped, what still needed review, and whether feedback was preserved.
- The owner merged some of the BARF output to `main`, but wants the next pass to be a careful audit and rewrite where needed, not another autonomous multi-task sweep.
- The BARF work should now be treated as the current baseline on `main`. Do not start by reverting it wholesale. Start from `main`, inspect what exists, and revise page by page.

New working mode:

- Be more surgical.
- Start with **Drops**.
- Do not try to fix the whole production ecosystem in one branch.
- Go page by page and make concrete changes the owner can review.
- Make small, reviewable changes with obvious UI outcomes.
- Prefer direct code inspection and explicit owner review over BARF-style PM/task indirection.
- Treat current merged BARF output as material to audit, not as a trusted completed architecture.

Preferred page-by-page order:

1. `Products > Drops`
2. Drop detail
3. Drop create/edit
4. Design create/edit inside a drop
5. Pieces tab inside a drop
6. `Products > Collections`
7. `Products > Catalog` / `Products > Gemstones` nav cleanup
8. `Production > Casting` repair

For each page: inspect the merged `main` implementation, compare it to this handoff, fix only that page/workflow, run focused checks, deploy/preview if useful, then move to the next page.

Use a direct engineering loop instead:

1. Pull/audit `main`.
2. Make one focused branch at a time.
3. Inspect current code before assuming BARF output is correct.
4. Run focused tests plus build/typecheck where possible.
5. Deploy/preview for owner review.

BARF can still be useful later for narrow, mechanical tasks after its review/blocker system is hardened.

## BARF context and task state

Important BARF tasks from the recent run:

| Task | Meaning | Status/context |
| --- | --- | --- |
| #41 `PCR-A-SCHEMA` | Production catalog foundation: Drops, Collections, Design Variant Piece contracts | Shipped/merged earlier. Needs audit against latest direction because latest Drops vs Collections decision may supersede parts. |
| #42 `PCR-E-MTO-CHECKOUT` | Paid made-to-order checkout capacity/planned Pieces | Shipped. User questioned why this needed visual review because it was mostly API/testable. |
| #43 `PCR-E-PRODUCTION-START` | Production start to atomic edition allocation/numbering | Shipped. |
| #44 `PCR-E-MTO-PUBLICATION` | Publication gate for MTO checkout capacity | Shipped. |
| #45/#47 | Production-pipeline-foundation review feedback iterations | Verified. |
| #48 `review-72-d7dcd2e6-6ac` | Remaining casting-board/production-pipeline repair | Was deferred behind #49. If BARF is parked, implement this manually after product/drop/design/piece UX audit. |
| #49 `admin-products-drops-ux-revision` | Products admin UX revision: Drops, Collections, Designs, Pieces | Owner says it was merged to `main`. Verify by auditing `main`; do not assume it is complete or correct. |
| #50 `review-71-87104ab9-d80` | Product media manager mobile drag reorder fix | Shipped/merged. Verify mobile reorder if touching media manager. |

Known BARF issues that caused churn:

- False scope reject on `src/app/dashboard/production/page.js`.
- Local visual critic could not authenticate protected admin routes because local NextAuth/Mongo was not configured.
- "Needs owner" did not explain the actual required owner action.
- Request-change flow was confusing; multiple requests against one preview did not clearly preserve/merge prior feedback.
- Task branch previews vs feature previews remained confusing. Desired contract: only feature branches get previews; task branches should not produce user-review previews.

BARF hardening plan was created in the BARF repo:

`C:\Users\jacob\dev\crittercodes\barf\docs\redesign\REVIEW_AND_BLOCKER_HARDENING_PLAN.md`

## Product information architecture

Target admin navigation:

```text
Products
  Catalog
  Drops
  Collections
  Gemstones

Production
  Casting
```

Rules:

- `Products > Catalog` is the unified product catalog. It should preserve the useful condensed catalog/media-manager work.
- `Products > Drops` is where release drops are created and managed.
- `Products > Collections` is separate from Drops and should behave like Shopify smart collections.
- `Products > Gemstones` remains a first-class catalog area.
- `Production > Casting` is the casting board.
- Designs and Pieces should not be primary nav items for this workflow.
- Old `Production > Designs`, `Production > Pieces`, and combined `Collections & Drops` views should be removed from nav or redirected to canonical routes.

## Drops vs Collections

Drop:

- A release drop.
- Owns release timing/context.
- A drop can contain designs and pieces for a release.
- A drop is shoppable in the shop per drop, similar to a collection page, but it is semantically a release.
- One drop owns a design when the design is assigned to a drop.
- Backlog designs can exist outside a drop because existing/released designs already exist.
- EFD can create drops that include designs assigned to multiple artisans.
- An artisan can create their own drops.

Collection:

- A Shopify-like smart grouping.
- Not a release drop.
- Driven by tags, metadata, product/design/piece params, status, artisan, collection type, and optional manual includes/excludes.
- Examples: One of One, Signature, Made to Order, rings, handmade, etc.
- Should support rule/condition definitions and manual override hooks.

Do not collapse these two again without explicit owner approval.

## Design and Piece language

The owner wants to remove the "concept" distinction from the admin/customer model.

Use:

- **Design**: the reusable design/listing/manufacturing spec. It can be draft, made-to-order, released, etc.
- **Piece**: a physical object that exists or is planned as a physical production unit.
- **Product/listing**: the shoppable representation.

Avoid:

- Treating "concept" as a separate primary entity.
- Customer-facing copy that says concept.
- Separate concept pages/forms/nav.

Important nuance: a design can be sold/made-to-order before a physical piece exists. The customer does not care that it is technically a "concept"; for them it is a made-to-order design.

## Drop UX

Required admin UX:

- Drops grid page under Products.
- Dense, Shopify-style admin layout. Not a marketing page.
- New/Edit Drop are standalone pages, not modals.
- Drop detail page has tabs:
  - Designs
  - Pieces
- Drop detail is the main management surface for designs and pieces in that drop.
- Drop form should not have a "theme" field. Owner called it dumb/corny and not applicable.
- Drop form must support actual ownership/assignment:
  - EFD/admin-owned drop.
  - Artisan-owned drop.
  - EFD drop with multiple artisans assigned at the design level.

## Design UX

Required admin UX:

- Create/edit Design are standalone pages, Shopify-style.
- Main form on left; status/organization rail on right is preferred.
- Explicit save behavior.
- No modal-first workflow.
- Designs require at least one variant.
- Drafts may be saved without STL/GLB files.
- Draft sketch/reference upload must support "I have a sketch and want to request CAD" later.
- Support uploading:
  - STL
  - GLB
  - sketches/reference files
  - renders/images where applicable
- Support tags and metadata.
- Support artisan assignment.
- Support status/draft.
- Support capacity/run size:
  - one of one
  - limited release
  - no limit
- Support variant-level Refrakt/customizer params.
- Do not use concept terminology.

Open future concern from owner: we may not be collecting enough design/piece data. Audit fields before finalizing the model.

## Variants, sizes, capacity, and oversell rules

Owner decisions:

- A design must have at least one variant.
- One primary product/listing may have variants.
- Capacity is set by the creating admin/artisan:
  - one of one
  - limited release
  - no limit
- Do not oversell capacity.
- Refrakt customizer params belong on the variant when applicable.
- Designs using Refrakt customizer are made-to-order unless a physical piece is attached.
- A variant with a Piece associated is ready-to-ship.
- A variant with no Piece associated is made-to-order.

Ring sizing:

- Sizes are not separate variants.
- Size is a property/allowance of a variant or piece.
- Do not put multiple ring sizes inside one physical variant.
- A ring can have an allowed size range, e.g. can be sized between X and Y.
- Outside the allowed range is a special request and requires a new piece.
- This does not apply to non-ring items.

## Pieces

Piece:

- Physical object.
- Carries actual COGS and availability.
- A Piece may be tied to a Design Variant.
- Ready-to-ship means a physical Piece exists and is available.
- Made-to-order means the Design Variant is eligible to be made but no physical Piece is attached.

Piece management should happen from the Drop detail/Pieces tab and from Design Variant context, not from disconnected primary nav.

## Storefront/shop implications

Desired behavior:

- All eligible listings publish.
- Drops are shoppable in the shop per drop like a collection/release page.
- Products/listings should derive availability from piece/variant capacity:
  - ready-to-ship if available piece exists.
  - made-to-order if no available piece but variant capacity allows production.
- The shop must not oversell one-of-one or limited capacity.

Question to audit:

- Which parts of this are currently implemented in efd-shop vs efd-admin?
- Whether the latest admin merge changed shared `products`, `designs`, `pieces`, `collections`, or `drops` shapes that efd-shop consumes.

## Production and casting pipeline

The casting board is important but secondary to the product/drop/design/piece model. The owner wants Product/Drops/Designs/Pieces coherent first, then casting repaired against that model.

Current desired casting behavior:

- `Production > Casting` is the only production nav item expected for now.
- Casting board should list open pieces across custom and production sources.
- Preview/review needs at least two seeds:
  - one custom casting job
  - one production casting job
- Owner wants to test one in-house path and one outsourced/Carrera path.

In-house casting:

- Should create a claimable work order.
- Completing the in-house casting work order must credit the caster/account correctly.
- Payout is not hourly-only.
- Casting payout/pricing should be based on material/casting calculation:
  - material cost with 1.3x markup
  - plus $15 labor fee
- Casting markup and labor fee should be admin settings.

Carrera/outsource casting:

- Do not record a finalized business expense when the order is placed.
- At order time we have an estimate/quote, not a final invoice.
- Record estimate/order state only until received.
- Record the finalized business expense exactly once when received/final invoice exists.
- Carrera/outsource path credits no labor.
- The UI should not require manual PO/invoice forms for normal routing; route and estimates should be auto-calculated.

Receiving:

- Receiving in-house or outsourced casting should create downstream bench work orders exactly once.
- Idempotency is required.

#48 remaining repair focus:

- Fix in-house casting payout credit.
- Fix Carrera expense timing.
- Add/verify two seeded casting jobs.
- Ensure receiving creates bench work orders once.

## Work orders, bench, QC, and artisan views

Owner reported possible prod data/UI issues:

- Repairs appeared missing in prod; My Bench and QC were empty. It was unclear if this was correct.
- Vernon said he could not see completed work for the week. Artisan views need audit.
- Need to be able to inspect admin from Vernon's view or equivalent role simulation.

Important rule from older docs still stands:

- Work Orders are source-agnostic.
- Bench and labor review should operate on work orders regardless of source.
- Discipline/artisan type gates visibility.
- Off-lane work is hidden from non-owner/non-admin users.

Audit targets:

- `/dashboard/repairs/labor-review`
- My Bench views
- QC views
- artisan completed work/week views
- labor credit rollup after work order completion

## Custom orders, Randa/Ronda invoice sidequest, and client snapshots

Recent production sidequest:

- A real live Stripe invoice was sent for Randa/Ronda Winstead deposit.
- The owner wanted it to move through the app properly, not just be sent manually.
- The quick route used Stripe invoicing/email. Future desired flow is for the customer to land in the shop/payment experience if possible.
- The deposit was paid.

Known issue:

- Updating Randa's client/user info did not propagate to her custom order.
- Custom order still showed wrong email/name and no phone number after client update.
- This likely means custom orders store denormalized client/customer snapshots.

Audit/fix:

- Decide whether custom orders should live-update from client profile or intentionally snapshot at creation.
- If snapshot is intentional, add explicit "sync/update customer info on this custom order" action.
- For invoice/payment flows, ensure the Stripe Customer/email/name/phone and custom order snapshot stay consistent.

Stripe setup state from the session:

- Live Stripe keys were set/rotated in Vercel for admin and shop, then redeployed.
- Sandbox keys had been shown earlier only for audit.
- Webhooks/payment methods still need a proper audit if not already done.
- Do not assume invoice/webhook parity without checking Stripe dashboard and Vercel envs.

## Production database and preview database policy

Known production DB:

- `efd-database` is production.

Non-prod/preview DBs:

- BARF previews used isolated non-production database identities, e.g. `efd-preview-admin-production-pipeline`.
- Owner questioned clutter from creating whole new Mongo databases for previews when a dev DB exists.

Recommended policy:

- Production previews must never point at `efd-database`.
- Local development can use canonical dev DB where appropriate.
- Feature previews need deterministic reset/seed isolation. This can be:
  - one shared preview DB per app/feature class with strict reset; or
  - per-feature preview DBs with automatic cleanup.
- Avoid unbounded preview DB sprawl. Add retention/cleanup if using per-feature DBs.
- Every preview review card should show database identity and reset/seed digest.

Incident to remember:

- Prod admin once went down/loading no DB data with `Settings not found`.
- Settings document must exist in prod and preview DBs.
- App should seed/create safe defaults or fail with an actionable admin error, not break broad data loading.

## Product media manager

Recent task #50 fixed/attempted:

- Product media mobile drag reorder.
- Issue: desktop drag worked, mobile did not.
- Fix added touch-action/user-select style behavior and test coverage.
- Preview/merge was accepted and shipped.

Verify if touching:

- Open product media page on mobile.
- Drag second photo into first position.
- Reload.
- Confirm reordered photo remains first and carries `PRIMARY`.

## Immediate recommended Claude plan

Start with audit, not new sweeping implementation.

1. Pull latest `main`.
2. Confirm what #49 actually merged:
   - nav structure
   - routes
   - API wiring
   - drop grid
   - drop detail Designs/Pieces tabs
   - standalone drop/design editors
   - collection page
   - redirects for old production routes
3. Compare actual code to this document.
4. Begin the implementation pass with **Drops only**:
   - Products > Drops nav entry is visible and correctly placed.
   - Drops grid is usable and not modal-first.
   - New/Edit Drop are standalone pages.
   - Drop detail exists.
   - Drop detail has Designs and Pieces tabs, even if later tabs need incremental completion.
   - Drop form removes `theme` and supports real owner/artisan assignment.
5. Update canonical docs/data model to resolve contradictions before changing shared data shapes:
   - Drops and Collections separate.
   - Remove/replace "concept" terminology.
   - Design/Variant/Piece/Product relationships.
6. Fix admin IA and routes until the owner can see:
   - Products > Catalog
   - Products > Drops
   - Products > Collections
   - Products > Gemstones
   - Production > Casting
7. Make the Drop workflow actually usable:
   - grid
   - standalone new/edit
   - detail with Designs/Pieces tabs
   - no modals for create/edit
8. Then make the Design editor actually usable:
   - variants
   - capacity
   - artisan
   - tags/metadata
   - STL/GLB/sketch/reference uploads
   - draft without files
9. Then repair casting #48 manually:
   - two seeds
   - in-house payout
   - Carrera received-expense timing
   - downstream bench WOs exactly once
10. Then audit prod support issues:
   - Randa custom order client snapshot/payment consistency
   - Vernon completed work/week view
   - empty bench/QC/repairs visibility

## High-risk areas

- Shared data shapes consumed by efd-shop.
- Mongo prod vs preview env confusion.
- Legacy docs/code saying Drops == Collections.
- Any code path still using "concept" as a user-facing/admin primary object.
- Modals for create/edit flows.
- Custom order customer snapshots vs client profile updates.
- Casting expense timing and labor payout side effects.
- Work order idempotency on received transitions.
- Review based only on tests for UI-heavy changes; still needs human UI pass.

## Suggested validation commands

Use the repo's actual scripts from `package.json`; do not assume all commands exist. Start with:

```bash
npm install --legacy-peer-deps
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Known inherited test issue from BARF runs:

- `BenchWorkCard.test.jsx` failed because `@testing-library/dom` was missing. BARF marked it inherited/baseline, but verify locally before relying on that.

## Owner preferences to preserve

- Shopify-like admin UX: dense, practical, standalone create/edit pages.
- Avoid modal-first create/edit workflows.
- Avoid corny/non-applicable fields like Drop "theme."
- Make previews/reviews tell the user exactly what to test.
- Do not make the owner guess what "review requirements remaining" means.
- Prefer direct usable workflows over abstract architecture.
- Broad autonomous BARF work is paused; direct engineering is preferred for now.
