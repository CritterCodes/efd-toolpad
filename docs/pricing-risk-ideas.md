# Pricing Risk Ideas (Parking Lot)

Date: 2026-03-31

This document captures pricing ideas for later evaluation. None of these are committed as current policy yet.

## Problem Signal
Some repair prices feel too cheap because current pricing may under-account for job risk and downside exposure in jewelry repair.

## Candidate Approach
Use risk-adjusted pricing on top of base labor/material cost.

### 1) Base Cost (keep existing core)
- Base cost = labor + materials + overhead allocation.

### 2) Risk Premium (new)
- Add a risk score per job (example 0-10).
- Candidate premium: base cost * (riskScoreNormalized * riskRate).
- Inputs to risk score could include:
  - stone fragility
  - age/condition uncertainty
  - prior repair history/unknown workmanship
  - customer-supplied stones/materials
  - complexity and access risk

### 3) Rework/Warranty Reserve (new)
- Add a reserve percentage to absorb rework/callback reality.
- Candidate reserve: base cost * reserveRate.

### 4) Margin Floor + Minimums (strong guardrail)
- Enforce minimum gross margin floor, not only minimum dollar price.
- Final price uses max of:
  - cost-plus-risk formula output
  - margin floor requirement
  - configured retail minimum

### 5) Category Risk Tiers (consistency)
- Define default risk tier by repair category:
  - low: simple polish/basic solder
  - medium: sizing with stones/head work
  - high: antique/brittle/multi-stone/high-liability jobs

### 6) Confidence Bands (estimation quality)
- Track quote confidence (high/medium/low).
- Low-confidence quotes apply extra risk buffer and/or mandatory approval.

## If We Implement Later
Potential implementation checklist:
1. Add settings:
   - riskRate
   - warrantyReserveRate
   - minimumGrossMarginPct
   - categoryRiskTier defaults
2. Add task-level optional overrides:
   - riskScore
   - confidenceBand
3. Apply formula in pricing engine before final output.
4. Add admin UI controls for these settings.
5. Add reporting loop:
   - quoted vs actual labor
   - callback frequency
   - margin drift by category

## Open Questions
- Should wholesale use a separate risk model or share retail risk basis?
- Should risk be auto-derived from task metadata or manually set by estimator?
- Should confidence-based buffers be customer-visible or internal-only?
