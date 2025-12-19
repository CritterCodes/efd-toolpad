# Implementation Plan: Admin Repair Costing Demo

**Branch**: `001-admin-repair-costing` | **Date**: 2025-10-29 | **Spec**: specs/001-admin-repair-costing/spec.md
**Input**: Feature specification from `/specs/001-admin-repair-costing/spec.md`

**Note**: This plan defines documentation-only deliverables for a demo page. No changes to existing code flows or operations.

## Summary

Add an Admin Panel demo page to model jewelry repair estimates using component-specific markups with hierarchical drill-down (Invoice → Line Item → Process → Step). Calculations follow the approved policies: hybrid tax (per Line Item when mixed taxability, else invoice-level), invoice discount prorated by Line Item subtotal, and pass-through other direct costs. Deliverables are planning artifacts only; implementation occurs later.

## Technical Context

**Language/Version**: NEEDS CLARIFICATION (use existing application stack)
**Primary Dependencies**: NEEDS CLARIFICATION (conform to current admin panel dependencies)
**Storage**: Existing project storage; no new schemas required for planning
**Testing**: Existing project test framework; acceptance scenarios defined in spec
**Target Platform**: Linux server (per dev environment)
**Project Type**: Web application with Admin Panel
**Performance Goals**: Recalc visible totals < 1s for ≤ 10 Line Items / 50 Steps
**Constraints**: Must not alter existing code flows or production data
**Scale/Scope**: Single demo page; documentation and contracts only in this phase

## Constitution Check

GATES (must hold before proceeding):
- No modification to existing production workflows or data paths.
- Documentation-first: produce spec, plan, research, data model, contracts, quickstart.
- Test-first mindset: acceptance scenarios defined and measurable success criteria set.
- Simplicity: reuse existing models where possible, avoid introducing new tech.

Result: PASS (all gates satisfied by documentation-only scope).

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-repair-costing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
# No source changes in planning phase. Demo page wiring deferred to implementation.
```

**Structure Decision**: Keep all artifacts under `specs/001-admin-repair-costing/` to isolate work and simplify rollback.

## Complexity Tracking

No constitution violations introduced.
