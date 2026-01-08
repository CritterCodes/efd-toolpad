# Tasks: Admin Repair Costing Demo

## Phase 1: Setup

- [X] T001 Confirm branch and isolation policy in specs/001-admin-repair-costing/plan.md
- [X] T002 Add demo/non-production flags acceptance notes to specs/001-admin-repair-costing/spec.md (already added)
- [X] T003 Ensure agent context updated for this feature in .cursor/rules/specify-rules.mdc

## Phase 2: Foundational

- [X] T004 Define demo data segregation rules in specs/001-admin-repair-costing/data-model.md
- [X] T005 Map OpenAPI endpoints to user stories in specs/001-admin-repair-costing/contracts/openapi.yaml

## Phase 3: User Story 1 – Create draft repair costing (P1)

Goal: Admin creates a draft estimate with Line Items, Processes, Steps; prices computed with component-specific markups; rollups visible.
Independent test: Create 1 Line Item → 1 Process → 1 Step and verify totals and drill-down.

- [X] T006 [US1] Document Step input fields in specs/001-admin-repair-costing/data-model.md
- [X] T007 [US1] Document rollup formulas in specs/001-admin-repair-costing/data-model.md (Step→Process→LineItem→Invoice)
- [X] T008 [P] [US1] Detail POST /estimates request/response in specs/001-admin-repair-costing/contracts/openapi.yaml
- [X] T009 [P] [US1] Detail POST /estimates/{estimateId}/line-items in specs/001-admin-repair-costing/contracts/openapi.yaml
- [X] T010 [P] [US1] Detail POST /line-items/{lineItemId}/processes in specs/001-admin-repair-costing/contracts/openapi.yaml
- [X] T011 [P] [US1] Detail POST /processes/{processId}/steps in specs/001-admin-repair-costing/contracts/openapi.yaml
- [X] T012 [US1] Add quickstart example for US1 flow in specs/001-admin-repair-costing/quickstart.md

## Phase 4: User Story 2 – Drill-down audit and overrides (P2)

Goal: Admin drills into hierarchy; applies overrides with precedence Step > Process > Line Item > Company.
Independent test: Apply Process-level override; verify effective rates.

- [X] T013 [US2] Specify override precedence examples in specs/001-admin-repair-costing/data-model.md
- [X] T014 [US2] Add effective-rate resolution notes to specs/001-admin-repair-costing/spec.md Requirements
- [X] T015 [P] [US2] Add example payloads showing overrides in specs/001-admin-repair-costing/contracts/openapi.yaml
- [X] T016 [US2] Add quickstart example demonstrating override recalculation in specs/001-admin-repair-costing/quickstart.md

## Phase 5: User Story 3 – Tax, discounts, amount due (P3)

Goal: Apply discounts and hybrid tax; deposits affect amount due only.
Independent test: 10% invoice discount, labor non-taxable; verify bases and amount due.

- [X] T017 [US3] Document discount prorating rules in specs/001-admin-repair-costing/spec.md (FR-012 reference)
- [X] T018 [US3] Document hybrid tax examples and taxable base composition in specs/001-admin-repair-costing/spec.md
- [X] T019 [P] [US3] Add POST /estimates/{estimateId}/recalculate response schema fields in specs/001-admin-repair-costing/contracts/openapi.yaml
- [X] T020 [US3] Add quickstart example for discounts and tax in specs/001-admin-repair-costing/quickstart.md

## Final Phase: Polish & Cross-cutting

- [X] T021 Add rounding policy examples (display vs internal precision) to specs/001-admin-repair-costing/spec.md
- [X] T022 Add edge case examples to specs/001-admin-repair-costing/quickstart.md
- [X] T023 Review consistency of terms across all docs (materials, labor, overrides)

## Dependencies (Story Order)

1. US1 → 2. US2 → 3. US3

## Parallel Execution Examples

- T008, T009, T010, T011 can proceed in parallel.
- T015 and T019 can proceed in parallel after US1 contracts exist.

## Implementation Strategy

- MVP: Complete Phase 3 (US1) to demonstrate end-to-end calculation and rollups.
- Iterate: Add overrides (US2), then discounts/tax (US3).
