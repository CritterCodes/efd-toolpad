# Pay over time — session log and audit, 2026-10-14

> **Kind:** descriptive (what happened, what was found) · **As of:** 2026-10-14 · Written for the Kuzu dev at the
> owner's request ("i need this full conversation documented and every change you make noted for the kuzu dev").
> Spans both apps. Paths are `efd-admin/…` or `efd-shop/…`.

The intended rules are `docs/manufacturing/CUSTOM_PAYMENT_RULES.md` (owner decisions 2026-08-12). This document
records what is actually built against them, as of today, ahead of the **first real pay-over-time customer**.

---

## 1. What the owner asked, in order

| # | Owner's request (2026-10-14, own words where quoted) | Outcome |
|---|---|---|
| 1 | A public page on the shop explaining payment plans — "securing enough money for us to buy the stone, how metal prices don't get locked in until they meet certain thresholds" — to send to a customer asking now | efd-shop#98 — `/custom-work/payment-options` |
| 2 | "Include that we have Klarna options … At any point that they want to make a payment towards any portion to get the prices locked in, Klarna is an option." | Folded into #98 before merge |
| 3 | "Merge it and give me the link" | #98 merged; live at https://shop.engelfinedesign.com/custom-work/payment-options |
| 4 | "How do you get to that page through the UI?" → add links, plus "a card on the customs page dedicated to payments … and then 'Read more'" | efd-shop#99 |
| 5 | "fix the policy page refund contradiction too" | efd-shop#100 |
| 6 | Audit the whole pay-as-you-go flow: "it needs to be perfect" (stone checks, mounting price visible "on any given day", reminders, payoff-now price, an admin view of every pay-over-time job and the weekly chores) | Audit below (§4–§5). Nothing built yet except item 7 |
| 7 | "fix the 50% production bug first" | This PR (efd-admin, `claude/over-time-production-gate`) |
| 8 | Document the conversation and every change for the Kuzu dev | This file |

The owner's full audit request, verbatim in substance: the admin must make it "very clearly" known which stones need
an availability check; after the owner confirms a stone is still available, the customer must be notified; the
customer must see their mounting price "on any given day" as the metal market moves (e.g. quoted $1,200, metal up
20% over six months while the mounting is unpaid); the cadence of any re-pricing must be known; the shop must show
"where they are with payments, what price they're paying, and the projected price, like their payoff-now price";
"for anything, any number that moves, we need to make sure it's moving properly"; and admin must show "anything
related to a pay-as-you-go custom and jobs that I need to do each week."

---

## 2. Every change made in this session

### efd-shop#98 — the Payment Options page (merged, live)
- **New** `app/custom-work/payment-options/page.js` (server component, same styling as the policy page). Sections:
  the three paths; pay-over-time's goal; the stages Stone → Mounting → Production → Balance and what each unlocks;
  why the stone comes first; a $4,000 worked example; what's locked vs. what floats; **Klarna** (finance any
  payment to secure a stage now); ground rules ($10/month per order, non-refundable, default outcomes); how to pay.
  The header comment names the code each rule is taken from — keep the page in step with it.
- `app/sitemap.js`: added the page.
- `app/custom-work/policy/page.js`: a "Prefer to pay over time? See Payment Options" link in §7.

### efd-shop#99 — ways in to the page (merged, live)
- `app/custom-work/components/CustomWorkReel.js`: new snap section "Payment options" (three path cards, a Klarna
  line, "Read how payment works →") between "Working with us" and the FAQ; a "How payment works" link under "View
  Custom Design Policy". Nothing else reads section indexes past 1, so inserting a section is safe.
- `app/custom-work/portal/page.js`: "How do these options work? →" under the path chooser (opens a new tab so the
  chooser state survives).

### efd-shop#100 — policy contradiction (merged, live)
- `app/custom-work/policy/page.js` §10 Cancellations said "After Deposit: … any surplus refunded", contradicting §7
  (deposit non-refundable) and the owner ruling of 2026-08-12 ("All payments are non-refundable"). Now: before any
  payment, cancel free; after a payment, non-refundable, but a stone paid for in full may be collected (same
  ruling, §9 of the rules); after casting, no cancellation. §9 "Remaining 50% due" → "Remaining balance due".

