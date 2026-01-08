# Quickstart: Admin Repair Costing Demo

This demo is documentation-only. It introduces a new Admin Panel page concept for jewelry repair estimates with component-specific markups and hierarchical drill-down.

## What to Review
- `spec.md`: Feature goals, user stories, requirements, success criteria
- `plan.md`: Implementation plan and constitution gates
- `research.md`: Decisions, rationale, alternatives
- `data-model.md`: Conceptual entities and invariants
- `contracts/openapi.yaml`: API contract for demo workflows

## Policies Implemented
- Hybrid tax: per Line Item if mixed taxability; otherwise invoice-level
- Invoice discount: prorated by Line Item pre-discount subtotal
- Other direct costs: pass-through (no markup)
- Override order: Step > Process > Line Item > Company defaults
- Rounding: internal high precision, display at currency precision

## Rollback Strategy
- Work isolated on branch `001-admin-repair-costing`
- To exit: `git checkout <your-main-branch>`
- To delete local: `git branch -D 001-admin-repair-costing`
- To delete remote (if pushed): `git push origin --delete 001-admin-repair-costing`

## Next Commands
- Clarify or update spec/plan if needed
- Proceed to implementation only after stakeholder approval

## UI Demo Navigation
- Admin route: `/admin/demo/repair-costing`
- Breadcrumb: Admin → Demo → Repair Costing

## Examples

### US1: Create basic estimate
1) POST /estimates → 201
2) POST /estimates/{id}/line-items { name: "Ring Resize" }
3) POST /line-items/{id}/processes { name: "Solder new bar" }
4) POST /processes/{id}/steps { inputs: materialsCost: 75, laborHours: 1.5, laborBaseRate: 80, materialMarkupRate: 0.35, laborMarkupRate: 0.5, otherDirectCosts: 10 }
5) POST /estimates/{id}/recalculate → totals with rollups

### US2: Override precedence
- Set LineItem laborMarkupRate=0.5; Process override laborMarkupRate=0.6; Step unset → effective 0.6
- Set Step materialMarkupRate=0.40 → Step uses 0.40; siblings use parent defaults

### US3: Discounts and hybrid tax
- Apply invoice discount 10% (prorated by LineItem subtotal)
- Labor non-taxable; materials taxable
- Recalculate → verify taxableBase excludes labor, tax based on materials only; amountDue = total − deposit

### Edge Cases
- Zero materials or labor yields zero price for that component
- Mixed taxability across line items → sum per-line taxes (hybrid rule)
