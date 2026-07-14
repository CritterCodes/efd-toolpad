# Manufacturing / Production Cycle

This is the design home for EFD's move from a repair-only shop system to a unified
**production + custom + repair + marketplace** platform. Everything here is the agreed
design; code is built sprint-by-sprint (see [sprints.md](./sprints.md)).

> **Anti-drift rule:** [data-model.md](./data-model.md) is the single source of truth for
> every collection and field. Any sprint that changes data **must update data-model.md in
> the same PR**. If a structure isn't in that file, it doesn't exist. Don't invent new shapes
> mid-sprint — change the doc first, then the code.

> **Catalog-domain rule:** [catalog-domain.md](./catalog-domain.md) is authoritative for Drops,
> Collections, Designs, Variants, Pieces, Products, availability, edition limits, CAD requests, and
> admin information architecture. The older Collection-equals-Drop and `concept` terminology is
> superseded.
>
> Current implementation planning: [production-revision-plan.md](./production-revision-plan.md).
> Smart Collection schema: [smart-collection-data-contract.md](./smart-collection-data-contract.md).

---

## The thesis

> **Labor is labor, regardless of where it came from. Only _billing_ cares about the source.**

A jeweler's (or CAD designer's, or engraver's) hour is worth the same whether it's spent on a
repair, a showcase piece, a custom commission, or a resize attached to a sale. So the bench,
labor review, and payroll are **source-agnostic** — they operate on a single unit, the
**Work Order**. The _source_ (repair / production piece / custom / sale) owns the customer
relationship and how (or whether) that work is billed.

## The convergence

```
 repairs ───┐
 production ─┤
 customs ───┼──► Work Order ──► My Bench ──► Labor Review ──► Payroll / Payouts
 sales ─────┘     (discipline-gated bench unit)                      ▲
   │                                                                  │
   └── artisan/marketplace sale ── payout (sale − EFD fee) ───────────┘
```

- **My Bench** is one queue, **gated by discipline**: a work order's `discipline` must match
  the user's `artisanTypes`. Off-lane work is fully hidden. (Owner unrestricted; admins may
  assign across lanes.)
- **Payroll/Payouts** is one system fed by three streams: labor (bench hours), owner draws,
  and marketplace/consignment artisan payouts.

## Three layers (do not conflate)

