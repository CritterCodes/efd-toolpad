# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **On-site artisans (the shop floor).** Jewelers at the bench in Fort Smith: they claim repairs and work orders, scan
  QR tags, move jobs between bench lanes, and send them to QC. They use it on a phone or a bench tablet, often with
  dirty hands, standing up, mid-job. There is no separate "staff" role: the artisans are the staff
  (`docs/APP_SURFACE_MAP.md`, `staffCapabilities`).
- **The owner (admin).** He runs intake, pricing, QC approval, payroll, invoicing, settings, and the catalog (Designs,
  Pieces, Drops, Collections, Gemstones). He moves between the bench, the counter, and a desk.
- **Wholesale stores** (jewelers, pawn shops). They create and price their own repair tickets, request quotes, and
  track jobs and invoices through the wholesale portal.
- **Off-site artisans** (CAD designers, gem cutters, makers). They take discipline-specific work orders, upload CAD and
  GLB files, and manage their own listings and payouts.
- **Apprentices.** They clock time on an hourly ladder rung and never hold a job.

## Product Purpose

efd-admin is Engel Fine Design's operations system: repair intake through bench, QC, invoicing and pickup or
shipping; custom orders and production (CAD, casting, work orders); the catalog the shop sells from; and the people
side (payroll, Connect payouts, the pay ladder, capabilities). Success is a job that moves from the counter to the
customer without anyone re-typing it, asking where it is, or doing math the system should have done.

## Positioning

The platform is free and curated (invite only). EFD earns only on facilitated infrastructure (the work-order markup)
and on consignment sales through EFD, never as rent on tools or on an artisan's own work. One pricing engine: every
price is calculated live from materials, labor and settings and never stored.

## Operating Context

- Repairs move through bench lanes (My Bench), QC, and invoicing; a QR scan on a job tag is the fastest path.
- Store check-in, retail pickup, FedEx shipping via EasyPost, and payment through efd-shop's cart (never in admin).
- Work Orders are the bookkeeping spine for repairs, customs and pieces; labor is credited at QC pass.
- The shop's storefront (efd-shop) shares the brand and reads Designs and Pieces as the catalog. Products are
  machine-made projections; nobody authors a Product.

## Capabilities and Constraints

- Next.js 15, MUI v6 themed in `src/lib/theme.js`, plus MUI-free facelift primitives in `src/components/facelift`.
  CI gates lint, tests, build, and a signed-in views crawl of every page, per role, on phone and desktop.
- Every page works from 320px up with no horizontal page scroll; tables scroll inside their container.
- Touch targets are at least 44px and text inputs are 16px, so iOS doesn't zoom.
- Print and email output stays ink on white.
- Nothing is deleted or retired without the owner's yes, informed by usage evidence (`scripts/usage-report.mjs`).

## Brand Commitments

- **Black and white are EFD's brand colors (owner, 2026-10-01).** Gold is the single accent, used for the primary
  action and the current place. Users know this look: refine it, don't rock it.
- The look is shared with efd-shop: near-black ground, white type, gold, Space Grotesk, IBM Plex Mono labels.
- The voice is plain and direct, the owner's own words: say what happened and what to do next.

## Evidence on Hand

- The views contact sheet (CI artifact `views-contact-sheet`) captures every page per role, on phone and desktop.
- `docs/design/ui-audit-admin-2026-07-09.md` and `docs/APP_SURFACE_MAP.md` map what exists.
- There is no page-usage data before 2026-10-01. The first usage report is due 2026-10-31.

## Product Principles

1. The bench comes first: the fastest path for a jeweler with a job in hand wins over a complete screen.
2. Every number names the decision it supports, or it goes.
3. Calculated, never stored: prices, totals and statuses come from one source.
4. Show the narrowed options and let people tap; don't hide eleven choices behind a search box.
5. Improve, never regress: a rebuild matches or beats what it replaces in form and function.

## Accessibility & Inclusion

- WCAG AA contrast on the dark ground (secondary text is at least `rgba(255,255,255,0.66)`).
- 44px touch targets, and usable one-handed on a phone.
- Status is never carried by color alone: chips carry text.
