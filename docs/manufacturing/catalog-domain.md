# Catalog and Production Domain

**Status:** Owner-approved revision, 2026-07-14. This document is authoritative for Drops,
Collections, Designs, Variants, Pieces, Products, production availability, and their admin
information architecture. Update `data-model.md` and the storefront contracts in the same change
when this document changes.

## 1. Vocabulary

Do not use `concept` as a product type, design status, listing type, or customer-facing label.

| Term | Meaning |
|---|---|
| **Drop** | A release and production workspace. One Drop owns its Designs and publishes their eligible listings together. |
| **Collection** | A merchandising view over Products. Usually rule-driven from structured fields, metadata, and tags; not a production container. |
| **Design** | A reusable jewelry specification and body of IP. It persists before and after physical production. |
| **Variant** | One concrete, sellable base configuration/SKU of a Design. A ring Variant has one nominal size, not many sizes. |
| **Piece** | One physical instance of a Design Variant. It owns actual materials, production state, COGS, exact size, and availability. |
| **Product** | The primary storefront listing that projects one Design, its Variants, and any available Pieces. |
| **Made to order** | A sellable Design/Variant or Refrakt selection for which a new Piece must be created. |
| **Ready to ship** | An exact Variant/configuration backed by a Piece whose status is `available`. |

A Design does not become a Piece or disappear when production begins. Design `1 -> N` Piece.
One Product is the primary listing for a Design and contains its sellable Variants.

## 2. Relationships

```text
Drop (optional for pre-existing/evergreen work)
  1 -> N Designs

Design
  1 -> N Variants
  1 -> N Pieces
  1 -> 1 primary Product

Variant
  1 -> N Pieces

Product
  projects Design + Variants + available Pieces

Collection
  resolves N Products through rules + manual overrides
```

- A Design belongs to at most one Drop. A Drop owns the Design; Designs are not reused across Drops.
- A Design may have no Drop so existing released work and evergreen designs can be represented.
- EFD Drops may contain Designs owned by multiple artisans. Artisan-created Drops are owned by that
  artisan, but Designs may still credit collaborators.
- One Product listing may simultaneously expose ready-to-ship Pieces and made-to-order purchase paths.

## 3. Drops

A Drop is both the internal release workspace and a shoppable storefront release page.

Required capabilities:

- `ownerType: efd | artisan`; artisan-owned Drops require `ownerId`.
- EFD-owned Drops may contain Designs with different primary artisans.
- Lifecycle: `draft -> scheduled -> released -> archived`.
- Release publishes every eligible Product listing owned by the Drop in one guarded operation.
- The release preview enumerates eligible and ineligible Designs. Ineligible Designs remain draft and
  are reported with actionable validation errors; they are never silently treated as released.
- The shop exposes `/drops/<slug>` and renders the released Products for the Drop.
- Drop detail is the production workspace with `Designs` and `Pieces` tabs/grids.
- Do not use a required `theme` field. Merchandising content is title, description, media, SEO, and
  optional editorial copy.

Creating and editing a Drop uses full pages, not a modal.

## 4. Smart Collections

A Collection is independent from Drops and never owns Designs or Pieces. It is a storefront category
such as One of One, Signature Designs, Made to Order, Rings, or a future merchandising segment.

Collections support:

- smart rules over controlled Product/Design fields;
- rules over metadata and free-form tags;
- manual includes and excludes;
- pinned Products and explicit ordering overrides;
- draft/published/archived lifecycle;
- overlap (one Product may appear in many Collections).

Initial rule fields:

- product type (`jewelry | gemstone`);
- jewelry category/type;
- primary artisan and collaborators;
- Drop;
- edition type (`one_of_one | limited | unlimited`);
- offer type (`ready_to_ship | made_to_order`);
- Refrakt/customizer enabled;
- metal/karat and other controlled Variant properties;
- price range;
- Product status and channels;
- tags and metadata.

The rule vocabulary is extensible as Design and Piece data becomes richer. Controlled fields are the
reliable filter spine; free-form tags supplement them rather than replacing them.

## 5. Designs

A Design is the durable manufacturing and merchandising specification. It has one primary artisan
and may credit multiple collaborators with roles such as designer, CAD designer, jeweler, gem cutter,
engraver, or other future disciplines.

Core groups:

- Identity: title, handle, description, story, category, controlled attributes, tags, metadata.
- Ownership: primary artisan, collaborators and roles, optional Drop.
- Edition: `one_of_one | limited | unlimited`, with a positive cap for limited.
- Production method: `cad_cast | handmade | hybrid`.
- Intake: sketches, reference images, notes, target dimensions, target materials/stones, budget,
  desired date, and CAD brief.
- CAD artifacts: revisioned STL, GLB, renders, mesh map, model units, QC history.
- Manufacturing: BOM/estimated materials, routing, labor estimate, casting requirements, linked
  gemstones, estimate and suggested retail.
- Commerce: at least one Variant before the Design is sellable; one primary Product listing.

Lifecycle:

```text
draft -> cad_requested -> cad_in_progress -> cad_qc -> ready -> retired
```

Handmade Designs may move from `draft` to `ready` without CAD artifacts once their manual
manufacturing/pricing requirements pass. Drafts may always be saved incomplete.

## 6. Variants And Ring Sizing

Every sellable Design requires at least one Variant. A Variant is a concrete standard SKU/base
configuration, not every possible Refrakt customer selection.

Variant fields include:

- `variantId`, SKU, title/label, active status;
- controlled option values such as metal, karat, finish, stone configuration, and nominal size;
- pricing inputs/output and lead time;
- base viewer/mesh-map configuration;
- optional Refrakt `customizable` constraints;
- dimensions and production properties required to make that configuration.

