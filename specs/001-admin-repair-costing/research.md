# Phase 0 Research: Admin Repair Costing Demo

## Decisions

- Decision: Hybrid tax calculation (per Line Item when mixed taxability; else invoice-level)
  - Rationale: Supports mixed taxability while keeping simple cases efficient.
  - Alternatives considered: All per-line (more verbose); all invoice-level (less precise with mixed taxability).

- Decision: Invoice-level percentage discount prorated by Line Item pre-discount subtotal
  - Rationale: Standard and fair apportionment; preserves proportionality across items.
  - Alternatives considered: Equal split by count (unfair on value spread); materials-only (policy-specific, rejected for generality).

- Decision: Other direct costs treated as pass-through (no markup)
  - Rationale: Avoids accidental double-charging; simpler policy for a demo.
  - Alternatives considered: Distinct markup rate; category-based policy.

- Decision: Rounding at display precision (2 decimals); internal high-precision arithmetic
  - Rationale: Ensures parent totals match sum of children; avoids drift.
  - Alternatives considered: Per-line hard rounding; banker's rounding at varied stages.

- Decision: Override precedence Step > Process > Line Item > Company defaults
  - Rationale: Most specific context wins; predictable behavior across hierarchy.
  - Alternatives considered: Parent dominance; global-only.

- Decision: Deposits reduce amount due but not taxable base
  - Rationale: Reflects common jurisdiction practice; aligns with demo expectations.
  - Alternatives considered: Reduce taxable base (jurisdiction-specific, excluded for demo).

## Unknowns Resolved

- Technical stack specifics: Defer to existing admin panel; no new technology introduced in planning.
- Storage changes: None required for demo planning; reuse existing models conceptually.
- Testing tools: Use existing project convention; acceptance scenarios in spec define outcomes.

## References

- Feature spec: `specs/001-admin-repair-costing/spec.md`
- Company defaults concept used for markup and taxability fallback.