| Layer | Question it answers | Owns | Customer-facing | Cost concept |
|---|---|---|---|---|
| **Design** | *What may we make and sell?* (variants, CAD, BOM, routing, edition) | the reusable spec / IP | indirectly through Product | **estimated** cost |
| **Piece** | *Does this physical object exist? what did it cost? where is it?* | the unit + COGS + availability | indirectly (it's what ships) | **actual** COGS |
| **Product** | *What's for sale, at what price?* | the listing + price | yes | **price** |

- Design **1→N** Variants and **1→N** Pieces. A Variant is one concrete base configuration/SKU;
  every Piece records the Variant and exact resolved configuration that was made. Product **1→N**
  Pieces. Links remain optional for custom-only Pieces and loose-gemstone Products.
- **COGS lives on the Piece. Price lives on the Product.**
- **No finished-goods inventory system.** "In stock" is *derived* from Piece status. The old
  `inventory*` collection **data** is junk and gets dropped in S0. **Materials-inventory** (stock
  of *supplies* — solder, wire, findings — for cost management) is a *separate* concept: not
  products, not pieces. It is **parked indefinitely**; for now materials are cost-capture only.

## Locked decisions (don't relitigate)

- **D1** — Full **Work Order extraction**, not parallel per-source silos. The bench/labor/payroll
  operate only on work orders.
- **D2** — **Per-piece instances.** Each physical object is a Piece with its own serial + COGS.
- **D3** — **Customs reuse the production engine** (Design + Piece) + a customer + billing.
- **D4** — **Billing modes** live on the source: `retail | wholesale | internal | comped`.
  `internal`/`comped` zero the *customer* price but **never** the labor payout.
- **D5** — **Design → Piece → Product**, 1:N, optional linking both ways. COGS on Piece, price on Product.
- **D6** — **Finished-goods availability = derived from Piece status** (no finished-goods store).
  Old `inventory*` data dropped (junk). **Materials-inventory** (supply stock for cost mgmt) is a
  distinct concept — not products, not pieces — and is **parked indefinitely**; materials = cost-capture only for now.
- **D7** — **Fees priced on services rendered**, not channel. Pillars: Storefront / Custody /
  Fulfillment. Consignment & marketplace are two ends of one continuum. Rates are
  admin-configurable and **deferred** (not set yet).
- **D8** — **Marketplace/artisan payouts converge** into the unified payout/payroll system.
- **D9** — **Discipline-gated bench.** `workOrder.discipline` ↔ `user.artisanTypes`. Off-lane
  work fully hidden. Owner unrestricted; admins assign across lanes.
- **D10** — **CAD & custom design work are work orders too** (CAD Designer lane). Multi-stage
  routing distributes a piece's work orders across the right disciplines/benches.
- **D11** — **Drop and Collection are separate.** A Drop owns Designs and coordinates a release;
  a Collection is a smart merchandising view over Products.
- **D12** — **No `concept` type.** A Design without an available Piece is sold as made to order.
- **D13** — **Edition limits live on Design** and span all Variants/custom configurations. Capacity
  is consumed atomically when physical production begins.
- **D14** — **Availability is offer-specific.** Ready to ship requires a matching `available` Piece;
  Refrakt-configured purchases are made to order.

## Continuity constraints (no regressions)

- **`customTickets` (custom requests) must not break.** S7 is a *graceful* rewrite onto the new
  spine where every current function persists (audit-first; see sprints).
- **`products` is being rewritten** (S5); current data is disposable trash.
- **cad-requests are absorbed** into the Design flow (S3); only the orphaned cross-DB wrappers die.

## Parked (recorded so we don't forget — not scoped now)

- **Materials-inventory** — supply-stock tracking (solder, wire, findings) for repair/production
  **cost management**. Distinct from products and pieces. **Parked indefinitely.** Current
  `inventory*` data is junk and dropped in S0.
- Gemstone-listed-by-artisan + custom-design-on-a-gemstone flow (the current orphaned
  gemstone/CAD-request seed). Redesign down the road.

## Glossary

- **Work Order (WO)** — source-agnostic unit of bench work; generates labor logs; has a `discipline`.
- **Discipline** — skill lane of a WO (`bench_jewelry | cad | engraving | gem_cutting`), matched to `artisanTypes`.
- **Drop** — a production/release workspace that owns Designs and publishes eligible listings together.
- **Collection** — a smart/manual merchandising view over Products; not a production container.
- **Design** — reusable jewelry spec + IP with edition policy, Variants, optional CAD, BOM, and routing.
- **Variant** — one concrete base configuration/SKU of a Design; ring size is a Variant property.
- **Piece** — one physical instance; carries actual COGS and availability status.
- **Billing mode** — how a source is charged: `retail | wholesale | internal | comped`.
- **Fee pillars** — Storefront / Custody / Fulfillment; compose into consignment↔marketplace fees.

## Dev, staging & migration environments

Three databases on the same self-hosted Mongo (logical isolation):

| DB | Role |
|---|---|
| `efd-database` | **production** — only ever targeted by the final cutover |
| `efd-database-DEV` | **canonical dev** — full clone of prod; where we build & iterate each sprint |
| `efd-db-migrate` | **migration staging** — fresh clone of prod used to rehearse the hardened prod migrations end-to-end before touching real prod |

Tooling:
- `scripts/clone-prod-to-dev.mjs` — clone prod → a target DB (guarded; refuses to write prod).
  Re-clone DEV, or stage via `CLONE_TARGET_DB=efd-db-migrate`.
- `scripts/migrations/` — **one hardened, idempotent migration per sprint** (`s0-workorder-spine.mjs`, …)
  built on `_lib.mjs`. Each supports `--dry-run`, takes a pre-flight `mongodump` backup before any write,
  and guards the target (only `efd-database-DEV` / `efd-db-migrate`, or prod with
  `MIGRATE_ALLOW_PROD=YES_I_AM_SURE`; `--skip-backup` is blocked on prod).

**Cutover model:** iterate on DEV each sprint → at the end, clone prod → `efd-db-migrate` and run every
sprint's hardened migration there for real to rehearse → then run on prod (with backup) in lockstep with
deploying the branch. Migrations are additive/renames (no data deletion) and re-runnable.
