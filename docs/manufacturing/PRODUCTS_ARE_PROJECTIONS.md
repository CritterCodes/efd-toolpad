# Products Are Projections — the listing sync plan

**Owner ruling (2026-09-10):** _"I never want to have to create a product. Designs and pieces ARE
the products. A design in the shop for when there is no physical piece — MTO with preset variants
or the REFRAKT customizer. Pieces are the RTS products made from a variant. Me creating a design,
variant and piece, then having to create a product for it is unacceptable. Gemstones need to fit
gracefully into this flow."_

This supersedes the remaining S5 UI work ("product editor screen") in [sprints.md](./sprints.md):
there will be **no product editor**. Nobody — owner, staff, or artisan — ever authors a Product.

---

## 1. Why the `products` collection physically survives

efd-shop reads the `products` collection **directly from MongoDB — there is no API between the
apps** (see [data-model.md §products](./data-model.md) and
[product-page-data-contract.md](./product-page-data-contract.md), which stays authoritative for the
document shape). Some materialized document therefore has to exist for the storefront to read.

The resolution: `products` becomes a **projection** — a machine-maintained cache of Design + Piece
state, the way a search index is a cache of a database. It is never a source of truth for anything
except the handful of commerce counters the shop itself writes (see §5.3). Everything a human edits
lives on the **Design** (spec, variants, pricing recipe, story, publish flag, media) or the
**Piece** (as-built facts, COGS, per-piece price).

Mental model per the ruling:

| Shop concept | Source of truth | Offer type |
|---|---|---|
| Made-to-order listing (preset variants) | Design + active Variants | `offers.madeToOrder` while edition capacity remains |
| Made-to-order, customer-configured | Design Variant with REFRAKT `viewer.customizable` | `offers.madeToOrder.customizerEnabled` |
| Ready-to-ship item | `available` Piece of a Variant | `offers.readyToShip` (exact, counted from Pieces) |
| Loose gemstone, cut to order | gemstone Design (the cut) + species Variant with rates | MTO at price-at-carat |
| Loose gemstone, physical stone | `available` Piece of a gemstone Design | RTS at the piece's fixed price |

## 2. What already exists (build on it, don't rewrite)

- **`projectDesignProduct`** ([src/services/production/productProjection.js](../../src/services/production/productProjection.js))
  — the pure projection: RTS offers counted from `available` Pieces per variant, MTO offers gated on
  edition capacity, customizer flag from `variant.viewer.customizable`, gem from-price, public gem
  spec stripping. **It has zero production callers.** This function is the heart of the plan; the
  missing work is orchestration around it.
- **Contract builders** ([productContract.js](../../src/services/products/productContract.js)) —
  `buildProductFromDesign` (used by the gemstone listing bridge + list-concept),
  `buildProductFromPiece` + `attachPieceToProduct` (used by list-product), `validateProductContract`
  (§8 gate, unit-tested).
- **Manual one-shot listing routes** — `POST /api/production/designs/[designID]/list-concept`,
  `POST /api/production/pieces/[pieceID]/list-product`, and the Phase-4 gemstone bridge. These
  become internal calls of the sync engine, then disappear as user-facing actions.
- **Daily repricer** ([dailyReprice.js](../../src/services/production/dailyReprice.js)) — already
  writes design-variant prices and product headline prices from live metal; already skips designs
  it cannot price (verified: rate-less gem designs and consigned one-offs keep their prices).
- **Legacy hand-authoring editors** — the gemstone and jewelry product CRUD
  (`/api/products/gemstones`, `/api/products/jewelry`, and their dashboard pages). These are the
  thing the ruling outlaws; they get absorbed and retired (§6, P5).

## 3. Target architecture

### 3.1 The sync engine — `syncDesignListing(designID)`

One idempotent service (`src/services/production/listingSync.js`):

1. Load the Design, its Pieces, and its existing product doc (`primaryProductId`, else by
   `references.designId`).
2. Compute the projection via `projectDesignProduct` (+ `buildProductFromDesign` for first
   materialization).
3. Upsert the product doc, **preserving shop-owned counters** (§5.3) and passing
   `validateProductContract` before any publish-state write.
4. Stamp `projection: { syncedAt, sourceVersion }` on the product for observability.

Triggered from every write path that changes listing-relevant state:

| Trigger | Where |
|---|---|
| Design create/update (variants, pricing, media, publish flag) | design PUT/PATCH routes |
| Piece status transition (`available`, `reserved`, `sold`, `scrapped`, `returned`) | piece update routes + production-run/QC transitions |
| Edition allocate/commit/release | editionCapacity service |
| Daily reprice | after `repriceListings` writes variant prices |
| Drop release (future engine) | bulk-publish path re-syncs the frozen set |

Plus `syncAllListings()` (cron/manual) as the self-healing sweep — projections may always be
rebuilt from scratch.

### 3.2 Publish state lives on the Design

New `design.listing` block — the only human-facing publish control:

```
listing: { published: bool, visible: bool, featured: bool, publishedAt, listedBy }
```

The projection maps it to the contract's `status: 'published'` / `isPublic`. A Design with
`listing.published: false` projects a draft (or no doc at all — see Open Questions). The Drops
release engine later flips these in bulk; same field, same sync.

### 3.3 Pricing sources (no price is ever typed on a product)

| Case | Price source | Maintained by |
|---|---|---|
| Jewelry MTO variant | `variant.pricing.retailPrice` / `variant.price` | daily repricer (design recipe + live metal) |
| Jewelry RTS piece | piece COGS × markup | repricer `actual` branch; COGS frozen |
| Gem MTO (cut to order) | from-price floor + price-at-carat endpoint | repricer + Phase-4 endpoint |
| Gem/one-off RTS piece | **new: `piece.pricing.retailPrice`** (fixed, e.g. the consignment sheet price) | set at intake or on the Piece; repricer leaves `priceSource: manual` alone |

The consigned items' sheet prices migrate from the product docs onto their Pieces (P4).

### 3.4 Media

Photos and 3D belong to the Design (`referenceImages` → a proper `media` block) and, for as-built
one-offs, the Piece. The projection assembles `images[]`/`viewer` from them. Migration moves the 27
consignment photos' image objects onto their Pieces without re-uploading (URLs/keys unchanged).

### 3.5 Gemstones, gracefully

A gem cutter's whole world is My Designs (+ piece intake):

- **The cut is the Design**; species offerings are Variants. Rates on a variant ⇒ purchasable MTO
  at price-at-carat (shipped Phase 4).
- **A physical cut stone is a Piece**: species/carat/dimensions/clarity as as-built facts, a fixed
  `pricing.retailPrice`, status `available` ⇒ the projection emits an RTS offer.
  **Gap to close:** `projectDesignProduct` prices gem listings only as MTO from-price; it needs
  per-piece RTS offers with the piece's fixed carat + price (P2).
- **Consigned one-off** = one_of_one Design + available Piece, created together by intake (P3) —
  the shape the 2026-09-10 backfill already gave all 27 consigned items.

## 4. What the shop sees (contract unchanged)

No efd-shop changes are required for P1–P3: the projection writes the same contract shape the shop
already reads (offers, edition, pricing, gemstone/jewelry blocks, images, viewer). Shop work only
appears in P4 if we choose piece-level RTS selection UI (buying a *specific* stone from a design
with several available pieces) — flagged as an open question.

## 5. Design decisions & known wrinkles

### 5.1 Repricer vs. sync (no fighting)
The repricer stays the price *author* (writes design-variant prices + piece formula prices); the
sync engine is the *assembler* (copies those into the projection). Ordering: reprice → sync. The
sync never computes prices itself.

### 5.2 One product doc per Design
`design.primaryProductId` is the handle; a Piece never gets its own product doc (kills the current
list-product duplicate-vs-ripen ambiguity). RTS pieces appear as offers *inside* the design's
listing. Migration collapses any piece-level products into their design's doc.

### 5.3 Shop-owned counters (the sale loop)
The shop's reserve-on-paid guard decrements `inventory`/offer quantities **directly on the product
doc** at payment. Rules:
- The sync engine treats those counters as *theirs*: it recomputes offers from Piece states, but a
  paid-order decrement must never be silently resurrected by a stale re-sync.
- The missing loop: an **order reconciler** (admin-side, on order ingestion) flips the purchased
  Piece `available → sold` (or `reserved`), releases/consumes edition capacity, then re-syncs — at
  which point Piece state and shop counters agree again.
- Until the reconciler lands (P4), RTS offers stay conservative: quantity = min(piece count, shop
  counter).
- ⚠ remember the platform-wide rule: **subdoc writes replace, not merge** — every sync write uses
  dotted paths for anything the shop also touches.

### 5.4 Drops
The release engine (see [DROPS_STATE_AND_FACELIFT.md](./DROPS_STATE_AND_FACELIFT.md)) becomes a
thin layer: validate the drop's Designs, flip their `listing.published` in one transaction, sync.
No separate publish machinery on products.

### 5.5 Customs / one-off sold pieces
A custom Piece (customerID set) never projects an RTS offer. Already-sold consigned items just flip
the Piece to `sold`; the projection retires the offer.

## 6. Staged build plan

**P1 — the sync engine (core).** ✅ BUILT 2026-09-10 (`listingSync.js` + pure `listingSyncCore.js`,
triggers in design create/update, piece update/start, repricer tail; manual sweep at
`POST /api/production/listing-sync`; corpus dry-run passed 27/27). Note: `design.listing` publish
block is supported by the sync but no UI writes it yet. Found + fixed in passing: the design PUT
replaced the edition subdoc, wiping server-owned counters (route now preserves them; two prod
designs repaired).
`listingSync.js` (+ tests) wrapping `projectDesignProduct`; `design.listing` publish block; wire
triggers into design/piece write routes + repricer; `syncAllListings` sweep; stamp `projection`
metadata. Validate against the 27 consigned items as the live corpus (their projections must
round-trip: same offers, prices preserved, photos intact).
*Done when:* editing a Design or flipping a Piece's status updates the shop-read doc with no human
touching a product, and the §8 contract gate passes on every sync.

