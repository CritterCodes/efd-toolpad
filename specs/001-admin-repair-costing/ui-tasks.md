# UI Tasks: Admin Repair Costing Demo

## Phase 1: Setup (routing, shell, guard)

- [ ] TUI001 Create demo route shell at frontend/src/pages/admin/demo/RepairCostingPage.tsx
- [ ] TUI002 Add breadcrumb and demo badge in frontend/src/pages/admin/demo/RepairCostingPage.tsx
- [ ] TUI003 Add GuardedRoute wrapper at frontend/src/components/admin/GuardedRoute.tsx
- [ ] TUI004 Wire route `/admin/demo/repair-costing` in frontend/src/pages/admin/routes.ts

## Phase 2: Core components (structure only)

- [ ] TUI005 [US1] Create EstimateTree in frontend/src/components/repair-costing/EstimateTree.tsx
- [ ] TUI006 [US1] Create DetailPanel in frontend/src/components/repair-costing/DetailPanel.tsx
- [ ] TUI007 [US1] Create TotalsSummary in frontend/src/components/repair-costing/TotalsSummary.tsx
- [ ] TUI008 [P] [US1] Add DrilldownView in frontend/src/components/repair-costing/DrilldownView.tsx

## Phase 3: Forms & validation

- [ ] TUI009 [US1] Implement Step form fields in DetailPanel (materialsCost, laborHours, laborBaseRate, materialMarkupRate, laborMarkupRate, otherDirectCosts) in frontend/src/components/repair-costing/DetailPanel.tsx
- [ ] TUI010 [US1] Implement Process/LineItem overrides & discounts in frontend/src/components/repair-costing/DetailPanel.tsx
- [ ] TUI011 [US1] Add required field validation and inline errors in frontend/src/components/repair-costing/DetailPanel.tsx

## Phase 4: State & API wiring

- [ ] TUI012 [US1] Initialize client state (hierarchy) in frontend/src/pages/admin/demo/RepairCostingPage.tsx
- [ ] TUI013 [P] [US1] Wire POST /estimates to create estimate in frontend/src/services/repairCostingApi.ts
- [ ] TUI014 [P] [US1] Wire POST /estimates/{id}/line-items in frontend/src/services/repairCostingApi.ts
- [ ] TUI015 [P] [US1] Wire POST /line-items/{id}/processes in frontend/src/services/repairCostingApi.ts
- [ ] TUI016 [P] [US1] Wire POST /processes/{id}/steps in frontend/src/services/repairCostingApi.ts
- [ ] TUI017 [US1] Map server responses to state and refresh tree in frontend/src/pages/admin/demo/RepairCostingPage.tsx

## Phase 5: Recalculate & totals

- [ ] TUI018 [US3] Wire POST /estimates/{id}/recalculate in frontend/src/services/repairCostingApi.ts
- [ ] TUI019 [US3] Render server totals in TotalsSummary with currency formatting in frontend/src/components/repair-costing/TotalsSummary.tsx
- [ ] TUI020 [US3] Add Recalculate button and loading states in frontend/src/pages/admin/demo/RepairCostingPage.tsx

## Phase 6: Overrides and drilldown

- [ ] TUI021 [US2] Show effective rate resolution (Step > Process > Line Item > Company) in DrilldownView in frontend/src/components/repair-costing/DrilldownView.tsx
- [ ] TUI022 [US2] Support Process-level override editing and update flow in frontend/src/components/repair-costing/DetailPanel.tsx

## Phase 7: UX states & a11y

- [ ] TUI023 Add empty state prompt to add first Line Item in frontend/src/pages/admin/demo/RepairCostingPage.tsx
- [ ] TUI024 Add keyboard navigation for EstimateTree in frontend/src/components/repair-costing/EstimateTree.tsx
- [ ] TUI025 Ensure focus management after add/remove in frontend/src/components/repair-costing/EstimateTree.tsx

## Phase 8: Polish & telemetry (optional)

- [ ] TUI026 Add spinners and error banners for API calls in frontend/src/components/repair-costing/*
- [ ] TUI027 Add basic telemetry hooks (recalc duration) in frontend/src/services/repairCostingTelemetry.ts
- [ ] TUI028 Review copy, labels, units; ensure clarity in frontend/src/components/repair-costing/*

## Dependencies (Story Order)

1. US1 → 2. US2 → 3. US3

## Parallel Execution Examples

- TUI013–TUI016 in parallel (API wiring)
- TUI018–TUI020 proceed after US1 wiring complete

## Independent Test Criteria

- US1: Create estimate with 1 LI → 1 PROC → 1 STEP; totals render; drilldown shows inputs and derived values
- US2: Apply Process-level laborMarkupRate override; child Step totals update after Recalculate
- US3: Set 10% invoice discount, labor non-taxable; Recalculate updates taxable base, tax, and amount due
