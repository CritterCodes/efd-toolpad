# Phase 1: Data Model (Conceptual)

## Entities

### Estimate
- id
- createdAt, createdBy
- discount: { type: percentage|flat|null, value }
- depositApplied: amount
- taxPolicy: { hybrid: true, taxRatesByCategory, laborTaxable: boolean }
- totals: { subtotal, discountAmount, taxableBase, taxAmount, total, amountDue }
- relationships: has many LineItems

### LineItem
- id, estimateId
- name (e.g., "Ring Resize")
- defaults: { materialMarkupRate, laborMarkupRate, laborBaseRate, taxabilityFlags }
- discount: { type: percentage|flat|null, value }
- totals: { subtotal, discountAmount, taxableBase, taxAmount, total }
- relationships: has many Processes

### Process
- id, lineItemId
- name (e.g., "Solder new bar")
- overrides: { materialMarkupRate?, laborMarkupRate?, laborBaseRate?, taxabilityFlags? }
- totals: { subtotal, preTax? }
- relationships: has many Steps

### Step
- id, processId
- name
- inputs: { materialsCost, laborHours, laborBaseRate, otherDirectCosts, materialMarkupRate, laborMarkupRate, taxabilityFlags }
- derived: { materialsPrice, laborCost, laborPrice, subtotal }

### CompanyDefaults
- materialMarkupRate
- laborMarkupRate
- laborBaseRate
- defaultTaxabilityFlags

## Invariants
- Override precedence: Step > Process > LineItem > CompanyDefaults.
- No markup applied to otherDirectCosts.
- Taxes computed per hybrid rule.
- Rounding: internal high precision; display at currency precision; parent == sum(children).

## State
- Estimate.status: draft only for demo.

## Demo Data Segregation
- All demo Estimates, LineItems, Processes, and Steps MUST carry a `isDemo: true` or equivalent non-production flag.
- Production reads/writes MUST exclude records with `isDemo: true`.

## Rollup Formulas (Reference)
- Step:
  - materialsPrice = materialsCost × (1 + materialMarkupRate)
  - laborCost = laborHours × laborBaseRate
  - laborPrice = laborCost × (1 + laborMarkupRate)
  - stepSubtotal = materialsPrice + laborPrice + otherDirectCosts
- Process:
  - processSubtotal = Σ stepSubtotal
- LineItem:
  - lineItemSubtotal = Σ processSubtotal
  - lineItemDiscount applied (flat or %)
  - lineItemPreTax = lineItemSubtotal − lineItemDiscount
  - lineItemTaxableBase = taxable portions of lineItemPreTax
  - lineItemTax = lineItemTaxableBase × taxRate
- Invoice (Estimate):
  - invoiceSubtotal = Σ lineItemSubtotal
  - invoiceDiscount prorated by LineItem pre-discount subtotal
  - invoicePreTax = invoiceSubtotal − invoiceDiscount
  - Hybrid tax: if mixed taxability across LineItems → Σ lineItemTax; else tax(invoicePreTax)
  - amountDue = (invoicePreTax + tax) − depositApplied

## Override Precedence Examples
- If LineItem laborMarkupRate = 0.25, Process override = 0.30, Step override unset → effective laborMarkupRate = 0.30.
- If Step sets materialMarkupRate = 0.40, parent defaults ignored for that Step only.
