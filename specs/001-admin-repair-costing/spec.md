# Feature Specification: Admin Repair Costing Demo

**Feature Branch**: `001-admin-repair-costing`  
**Created**: 2025-10-29  
**Status**: Draft  
**Input**: User description: "I would like to use the suggested formulas and work flow to incorporated into the existing application in the admin panel using a new page. IMPORTANT!! MAke no changes to the existing code flow or operation. You are allowed to use any applicable data models in hte project that already exist. This is only for development testing and to show the client potential changes. DOCUMENT every thing and prepare a rollabck strategy usign git branching to avoid stompoming on this branch."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create draft repair costing (Priority: P1)

An admin user can create a draft repair estimate by adding one or more Line Items (e.g., Ring Resize, Rhodium Plating). Each Line Item can contain Processes and Steps with materials, labor hours, and optional other direct costs. The system calculates prices using component-specific markups and shows rollups at Step → Process → Line Item → Invoice levels.

**Why this priority**: Enables primary value demonstration of the costing model without altering existing flows.

**Independent Test**: Start a new estimate, add a single Line Item with one Process and one Step, enter inputs, and verify computed totals and drill-down.

**Acceptance Scenarios**:

1. **Given** an empty estimate, **When** the admin adds a Line Item with one Process and one Step and enters materials cost, labor hours, base rate, and markup rates, **Then** the system displays calculated Step, Process, Line Item, and Invoice subtotals and totals.
2. **Given** a Line Item with multiple Steps, **When** the admin updates a Step’s material markup rate override, **Then** the Step total updates and rollups immediately reflect the change without affecting unrelated Steps.

---

### User Story 2 - Drill-down audit and overrides (Priority: P2)

An admin can drill down from Invoice → Line Item → Process → Step to view inputs, derived component prices, discounts, taxable base, tax, and totals, and can apply overrides (rates, taxability, discounts) at any level, with most-specific override winning.

**Why this priority**: Provides transparency and control for client review and internal QA.

**Independent Test**: Open a saved estimate, expand its hierarchy fully, verify inputs/outputs consistency, apply a Process-level override, and confirm effective rates recalculate correctly.

**Acceptance Scenarios**:

1. **Given** a Line Item with default company markup rates, **When** a Process-level labor markup override is applied, **Then** all child Steps of that Process use the override unless they have Step-level overrides.

---

### User Story 3 - Tax, discounts, and amount due (Priority: P3)

An admin can set discount (flat or rate) at Line Item or Invoice level and configure taxability flags for materials, labor, and other costs, with taxes computed on the post-discount taxable base. Deposits (if any) are applied to amount due but do not change the taxable base.

**Why this priority**: Reflects real-world quoting and compliance expectations for jewelry services.

**Independent Test**: Apply a 10% invoice-level discount, set labor non-taxable, materials taxable, and verify tax calculation bases and final amount due.

**Acceptance Scenarios**:

1. **Given** an invoice with taxable materials and non-taxable labor, **When** a Line Item discount is applied, **Then** the materials’ taxable base is reduced proportionally while labor remains non-taxable, and invoice tax equals the sum of taxable portions × tax rate.

---

### Edge Cases

- Zero material cost with positive markup rate should yield zero materials price (no negative or phantom amounts).
- Zero labor hours at any base rate yields zero labor price; overrides must not introduce non-zero values.
- Mixed taxability across Steps within a Process correctly aggregates taxable base without double counting.
- Discount stacking: if both Line Item and Invoice discounts exist, Invoice discount applies to the post-Line Item discounted subtotal only.
- Rounding strategy ensures sum(children) equals parent totals at displayed precision.
 - Display examples will be provided to illustrate rounding at line vs invoice levels.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a new Admin Panel page accessible only to authorized admin users that does not alter existing application behavior.
