# Customs portal + payments — handoff

Written 2026-08-12. Spans **both** apps: `efd-admin` (quotes, invoices, gates) and `efd-shop`
(portal, cart, checkout). Companion docs: `CUSTOM_PAYMENT_RULES.md` (the rules),
`CUSTOM_INVOICE_PAYMENT_CONTRACT.md` (the admin↔shop contract), and in efd-shop
`docs/SHOP-COMMERCE-HANDOFF.md` (the storefront build this depends on).

## Where things stand

**Done and in production:**
- Quote engine with pass-through vs marked-up lines. Centre stone, shipping and design fee pass
  through; mounting, labour, casting, GLB and QC are marked up.
- EFD invoices replacing Stripe hosted invoices — invoice + receipt email, printable document,
  combined invoices across multiple orders (`customIDs[]` + `orderSnapshots[]`, explicit per-order
  allocation, never pro-rata).
- Email delivery is honest (`email.sent` no longer always true), credentials resolved.
- `depositFloor()` in `customInvoicePolicy.js` — advisory, never blocking.

**Not started: everything the customer touches.**

## The economics that drive the design

The 50% deposit was never arbitrary. At a 2.5× markup COG is 40% of retail, so half of retail is
**1.25 × COG** — it clears cost with a quarter of COG to spare, on every job. **It breaks below ~2×
blended markup.** On CO-msnijwee-11bb75 the centre stone went in at 1.3× (a natural diamond cannot
take keystone), the blend came out 1.43×, COG was 70% of retail, and a 50% deposit would have been
**$1,307 short of cost**. The owner charged $5,500 by instinct — COG × 1.21, almost exactly the rule,
a day before it was written down.

So the durable rule is **a multiple of COG, not a percentage of retail**. It is **advisory**: the
owner overrides gates as a matter of course and reserves that right explicitly.

## Customer payment paths

The portal offers three, chosen by the customer:

1. **Pay in full**
2. **50% deposit** — start immediately
3. **Pay over time** — the savings-plan path

### Pay-over-time rules (owner, 2026-08-12)

- All payments are **non-refundable**.
- **No default as long as something is paid each month.** Minimum **$10 per order**.
- Reminders: **one digest email listing all upcoming payments**, not one email per order — per-order
  reminders were judged annoying. Send **a week before** default and **the day before**.
- Requires **versioned explicit acknowledgement** — store the version accepted, like the S9 policy
  pages.

### The gates ladder

Work does not start until the corresponding gate is paid:

| Gate | Covers | Notes |
|---|---|---|
| 1 — Stone | the centre stone | the stone is priority; it must be secured first |
| 2 — Mounting | mounting **+ accent stones** | accent stones belong here, not gate 1 |
| 3 — Production | labour, casting, GLB, QC — and **shipping** | shipping must be covered at least by production |

**Design fee gate placement is still undecided.** Recommendation was gate 1.

**Stone price changes:** the mounting price can update automatically, but a stone availability change
must **email admin to check availability** rather than silently reprice. A weekly stone-availability
watcher is wanted (admin email + customer digest).

## Cart architecture — the correction that matters

The first framing was backwards. **The cart is primary; the invoice is a record.** The trigger was:
*"what if they're making a payment towards their two customs and then they want to add a $50 ring?"*

So a custom payment is **a cart line type**, not a separate flow. Seth (2 custom orders) must be able
to set what he'll pay on order A, add a payment for order B, add a $50 ring, and check out **once**.

This means:
- A `custom-payment` cart line carrying `customID` + amount, validated server-side against the
  order's remaining balance (never trust the client amount).
- Checkout allocates **explicitly per order** — never pro-rata.
- `paymentProgress.js` already has `amountForOrder(invoice, customID)`, which **throws** when an
  invoice spans multiple orders with no snapshots. Honour that; don't paper over it.
- Money comparisons are in **cents** (`Math.round(v * 100)`), already established there.

## Portal surfaces to build (efd-shop)

- **Overview** — per-path visual steppers / progress bar. Which gate they're on, what's next.
- **Quote tab** — the hub. Accept, then choose a payment path; shows the gates ladder.
- **Invoices tab** — the invoice document, downloadable. This was the specific gap: *"email looks
  good, just no way to download the invoice."*
- **% paid against the project total**, everywhere it's shown.
- Notification deep links must open the **right order and the right tab** — currently the quote
  notification lands on the portal without opening either.

Design bar, owner's words: **"clear, transparent, visually high end web design matching the rest of
the site."** See the checkout work on `feat/checkout-live` for the established idiom.

## Dependencies — do not start here

Custom payments ride on the shop's cart and checkout. Checkout is built and server-verified on
`feat/checkout-live`, but the shop still has **no commerce navigation and no cart link**, and there
is one product in the dev DB. Work `docs/SHOP-COMMERCE-HANDOFF.md` steps 1–3 first, or custom
payments will have nowhere to live.

## Legal

- **CAN-SPAM**: invoices, receipts and payment reminders are *transactional*, not commercial —
  different rules. Don't mix marketing into them, or they lose that status.
- **TCPA** applies if reminders ever go out by SMS. Email-only for now.
- Non-refundable terms and the pay-over-time schedule need the versioned acknowledgement above.

## Open decisions

- Design fee gate placement (recommend gate 1).
- **Sales tax on shop checkout is unconfigured** — `taxRate: null`, so zero tax is collected. Customs
  quotes already tax from `settings.pricing.taxRate`; the shop does not.
- Task #54 — customs rush reads `financial.rushMultiplier` but the configured value lives in
  `pricing.rushMultiplier`.
- 22 remaining `.hbs` templates still need migrating onto `lib/emailTheme.js`.
