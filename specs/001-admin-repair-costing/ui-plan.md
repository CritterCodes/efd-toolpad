# UI Demo Plan: Admin Repair Costing

## Scope & Guardrails
- New Admin Panel page for demo only; no changes to existing flows.
- Persist demo entities with `isDemo: true`; exclude from production paths.
- Reuse existing data models/endpoints where possible; otherwise use demo endpoints defined in contracts.
- Admin-only access; clearly labeled as “Demo / Preview”.

## Information Architecture & Navigation
- Entry route: `/admin/demo/repair-costing` (breadcrumb: Admin → Demo → Repair Costing)
- Page layout:
  - Left: Hierarchy tree (Estimate → Line Items → Processes → Steps)
  - Right: Detail panel (contextual form and computed values)
  - Footer: Totals summary bar (subtotal, discounts, tax, amount due)

## Core Components
- EstimateTree
  - Displays tree nodes with add/edit/remove for Line Items, Processes, Steps
  - Shows per-node subtotal; expand/collapse
- DetailPanel
  - Step editor: materialsCost, laborHours, laborBaseRate, otherDirectCosts, materialMarkupRate, laborMarkupRate, taxability flags
  - Process/Line Item editors: overrides, discounts
  - Invoice editor: invoice-level discount, deposit
- TotalsSummary
  - Subtotal, discount, taxable base, tax, total, amount due
  - Recalculate action
- DrilldownView
  - Readout of inputs, derived fields, effective rates, tax base per node
- GuardedRoute
  - Ensures admin-only access and demo labels

## State & Data Flow
- Client state mirrors hierarchy; optimistic updates with explicit Recalculate call.
- Save: POST/PUT to demo endpoints; responses hydrate ids and totals.
- Effective rate resolution on server; UI displays effective values and override sources.
- Rounding: server is source of truth; UI displays server numbers.

## UX Flows mapped to User Stories
- US1 Create draft estimate
  - Create Estimate → Add Line Item → Add Process → Add Step → Recalculate → Show rollups
- US2 Drill-down & overrides
  - Select Process → change laborMarkupRate → Recalculate → Validate child Step totals
- US3 Discounts & hybrid tax
  - Set invoice discount 10% and labor non-taxable → Recalculate → Validate taxable base and amount due

## Error/Empty/Loading States
- Empty: Prompt to add first Line Item
- Validation: Highlight required Step inputs; block Recalculate until valid
- Loading: Button-level spinners for create/recalculate
- Error: Inline error banners with retry; never navigates away

## Accessibility & Internationalization
- Keyboard navigation for tree; focus management after add/remove
- Form controls labeled with units and help text
- Currency formatting localizable; decimals fixed to 2 for display

## Security & Privacy
- Admin-guarded route; no PII beyond admin user identity
- Demo data segregated via `isDemo`

## Telemetry (optional)
- Track Recalculate duration and success
- Track override changes (anonymous counts)

## Success Criteria Alignment
- Recalculate < 1s for target size (client perceived)
- Complete US1 flow < 2 minutes
- Drill-down values match server totals 100%

## Rollback
- Entirely within branch `001-admin-repair-costing`; removal is branch deletion.

## Open Questions
- Language/framework specifics of Admin Panel (follow existing app stack at implementation time)