- **FR-002**: The page MUST allow creating an Estimate with one or more Line Items, each containing Processes and Steps.
- **FR-003**: Each Step MUST accept inputs: materialsCost, laborHours, laborBaseRate, optional otherDirectCosts, materialMarkupRate, laborMarkupRate, and taxability flags.
- **FR-004**: For each Step, the system MUST compute: materialsPrice = materialsCost × (1 + materialMarkupRate); laborCost = laborHours × laborBaseRate; laborPrice = laborCost × (1 + laborMarkupRate); stepSubtotal = materialsPrice + laborPrice + otherDirectCosts.
- **FR-005**: The system MUST aggregate Step values to Process, Line Item, and Invoice levels, honoring override precedence: Step > Process > Line Item > Company default.
- **FR-006**: The system MUST support optional discounts at Line Item and Invoice levels (flat amount or percentage) and compute taxes only on the post-discount taxable base per taxability flags.
- **FR-007**: The system MUST support deposits/retainers as payments applied to amount due without changing taxable base.
- **FR-008**: The system MUST allow drill-down to view inputs, derived values, effective rates, discounts, taxable base, tax, and totals at every level.
- **FR-009**: The system MUST apply rounding consistently so that the sum of displayed children equals the displayed parent totals.
- **FR-010**: The system MUST not modify or depend on existing production workflows; this page is for demonstration and testing only, using existing data models where applicable.

Resolved policy decisions:

- **FR-011**: Taxes MUST be computed using a hybrid rule: per Line Item if mixed taxability exists across Line Items; otherwise compute at the Invoice level on the aggregated taxable base.
- **FR-012**: Invoice-level percentage discounts MUST be prorated across Line Items by each Line Item’s pre-discount subtotal.
- **FR-013**: otherDirectCosts MUST be treated as pass-through (no markup applied).

- **FR-014**: Demo data MUST be persisted as draft, non-production-flagged entities that are excluded from all live operational flows, reports, and customer-facing surfaces.
- **FR-015**: Where existing models are reused, a non-production/demo flag MUST be set; reads/writes from production paths MUST filter these out.

### Key Entities *(include if feature involves data)*

- **Estimate**: Top-level collection of Line Items; holds invoice-level discounts, deposits, tax configuration, creation metadata, status (draft).
- **LineItem**: Represents a parent repair task (e.g., Ring Resize); holds defaults for markup rates and taxability; contains Processes; has subtotals, discounts, tax, totals.
- **Process**: Logical grouping of Steps (e.g., "Solder new bar"); may provide overrides for rates/taxability; aggregates Step results.
- **Step**: Atomic sub-process; captures inputs (materialsCost, laborHours, laborBaseRate, otherDirectCosts, materialMarkupRate, laborMarkupRate, taxability flags) and derived outputs.
- **Company Defaults**: Global defaults for materialMarkupRate, laborMarkupRate, laborBaseRate, and default taxability flags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can create a draft estimate with one Line Item and at least one Process and Step in under 2 minutes with accurate computed totals.
- **SC-002**: Drill-down displays match underlying calculations within rounding rules 100% of the time across 10 representative scenarios.
- **SC-003**: Applying or changing overrides (rates, taxability, discounts) recalculates totals in under 1 second for estimates with up to 10 Line Items and 50 Steps.
- **SC-004**: No changes to existing application flows, data mutations, or user roles outside the new Admin page (verified via smoke tests on primary paths).

### Assumptions

- Component-specific markups are preferred over a global business markup.
- Taxes are applied to the post-discount taxable base; labor may be non-taxable depending on jurisdiction.
- Rounding is to currency precision (2 decimals) at display; internal computations use higher precision.
- Existing data models for items, pricing, or admin roles can be reused for this demo page without migration.

### Constraints

- This feature must not alter existing code flows or data used by production processes.
- Page is accessible only in Admin Panel and clearly labeled as a demo/preview.

## Clarifications

### Session 2025-10-29

- Q: Should demo estimates persist, and if so, how? → A: Persist as draft, non-production flagged entities excluded from live ops (Option B).