**Release engine (2026-09-11, PR #77 + follow-up).** Not originally a numbered phase — releasing a
drop turned out to be pure theatre (a status dropdown; nothing read it; no cron for `scheduled`).
`services/production/dropRelease.js` now resolves the drop's designs, preflights each, prices what
it is about to publish, publishes through the sync, and marks the drop released; refusal is a 409
with per-design reasons. Wired to `POST .../drops/[dropID]/release`, the status dropdown, and a
5-minute cron. Four latent defects fell out of it: inactive-by-default variant stubs, the
unpublished⇒unpriced⇒unpublishable deadlock, `viewer` never joining design GLB + variant meshMap,
and two rival design→product link fields minting duplicate listings.

**The drop page is a projection too (2026-09-11).** Releasing published the drop's PRODUCTS but the
drop itself still appeared nowhere: efd-shop renders `/drops/[slug]` and the Drops tab on
`/collections` from the **`collections`** collection ("a Drop is a Collection with a release facet"
— its own comment, decisions/0003), while admin moved drops to their own collection per the
owner's July-17 "Drops and Collections are separate" ruling. Nothing bridged them. `releaseDrop`
now upserts a stamped read-model doc (`collectionId: drop-<dropId>`, `kind: 'drop'`,
`status: 'released'`, ordered `members[]`) — `drops` stays source of truth. It refuses to overwrite
a hand-authored Collection holding the same slug. **When the shop is moved onto `drops` directly,
delete this projection** (the honest fix lives in the shop repo).

**Media + name projection (§3.4) — DONE.** `design.media.images` and `design.name`/`description`
project onto the listing (blanks never overwrite). Jake's 15 stones carry 55 photos this way.
**Materialization gate:** a listing is only created when the design asks for one (has a `listing`
block, is already linked, or `create: true`) — the sweep otherwise minted shop listings for private
custom-order designs.

**P2 — gem RTS offers.**
Per-piece RTS offers (fixed carat/price) in the projector; `piece.pricing.retailPrice`; repricer
respects `priceSource: manual`. My Designs gem editor gets a "stones on hand" panel (the design's
Pieces).
*Done when:* Jake's Blue Zircon shows as an RTS offer on its design's listing, priced from the
Piece, with MTO price-at-carat coexisting where he's set rates.

**P3 — intake = Design + Piece.**
One admin/artisan intake form (consigned or on-hand) that creates the one_of_one Design + available
Piece (+ photos to the Design/Piece); sync lists it. Retires product-first intake for good — the
paved-road version of the 2026-09-10 backfill script.
*Done when:* the next consignment sheet is imported with zero product-collection writes by hand or
script.

**P4 — sale loop + migration.**
Order reconciler (paid order → Piece sold → edition + re-sync). Migrate existing hand-authored
products: prices → Pieces, photos → Design/Piece media, collapse piece-level docs per §5.2, then
mark every projected doc `projection.managed: true`. As of 2026-09-10 the prod products collection
is believed to be ~the 27 consigned items (verify at build time) — migration is small.
*Done when:* a test purchase flips the Piece, the offer disappears, and no unmanaged product docs
remain.

**P5 — retire the authoring surfaces.**
Delete/absorb the gemstone + jewelry product CRUD editors and POST routes; demote admin Products to
a read-only projection monitor (sync status, contract violations, unmanaged docs); artisan My
Listings stays as the read-only shop-view. Update [data-model.md](./data-model.md) products section
+ [navigation.md](./navigation.md).
*Done when:* `grep` finds no route that inserts into `products` outside `listingSync`.

## 7. Open questions for the owner

1. **Unpublished designs:** project a `draft` product doc (admin/shop-preview visible) or no doc at
   all until published? (Draft-doc is simpler for preview and what the consigned items do today.)
2. **Piece-level buying:** when a design has 3 available stones at different carats/prices, does the
   shopper pick a specific piece (needs shop UI work, P4+) or is RTS shown only when the pieces are
   interchangeable?
3. **Who prices consigned pieces:** artisan sets `piece.pricing.retailPrice` themselves (self-serve
   in My Designs), or admin-only with the artisan proposing?
4. **Products nav:** keep a read-only "Listings (projection)" admin page, or fold sync status into
   the Design detail page and drop the Products section entirely?

---

*Relations: supersedes S5-remaining in [sprints.md](./sprints.md) · shape authority stays
[product-page-data-contract.md](./product-page-data-contract.md) · gem model:
[GEMSTONE_DESIGNS_AND_INVENTORY.md](./GEMSTONE_DESIGNS_AND_INVENTORY.md) · release engine:
[DROPS_STATE_AND_FACELIFT.md](./DROPS_STATE_AND_FACELIFT.md).*
