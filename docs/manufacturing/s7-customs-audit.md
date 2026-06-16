# S7 — Customs: pre-work audit + no-regression checklist

The S7 plan required auditing the existing custom-ticket flow before any change. This is that
audit. **Finding: `customTickets` is a large, mature, production MVC system**, not a thin feature —
so S7 is re-scoped from "rewrite onto Design+Piece" to **additive integration that preserves every
function below.** A full rewrite would be high-risk and mostly redundant (most of this is orthogonal
to the production engine).

## Where it lives
- API: `src/app/api/custom-tickets/**` (CRUD, status, assign-artisan, communications, invoices,
  payment-progress, create-deposit/final-order, summary, analytics) + an embedded service/microservice
  layer (`services/{crud,status,assignments}.service.js`, `invoices/service.js`).
- Service facade: `src/app/api/custom-tickets/service.js`. Legacy: `model.legacy.js`,
  `controller.legacy.js` (superseded).
- UI: `src/app/dashboard/custom-tickets/**` — list + tabbed detail (Overview, Timeline, Notes, Images,
  Quote, Communications, Invoices, Assignments) + financials editor.

## No-regression capability checklist (acceptance criteria)

**Ticket lifecycle:** create · read · list (paginated, filter by type/status/priority/payment/date/
artisan) · update · update-status (validated + `statusHistory` + notify) · delete (blocked if invoices
or completed) · summary stats.

**Status:** record history (`status/changedAt/changedBy/reason`) · validate transitions · days-in-status.

**Artisan assignment:** assign (snapshot `customDesignFee` + business/name/slug/artisanType; multi-artisan)
· remove · per-artisan ticket list · filter-by-artisan. Snapshots must persist (not re-looked-up).

**Communications:** add message (text/sender/recipient) · upload images (base64→S3) · add link · retrieve.

**Financials:** material line items (item/qty/unitPrice/cost) · labor cost+hours · casting · shipping ·
design fee · **rush multiplier** · **quote total = (materials + labor×rush + casting + shipping + design)
× 1.40 markup**.

**Invoicing/payments:** create invoice (deposit/progress/final/partial) · status pending→paid→cancelled
(`paidAt`) · **payment progress % of project total** · **50% → production-ready + admin notification** ·
partial payments · list · aggregate paid/pending. **Invoices live in BOTH a separate `invoices` collection
AND an embedded `invoices` array — keep in sync.**

**Notifications (8):** ticket created · status changed · artisan assigned (→ artisan AND client) · new
communication · invoice created · payment received · 50% threshold (→ admin). Multi-channel (IN_APP + EMAIL).

**UI:** list (search/filter/paginate) · tabbed detail · status edit · financials edit (live total) ·
assignment add/remove · status timeline · notes · images · communications · invoice create + progress ·
quote breakdown · role-based filtering (artisans see only own).

**Data integrity:** email validation · block delete (completed / has invoices) · auto `ticketID`
(`CT-{ts}-{rand}`) · embedded invoice snapshots.

## Re-scoped S7 = additive integration (preserve all of the above)
1. **Engine linkage:** a custom ticket can spawn a **Design + Piece(s)** and route **work orders** across
   disciplines → custom fabrication appears on the unified bench, pays artisans (labor→payroll), and
   accrues **COGS** — *alongside* the ticket's existing assignment/financials, not replacing them.
2. **3D viewer + share link:** add `designModel` + `share` per
   [custom-design-viewer-contract.md](./custom-design-viewer-contract.md) (replaces the Shapr3D `designLink`).
3. **Billing reconcile (light):** the ticket's quote/deposit/invoice system already charges the customer;
   `billing.mode` classification is optional metadata, not a replacement.

## Critical preserve-exactly notes
- 50% payment → production threshold (hardcoded in 3 spots) + admin notification.
- Embedded-vs-collection invoice dual-write sync.
- Artisan fee/metadata snapshot at assignment time.
- 40% markup in the quote calc.
- Role-based row-level filtering (artisan sees only own).