Ring rules:

- A ring Variant has exactly one nominal `ringSize`.
- It may declare `sizingAllowance: { min, max }` when the physical design can safely be resized in
  that range.
- A requested size inside the allowance may use the Variant's production path, but the resulting
  Piece records its exact requested size.
- A requested size outside the allowance is a special request. It requires a new Piece and explicit
  production review; it is never represented as if the existing physical Piece can be resized without
  limit.
- Non-ring Variants omit ring sizing fields.

Refrakt `ConfiguratorSetup` authors the constrained choices on a base Variant. A shopper selection is
stored as an immutable resolved-configuration snapshot on the cart/order/Piece. It does not create a
permanent catalog Variant automatically.

## 7. Pieces, Offers, And Availability

A Piece references both `designID` and `variantId`, plus the immutable configuration actually made.
It records exact size, materials, stones, work orders, production state, actual COGS, serial/edition
number, images/certificates, custody, and availability.

Offer rules are computed per Variant/configuration:

- `ready_to_ship` exists only when a matching Piece has `status: available`.
- Planned, in-production, reserved, sold, scrapped, and returned Pieces never count as ready to ship.
- `made_to_order` is available while the Design has uncommitted edition capacity and its production
  requirements pass.
- Every Refrakt-customized purchase is made to order and stores the resolved selection.
- The same Product page may offer an exact ready-to-ship Piece and a separate customize/made-to-order
  path.
- A paid made-to-order purchase atomically claims committed capacity and creates a `planned` Piece with
  the selected configuration. It does not count as an allocated/made edition until physical production
  begins.

## 8. Edition Accounting

Edition policy belongs to the Design and applies across all Variants and custom configurations.

- `one_of_one`: cap 1.
- `limited`: owner-selected positive cap.
- `unlimited`: no production cap.

An edition slot is reserved when physical production begins, not when a draft/planned Piece is first
created. Starting production and allocating the edition number must be atomic. Once physical work has
begun, the number is never reused, including when a Piece is later scrapped. Cancelling before
production begins releases the unallocated plan without consuming a number.

Limited editions track `committed` separately from `allocated`. Paid checkout succeeds only when an
atomic update proves `allocated + committed < limit`; it then increments `committed`. Production start
atomically converts that commitment into an allocation and edition number. Cancellation/refund before
production decrements `committed`. Manual production without an order allocates only when the same cap
check succeeds. Storefront remaining capacity is `limit - allocated - committed`, so the Product cannot
oversell while only physically started Pieces count as made.

## 9. CAD Request Workflow

Do not restore a separate `designRequests` customer/domain collection. A CAD request is a Design
workflow plus CAD work orders on the shared bench.

1. Admin or artisan saves a Design draft with sketches/references and a CAD brief.
2. `Request CAD` validates the brief and creates CAD work order(s) sourced from the Design.
3. The creator may assign a specific CAD artisan or publish the work to the open CAD queue.
4. CAD work uploads revisioned STL, then GLB and mesh mapping.
5. Peer QC approves or returns each gate for revision; the author cannot approve their own work.
6. Approved artifacts attach to the Design and unlock CAD-backed pricing/manufacturing/listing gates.

Reuse custom-order assignment, upload, QC, labor-credit, and notification behavior. The customer record
and billing branch remain exclusive to custom orders.

Collaborator roles and visible credit live on the Design. Revenue percentages live in a separate,
versioned collaboration agreement so financial terms have their own approval and audit history.

## 10. Production Methods

| Method | CAD | Refrakt | Casting | Piece creation |
|---|---|---|---|---|
| `cad_cast` | STL + GLB/mesh map as required | optional; required for customizer | normal casting path | automatic from purchase or manual from Design |
| `handmade` | skipped | skipped | skipped unless explicitly added | manual or automatic MTO Piece with manual routing |
| `hybrid` | requirements declared per Design | optional | requirements declared per Piece | normal Design-to-Piece path |

Handmade work still uses Design, Variant, Piece, work-order, COGS, and edition accounting. It skips only
the inapplicable CAD/Refrakt/casting gates.

## 11. Admin Information Architecture

```text
Products
  Catalog
  Drops
  Collections
  Gemstones

Production
  Casting
```

- Designs and Pieces remain domain entities but are managed inside a Drop detail workspace or through
  contextual links from Catalog/Design/Product records. They are not primary navigation pages.
- Backlog/evergreen Designs without a Drop remain reachable from Catalog search and a focused internal
  view, not a permanent top-level nav item.
- Create/edit Drop, Design, Piece, Product, and Collection workflows are full pages.
- Dialogs are limited to confirmations and short atomic actions.

## 12. Preview Review Contract

Every feature preview must use an isolated writable database with deterministic seed data. It must not
read or mutate production records.

Before a preview can be marked reviewable or merged, BARF must display a review brief containing:

- feature scope and explicit non-scope;
- exact routes to open;
- seeded records and reset behavior;
- step-by-step actions;
- expected result for each action;
- environment/database identity;
- known inherited defects;
- branch, commit, deployment, and build/test evidence.

## 13. Reset And Migration

Existing Drop and Collection records are test data. Snapshot them for rollback/audit, then delete them
and initialize the separate `drops` and `collections` models from clean seed fixtures. Do not write a
compatibility migration that preserves the conflated Collection-equals-Drop shape.

Existing Product/Design/Piece data must be evaluated separately; this reset authorization applies only
to Drop/Collection test data.
