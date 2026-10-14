# Pay over time — admin ↔ shop data contract

> **Kind:** normative (both apps build to this) · **As of:** 2026-10-14 · Owner ruling 2026-10-14: *"Fix it all."*,
> given in reply to the audit (docs/PAY_OVER_TIME_AUDIT_2026-10-14.md) and its recommendations, which settles
> Q21 and Q22 as recommended. Rules: `CUSTOM_PAYMENT_RULES.md`.

Admin WRITES every field below; the shop READS them (via `toClientView`) and never writes them, except
`payment.path` / `payment.acknowledgement`, which only the shop writes. All dates are ISO strings or BSON dates.

## 1. Production trigger (Q21)

`efd-admin src/services/customs/paymentProgress.js withProductionGate`: full / deposit → `quote.depositRequired`
(falls back to 50% of `quote.total`); over-time → the pre-tax gates (n ≠ 4) are paid.

## 2. Deposit (rules §1)

`quote.depositPercent` + `quote.depositRequired` — stamped by `computeQuote`: the percent is a WHOLE 5% of the
total, `min(100, max(50, ceil(cog × 1.25 / total to the next 5%)))`, and the amount is `total × percent`, rounded to
the cent. Rounding up to a 5% step is deliberate (owner, 2026-10-14): an exact `cog × 1.25` would let a customer
back out EFD's cost. The shop shows "85% deposit" and never says what sets it. The shop's "50% deposit" path charges this (label "Deposit"), and admin's deposit path goes to production
when it is paid.

## 3. Mounting follows the metal market (Q22)

- `quote.mounting.metal` — set when staff press **Estimate** in the quote builder:
  `{ metalKey, volumeCm3, metalWeightG, pricePerGram, metalCost, pricedAt }`. Typing a mounting cost by hand clears
  it; such a mounting does not follow the market and admin says so.
- Daily cron `reprice-custom-mountings` (admin): for every order with `payment.path === 'over-time'`, quote
  published + accepted, not cancelled/completed/delivered, with `mounting.metal`, whose **Mounting gate is not yet
  paid**: re-run `estimateMetalCost` at today's metal price. If `|newPricePerGram / pricePerGram − 1| ≥ 0.05`,
  re-price: new `mounting.cost`, new `mounting.metal`, recompute the quote (`computeQuote` → gates, tax, total),
  append to `quote.priceHistory`, email the client. Paid gates never change (§6).
- `quote.priceHistory[]` — `{ at, reason: 'metal-market' | 'quote-edit', pricePerGram, mountingGate, quoteTotal,
  taxAmount, total }`, newest last. The first entry is written on publish.
- `quote.pricedAt` — when the current numbers were set (publish, or the last re-price).

## 4. Payment clock (rules §9, §17)

Pure function, identical in both apps (`paymentClock` in admin `paymentProgress.js`, shop `lib/customPayments.js`):

```
lastPaymentAt = latest paidAt of this order's paid invoices (refunded/cancelled excluded), else null
anchor        = lastPaymentAt ?? payment.pathChosenAt
dueBy         = anchor + 1 calendar month            (null when the path isn't over-time or it's fully paid)
overdue       = now > dueBy
minimumDue    = min($10, remaining)
```

Admin daily cron `custom-payment-clock` keeps `payment.reminders = { dueBy, weekSentAt, daySentAt, overdueSentAt }`
for the current `dueBy` (a new `dueBy` resets it), sends ONE digest email per client covering all their over-time
orders (7 days before, 1 day before), and on the first day past `dueBy` sets `payment.overdueSince`, emails the
client once and alerts admins. A payment clears `overdueSince` (next run). Forfeiture is the owner's call, never
automatic.

## 5. Stone availability (rules §13)

`order.stoneCheck = { status: 'available' | 'sold', checkedAt, checkedBy, history: [{ status, at, by, note }] }`.
Needed while: over-time, quote has a centre stone, Stone gate not paid, order open. Due when `checkedAt` is
missing or older than 7 days. Admin buttons record it and email the client immediately ("still available" /
"has sold — we're finding you another"). A Monday cron (`stone-check-digest`) emails admins the list due.

## 6. Locks

- A gate whose cumulative amount is paid is locked: the quote PUT refuses a save that changes the amount of any
  paid gate (409, names the gate). Re-pricing touches only the Mounting gate and only while it is unpaid.
- `payment.overrides[] = { at, by, from, to, reason }` — a manual move into production before
  `readyForProduction` requires a reason, recorded here.

## 7. What the shop shows

- Quote tab: retail per stage from `quote.gates` (stone, mounting, production; item names, never `cost`), subtotal,
  tax, total, "Prices as of `pricedAt`", and the last metal-market change from `priceHistory`.
- Over-time: next minimum (`min $10`) and `dueBy`; overdue banner; stone status from `stoneCheck`; payoff-now =
  `remaining`.
- `toClientView` must not send any `cost`, `markup`, `metal.pricePerGram` or COG field.