### efd-admin (this PR) — production no longer starts at 50% for pay-over-time
- `src/services/customs/paymentProgress.js`: new pure `withProductionGate(order, progress)`. Full/deposit/unchosen
  paths keep the 50% rule. `order.payment.path === 'over-time'` → ready for production when paid ≥ the sum of the
  pre-tax gates in `quote.gates` (everything but n=4, the tax Balance), falling back to `quote.quoteTotal`. Adds
  `paymentPath`, `readyForProduction`, `amountForProduction`; re-bases `canStartProduction`.
- `src/services/customs/customInvoices.service.js`: `progressFor` wraps progress with it, so every caller
  (`getCustomPaymentProgress`, the payment-progress API, the invoice paid path) gets the same answer. The
  admin-marked-paid advance and the owner's "threshold reached" email now key off `readyForProduction`.
- `src/services/customs/shopPaymentCredits.js`: the shop-payment drain advances off `readyForProduction`.
- `src/app/dashboard/customs/[customID]/page.js`, Invoices tab: a "Pay over time — $X to go before production"
  panel; the "50% reached — order the parts" banner now appears at the real threshold and says "Production stage
  paid" for over-time orders.
- Tests: 4 new cases in `paymentProgress.test.js` (big stone crosses 50% without starting production; exact
  threshold; legacy quotes without gates; other paths unchanged). `shopPaymentCredits.test.js` mocks updated.
  Customs suite: 224/224.
- **Not changed, deliberately:** the list card colour (`CustomOrderCard.js`) and its "production starts at 50%"
  tooltip, and the list summary's `hasReached50` — cosmetic, and the list API drops `payment.path` anyway (§4,
  A2). Status still only moves forward; an over-time order that was already pushed into production stays there.
