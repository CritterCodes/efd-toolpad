# Manufacturing / Production Cycle

This is the design home for EFD's move from a repair-only shop system to a unified
**production + custom + repair + marketplace** platform. Everything here is the agreed
design; code is built sprint-by-sprint (see [sprints.md](./sprints.md)).

> **Anti-drift rule:** [data-model.md](./data-model.md) is the single source of truth for
> every collection and field. Any sprint that changes data **must update data-model.md in
> the same PR**. If a structure isn't in that file, it doesn't exist. Don't invent new shapes
> mid-sprint — change the doc first, then the code.

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
| **Design** | *How do we make it?* (CAD, BOM, routing) | the spec / IP | no | **estimated** cost |
| **Piece** | *Does this physical object exist? what did it cost? where is it?* | the unit + COGS + availability | indirectly (it's what ships) | **actual** COGS |
| **Product** | *What's for sale, at what price?* | the listing + price | yes | **price** |

- Design **1→N** Pieces. Product **1→N** Pieces. Both links **optional** (custom pieces never
  list; digital/gemstone products have no piece).
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
- **Drop** — a production release/collection grouping designs.
- **Design** — reusable manufacturing spec + IP (CAD, BOM, routing, estimated cost).
- **Piece** — one physical instance; carries actual COGS and availability status.
- **Billing mode** — how a source is charged: `retail | wholesale | internal | comped`.
- **Fee pillars** — Storefront / Custody / Fulfillment; compose into consignment↔marketplace fees.

## Dev environment

Canonical dev DB is **`efd-database-DEV`** (uppercase), a full clone of prod on the same
self-hosted Mongo (logical isolation only). Tooling:
- `scripts/clone-prod-to-dev.mjs` — re-clone prod → DEV (guarded against writing to prod).
- `scripts/migrate-manufacturing.mjs` — idempotent Phase-1 (S0) data migration; refuses prod
  unless `MIGRATE_ALLOW_PROD=YES_I_AM_SURE`.