- The rule chosen — production at the Production stage, not when stone + mounting are covered (§3 of the rules
  reads that way) — matches what customers were told (portal terms "Work on each stage begins once its stage is
  covered"; the Payment Options page). Recorded as **Q21** in `docs/OPEN-QUESTIONS.md` for the owner to confirm.

### Data checked (read-only, production `efd-database`, 2026-10-14)
- `customOrders.payment.path`: over-time 1, deposit 1, full 3, unset 26. The single over-time order is the owner's
  **test** (`CO-msq5n116-1a2523`, stone "test"), status `deposit`. The incoming customer will be the first real one.
- Quotes carry **no** metal-rate snapshot and **no** validity/expiry field.
- `customPaymentCredits`: 4 processed, 1 refunded, none waiting — the admin drain works.

---

## 3. How it works today (one paragraph)

The customer accepts a published quote in the shop portal, picks full / deposit / over-time (over-time stores a
versioned acknowledgement), and pays any amount ≥ $10 as a cart line. Stripe's webhook writes a paid
`customInvoices` record and a `customPaymentCredits` row; admin's `drain-shop-payments` cron (every 10 min) advances
status, sends the in-app notice and the receipt email. The shop's gates ladder comes from `quote.gates`, stamped by
admin's `computeQuote` on each quote save. **Nothing ever re-prices a published custom quote.** No cron touches
`customOrders` except the drain.

---

## 4. Audit — admin side

| | Item | State |
|---|---|---|
| A1 | Production threshold per path | **FIXED in this PR** (was 50% for every path, with the "in production" email) |
| A2 | Admin shows which orders are pay-over-time | MISSING — nothing read `payment.path` before this PR; the list API's payment summary (`customInvoices.service.js`, ~line 267, used by `/api/custom-orders`) replaces `payment` with a computed summary, so the list cannot show it |
| A3 | Gates ladder in admin, cleared state, "you can buy the stone now" (paid ≥ stone COST) marker, override with reason | MISSING (gates are computed and stored, never displayed; manual status changes hard-code reason "manual update") |
| A4 | Weekly stone-availability check (rules §13): task list, "still available / sold" button, customer email after | MISSING. The centre stone is free text + cost, no SKU, so a Stuller lookup has nothing to key on |
| A5 | Monthly payment clock / default (§9, §17): last payment, next due, overdue, digest reminders | MISSING — no field, no cron |
| A6 | Mounting re-pricing (§5) | MISSING. "Estimate" (QuoteTab → `/api/production/designs/estimate`) re-prices the WHOLE mounting from STL volume × live `metalPrices`, paid or not; metal rate and weight are not stored; nothing blocks editing a quote that has payments; gates are re-stamped on every save, so an edit after the mounting gate cleared silently moves a locked price |
| A7 | Owner alert when a shop payment arrives | MISSING — the drain doesn't call `notifyPayment` (admin-marked payments do) |
| A8 | Deposit floor (COG × 1.25) | PARTIAL — only in the New Invoice dialog, not the quote builder |
| A9 | "This week" chores view | MISSING (admin dashboard is repairs-only) |
| A10 | Artisan side effects | Any assigned artisan opening the Invoices tab runs the drain (`requireCustomsRead`), which can change status and email the customer |
| A11 | Refunds | A refunded shop payment drops out of progress, but status never rolls back |

Crons (`vercel.json`), none of which handle stone checks, reminders or defaults: update-metal-prices hourly;
update-stone-prices :20 hourly (catalog stones); update-material-prices :10; reprice-listings :30 (gated by
`priceJobDue`; header comment says daily 10:00 UTC); drain-shop-payments every 10 min; earn-commissions every 30
min; release-drops every 5 min; birthday-offers and abandoned-cart (marketing, no-op); payroll × 4.

## 5. Audit — shop side

Ranked by what the first customer would hit. File refs are efd-shop.

1. **The quote breakdown shows EFD's COST as the customer's prices.** `app/custom-work/portal/page.js` (Quote tab)
   renders `centerstone.cost`, `mounting.cost`, accent stones, materials and shipping at cost above the marked-up
   subtotal; `lib/customOrderService.js toClientView` sends those cost fields (and labour `cost`) despite its
   comment. Live today on every published quote — e.g. CO-mud0wv65: stone $200, mounting $407.34, subtotal
   $1,752.71. Verified by reading the code 2026-10-14. **Top priority.** The fix is also the owner's "show the
   mounting price" ask: show the retail gate amounts.
2. **Pay twice, credited once.** "Change amount" leaves the first custom-payment line in the cart; a second line for
   the same order is accepted (each line validated against the full remaining balance), and `creditCustomPayment`
   keys the invoice per (cart order, customID) with insert-only fields, so the second allocation is dropped while
   Stripe charged both.
3. **Promises with nothing behind them.** Portal terms promise reminder emails (week before / day before); the
   Payment Options page promises stone-sold notices and default handling. No code, cron or payment-clock field.
4. **Status words.** After an over-time customer's first $10, status is `deposit`, which the portal labels
   "Awaiting deposit".
5. **Refund reversal.** A `refund.created` event has no `amount_refunded`, so a partial refund voids the whole
   credit; partial-refund reversal isn't replay-safe; a product refund in a mixed cart comes out of the custom
   credit first; a late `payment_intent.succeeded` replay can re-apply a refunded credit.
6. **Gates fallback** (`lib/customPayments.js gateBreakdown`) uses one blended multiplier when `quote.gates` is
   missing, which is wrong under per-line markups (its "EXACT" comment is stale). Quotes saved before admin began
   stamping gates use it.
7. **Acknowledgement** covers 4 of the §14 points (missing: stone may sell, metal floats, default/forfeit, nothing is
   theirs until paid). Server accepts any version string; UI shows "terms accepted" for any version.
8. **"$X due"** on the account dashboard and portal list shows the whole balance to an over-time customer; nothing
   says "$10 due by <date>".
9. **Checkout reads like a product sale** for a custom payment: shipping address required, "Insured shipping:
   Included", "Certificate of authenticity included", "on their way" email. The `order_confirmed` email prints
   "$$10.00" for every order (the webhook formats with "$" and the template adds another).
10. **Klarna.** Works through `automatic_payment_methods` only if enabled in the Stripe dashboard, within Klarna's
    amount limits; outside them the payment form silently omits it. Every shop credit is recorded as
    `paymentMethod: 'card'`. A delayed-settlement method would outlive the 20-minute checkout hold.
11. **100% shown while money is owed** — `Math.round` displays 100% from 99.5%.
12. **Suggested amount can be rejected** — the pre-fill is the next gate's remainder, which can be under the $10
    minimum.
13. **Tax** — no double tax (custom lines are tax-exempt at checkout because tax is inside `quote.total`). But tax is
    fixed at quote time and counted in % paid from the first payment, while the rules (§6) and the copy say it's
    added at the lock. Tax isn't recorded on the shop order or the invoice it creates.
14. Smaller: deposit ignores the COG × 1.25 floor; adding to cart doesn't require the quote to be accepted; no
    "price as of" display anywhere; "$X more secures balance" reads oddly.

---

## 6. Gaps against the owner's audit request, mapped

| Owner wants | Today | Needs |
|---|---|---|
| Admin says clearly which stones need checking this week | Nothing | A5/A4: weekly list of over-time orders with an uncleared stone gate; "still available" / "sold" buttons recording who/when |
| Customer notified after the owner confirms the stone | Nothing | Email (digest per customer, rules §17) sent by that button |
| Customer sees the mounting price on any given day | Sees mounting at COST, frozen at publish | Retail gate amounts (shop #1); a "price as of <date>" line; a stored metal snapshot to re-price from |
| Mounting follows the market until paid, cadence known | No re-pricing at all | **Owner decision Q22** (cadence + auto vs. staff-confirmed); then a job that re-prices only the unpaid mounting off the stored snapshot, never a paid gate, with a price-change notice |
| Payoff-now price | "Pay remaining" exists | Becomes meaningful once re-pricing exists: payoff-now = paid gates + today's price of unpaid gates |
| Every number moves properly and is explained | Numbers never move; some are wrong (cost leak, 100% rounding, "Awaiting deposit") | Shop fixes 1, 4, 11, 12 |
| Admin view of every pay-over-time job + weekly chores | Nothing | A2 + A3 + A9: an over-time filter/badge, the ladder on the order, a "this week" list (stone checks, orders with no payment this month, gates just cleared → buy the stone / metal) |

## 7. Recommended order

1. ~~Production at 50%~~ — this PR.
2. Shop: stop exposing cost; show retail per gate (the mounting line the owner asked for).
3. Shop: one cart line per custom order (merge, don't duplicate) + credit idempotency per allocation.
4. Admin: show pay-over-time (badge, filter, gate ladder with the "buy the stone now" marker, override + reason).
5. Payment clock: `lastPaymentAt` per order, a daily job that flags "no payment this month", one digest reminder
   email (week before, day before), default flag — the terms already promise the reminders.
6. Stone checks: weekly admin list + buttons + customer digest email.
7. Re-pricing per Q22: snapshot metal rate/weight on the quote, re-price only unpaid mounting, lock a gate when paid,
   block quote edits that would move a paid gate, "price as of" in the portal.
8. Copy/consistency: status words, checkout copy for custom payments, acknowledgement to the full §14 list (new
   terms version), rounding, "$$" email.

Open questions for the owner: **Q21** (production trigger for over-time) and **Q22** (mounting re-pricing cadence)
in `docs/OPEN-QUESTIONS.md`.

---

## 8. "Fix it all" — the build (2026-10-14, later the same day)

Owner, after reading §4–§7: *"Fix it all."* Taken as approval of every recommendation above, including Q21 and
Q22 (recorded as DECIDED in `docs/OPEN-QUESTIONS.md` with those words). The two apps were built against one
contract, **`docs/manufacturing/PAY_OVER_TIME_CONTRACT.md`** — read that first; it says which app writes which
field.

**Merging without CI.** GitHub Actions is billing-blocked (see `docs/OVERNIGHT_2026-10-14.md`), and main's
branch protection no longer lists `check` as required — `gh api …/branches/main/protection/required_status_checks`
answers "Required status checks not enabled". #329 therefore merged on local evidence (tests, lint, Vercel's
build) and it shipped one inline `sx` over the ratchet, which only the (unrun) test suite would have caught; fixed
in this PR. Until Actions is paid, run `npx vitest run` and `npx eslint src scripts --quiet` before every merge.

### efd-admin (PR `claude/over-time-admin`)

| Area | Change | Files |
|---|---|---|
| Deposit (rules §1) | `computeQuote` stamps `depositRequired = min(total, max(total × 0.5, cog × 1.25))`; deposit/full shop orders go to production when it's paid; the quote builder shows it | `customQuote.js`, `model.js normalizeQuote`, `paymentProgress.js withProductionGate`, `QuoteTab.js` |
| Monthly clock | `paymentClock` + `addMonths` (pure, mirrored in the shop) | `paymentProgress.js` |
| Stages for the owner | `gateLadder`: each stage paid/unpaid, `toCover`, staff-only "payments have covered the stone's cost" marker | `paymentProgress.js` |
| Metal follows market (Q22) | Estimate stores `mounting.metal {metalKey, volumeCm3, metalWeightG, pricePerGram, metalCost, pricedAt}`; typing a cost clears it; daily cron re-prices only unpaid mountings on a ≥5% move, re-stamps gates/tax/total, records history, emails the client | `QuoteTab.js`, `payOverTime.js repriceOverTimeMountings`, `api/cron/reprice-custom-mountings` |
| Paid stages locked | Quote PUT returns 409 naming the stage if an edit would change a paid stage; re-pricing checks the same | `api/custom-orders/[customID]/quote/route.js`, `payOverTime.js paidGateConflict` |
| Price history | `quote.priceHistory[]` + `quote.pricedAt` on publish, on any edit that changes a published total, on every re-price | quote route, `payOverTime.js recordPrice` |
| Reminders + overdue | Daily cron: one digest email per client a week and a day before each due date; first day past due → `payment.overdueSince`, one client email, admin alert; cleared by the next payment. Never forfeits on its own | `payOverTime.js runPaymentClock`, `api/cron/custom-payment-clock` |
| Stone checks | `POST /api/custom-orders/[id]/stone-check {status: available/sold/purchased, note}` records and emails the client at once; due weekly while the stone stage is unpaid | `api/custom-orders/[customID]/stone-check`, `payOverTime.js recordStoneCheck` |
| Owner's view | `/dashboard/customs/pay-over-time` (facelift kit): metrics, this week's chores, every order; Monday email of the same chores; "Pay over time" button on Customs; badge on order cards; list API now carries `payment.path`, `readyForProduction`, `overdueSince` | `dashboard/customs/pay-over-time/*`, `api/custom-orders/pay-over-time`, `api/cron/pay-over-time-weekly`, `customInvoices.service.js withPaymentSummaries`, `CustomOrderCard.js`, `customs/page.js` |
| Order page | Pay-over-time panel on the Invoices tab: stages, clock, stone buttons, "mark stone bought", metal status, price history, overrides | `dashboard/customs/components/PayOverTimePanel.js`, `[customID]/page.js` |
| Override (rules §4) | Moving an over-time order into production before its production stage is paid → 409 `needsOverride`; a dialog asks why; `payment.overrides[]` keeps who/when/why | `api/custom-orders/[customID]/route.js`, `[customID]/page.js` |
| Owner alert | Every shop payment alerts the admins | `shopPaymentCredits.js` |
| Artisan side effect | Only staff opening the Invoices tab drain shop payments | `api/custom-orders/[customID]/invoices/route.js` |
| Email | The generic template keeps line breaks (`white-space: pre-line`) so digests read as lists | `emails/generic-notification.hbs` |
| Crons | `reprice-custom-mountings` 14:00 UTC daily · `custom-payment-clock` 15:00 UTC daily · `pay-over-time-weekly` 13:00 UTC Mondays. All accept `?dryRun=1` | `vercel.json` |

Tests: `paymentProgress.test.js` (deposit threshold, `addMonths` month-ends and leap year, `paymentClock`,
`gateLadder`), `customQuote.test.js` (`depositRequired`), new `payOverTime.test.js` (lock, price entry, stone-check
timing, chores), `shopPaymentCredits.test.js` (admin alert). Customs suite 256/256; full suite 2,413 passed (three
production files can't load `mongodb-memory-server` in a worktree whose node_modules is a junction; unrelated).

**Not done, on purpose:** status never moves backward after a refund (rules make status forward-only; the order
page and the owner's list show the real paid figure). Forfeiture on default stays a human decision.

### efd-shop (CritterCodes/efd-shop#101, merged and live 2026-10-14)

Built by a delegated session against the contract, then reviewed by a second, independent session before merge.

| Area | Change | Files |
|---|---|---|
| **Cost leak** | `toClientView` is an allow-list: item names, retail stages (`quote.gates`, or the legacy fallback computed server-side), `depositRequired`, `pricedAt`, `priceHistory` (no metal prices), `mounting.followsMarket`, `stoneCheck {status, checkedAt}`, `payment.overdueSince`. Run read-only over all 12 published production quotes: no cost keys, no errors. Quote tab shows retail per stage + "Prices as of" + the last metal change | `lib/customOrderService.js`, `app/custom-work/portal/page.js` |
| Double charge | One custom-payment cart line per order (client store, server cart, healed on load); checkout validates the per-order SUM and allocates once per order | `lib/cartLines.js`, `context/CartContext.js`, `app/api/cart/route.js`, `lib/checkoutPricing.js`, `app/api/checkout/route.js` |
| Clock | `paymentClock` / `addCalendarMonth` — same dates as admin (reviewed line by line); no clock on closed orders in either app | `lib/customPayments.js` |
| What the client sees | "Next payment $10 by <date>", live overdue notice with a pay button, stone status, "Pay off now", path-aware status words ("Paying over time"), % paid never 100% while owed, suggested amount ≥ the minimum | portal, `app/account/DashboardClient.js`, `lib/customOrderStatus.js` |
| Terms | Shared module, version `pot-2026-10-14`, full rules §14 list; server accepts only the current version; old-terms clients re-accept before paying | `lib/payOverTimeTerms.js`, `lib/customOrderService.js setPaymentPath` |
| Deposit | Charges `quote.depositRequired` | `lib/customPayments.js depositTarget` |
| Guard | A custom payment needs a published + accepted quote and an order that isn't cancelled (completed/delivered may still pay a balance) | `lib/customPayments.js customPaymentBlock` |
| Checkout | Payment-only carts: no shipping address, no product copy, own success page and email; "$$" fixed in every order email | `lib/checkoutCopy.js`, checkout + success clients, `public/email-templates/order_confirmed.html`, webhook |
| Refunds | `refund.created` uses `refund.amount`; reversals recorded once per refund in a new `refundLedger` collection (per PaymentIntent); one-way; a late success event can't un-refund; tiebreak so a partial refund splits deterministically | `lib/paymentReversal.js`, `lib/cartFulfillment.js`, webhook |
| Copy | Payment Options page, Custom page card, policy §7 match what is built | `app/custom-work/**` |

Shop tests 180/180 (`npm test`); `next build` passes locally (Vercel skips shop preview builds).

### Known, left open (from the review)

- **`refundLedger` has no unique index on `paymentIntentId`.** Two simultaneous first events could create two ledger docs; bounded (both hold true lower bounds, reversal is one-way). Creating the index is a production write — ask the owner.
- **A partial refund on a cart order whose payment was never processed** stops it being credited later (`cartFulfillment.js`, the refunded early-return). Very rare; fixing it needs the ledger re-applied after a late credit.
- **A replayed success event skips the confirmation email** even if the first attempt threw before sending it.
- **The deposit reveals cost when the floor applies** (deposit ÷ 1.25 = COG). Inherent in charging it; an owner note, not a bug.
- **Legacy refunds:** before this, every partial `refund.created` voided the whole credit. Credits with `refundedAt` and no `originalAmount` should be reconciled by hand (production had 1 refunded credit on 2026-10-14 — CO-mud0wv65's duplicate charge, a full refund, so correct).
- **The real payment method** (Klarna, Link) is recorded only when Stripe's success event carries the charge; otherwise `card`. A `charge.succeeded` handler would make it exact.
- Admin stamps gate wording in British spelling ("Centre stone", "Labour") which the client sees on the Quote tab; cosmetic.
- **Before the new client's quote is published:** price the mounting with **Estimate** (Quote tab) or it won't follow the metal market.
- **The owner's own test order** `CO-msq5n116-1a2523` is pay-over-time and unpaid since August: the first `custom-payment-clock` run (15:00 UTC) will mark it overdue, email its client account once and alert the admins. Cancel it first if that isn't wanted.
