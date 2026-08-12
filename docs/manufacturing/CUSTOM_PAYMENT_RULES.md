# Custom-order payment rules

Status: **spec, not built.** Owner-reviewed 2026-08-12. Supersedes the bare "50% deposit" rule in
§4/§9 by explaining *why* 50% works and when it doesn't.

Shapes: the quote builder, invoicing, the shop portal, and when production may start. Written before
building because it spans two repos.

---

## 1. The invariant behind "50%"

The 50% deposit was never arbitrary. **It is calibrated to a 2.5× markup.**

| | Typical job | Bryce (CO-msnijwee-11bb75) |
|---|---|---|
| COG | $650 | $4,557.02 |
| Retail, pre-tax | $1,650 | $6,500.05 |
| **COG ÷ retail** | **39%** | **70%** |
| 50% deposit | $825 → clears cost + $175 | $3,250 → **$1,307 SHORT of cost** |

At 2.5×, COG is always 40% of retail, so a 50% deposit clears cost with 10 points of headroom on every
job. **It breaks below ~2× blended markup**, because then half of retail is less than cost. Bryce blended
to 1.43× (the diamond went in at 1.3× — see `customQuote.js`), so the standard deposit was underwater.

**The durable rule is therefore not a percentage:**

```
minimum safe deposit = cog / total          # the point where the deposit clears COG
    2.5× blended  → 40%    ⇒ 50% is fine
    1.43× blended → 70%    ⇒ 50% is not
```

Every input exists on the quote already: `cog`, `total`, `effectiveMarkup`. The deposit field should
default to 50% and, when 50% would not clear COG, **say so and offer the figure that does**. That is the
single guardrail that would have caught Bryce at quote time rather than afterwards.

---

## 2. Two payment paths

The customer picks. Both are legitimate; the second earns its complexity only when they are slow.

### Path A — standard deposit
One number: 50%, or the cost-covering floor when that is higher. **Production starts on payment.**
This is the common case and must stay a single field.

### Path B — pay over time ("layaway for custom jewellery")
Materials-first tranches. Profit is realised earlier and incrementally, which is what you want from a
customer stretching payment over months; for them it is a locked price on a piece they are saving for.

**Pay-over-time is also safer on thin-margin jobs.** On Bryce, materials-first puts the diamond fully
paid at $5,134 — 79% of retail — before anything is ordered. The gates self-correct for low markup in a
way a flat percentage cannot.

---

## 3. The gates (Path B)

Ordered by RISK, not by size. Each is cleared by cumulative payments, allocated in this order.

| # | Gate | Cleared at | What it unlocks | Why it is the priority it is |
|---|---|---|---|---|
| 1 | **Stone secured** | centre-stone **retail** (`centerstone.cost × centerstoneMarkup`) | Stone is bought; no longer sellable to anyone else | Sniping risk is the only *irrecoverable* risk — a sold stone cannot be un-sold, and re-sourcing may cost more |
| 2 | **Mounting secured** | mounting retail | Metal bought; **mounting price locked** | The metal market only moves the mounting line, so this is the precise thing a "price lock" should lock |
| 3 | **Materials covered** | gates 1 + 2 (+ other material lines) | **Production may start** | You physically cannot begin without cast metal. "50%" was always a proxy for this |
| 4 | **Balance** | remainder — labour, design, shipping, casting | Piece released | Nothing leaves the shop unpaid; possession is the leverage |

**Cost vs retail.** Gates clear at RETAIL, not cost — "you have paid for your stone, the stone is yours"
is a sentence a customer accepts, and it banks margin on the riskiest line first. Cost still matters as a
separate, staff-facing marker: the moment payments cross the stone's **cost**, EFD *can* buy it. Show
that too (§5) — it is the point at which waiving the rest becomes a real option rather than a gamble.

**The gates are not a fixed ladder.** Which trips first depends on the job:
- Big stone (Bryce, 55% of total) — the stone gate alone passes 50%; several gates clear at once.
- Small stone ($500 in an $800 job) — the price locks before the stone is secured.

Render them in the order they actually fall for *that* quote. Never hardcode the sequence.

---

## 4. Owner override — explicit, recorded, never silent

**The gates are advisory. The owner may advance any stage regardless.** This is not a loophole; it is how
the shop actually runs. On Bryce the owner collected $5,500 (stone retail $5,134.35 + $365.65), cleared
gate 1, and **deliberately waived gate 2** to start production — "I had taken enough profit."

Requirements:

1. Any stage may be forced despite an unmet gate.
2. The override is **recorded**: who, when, which gate, and a reason. "I had taken enough profit" is a
   judgment that must be reconstructable months later — and if a stone is sniped after an override, it
   should be visible that it was a choice, not a bug.
3. The gate state must be plain on screen so an override is deliberate rather than accidental.

This mirrors how the codebase already treats judgment calls: compute the signal, show it, let a human
decide, write down what they decided (cf. the design/QC fee decision in `customAssignment.js`).

---

## 5. What floats, what locks

- **A paid line is locked forever.** Unpaid lines float.
- Only the **mounting** floats in practice — the metal market moves metal. The stone is a bought-in good
  at a fixed price; labour is EFD's own rate.
- **30-day validity applies per line, not to the whole quote.** Expiry re-prices the *remaining* lines.
  "Your quote expired" is a bad sentence for a customer three payments in; "the metal on the unpaid
  portion has moved" is a true and survivable one.
- Re-pricing happens on **staff action**, not silently on view. A number the customer is looking at must
  not change by itself. (See open question O3.)

---

## 6. Tax

Invoice `amount` is **tax-inclusive** (see `customInvoices` model). Each tranche must therefore carry its
share of tax **pro-rata**, or the final payment silently absorbs all of it — turning "the balance is
labour" into "the balance is labour plus 9.5% of everything."

---

## 7. Surfaces this implies

**Admin**
- Quote builder: deposit floor warning when 50% does not clear COG (§1).
- Payment progress: the gates for this job, in the order they fall, with cleared/at-risk state; the
  staff-only "you can buy the stone now" marker (§3).
- Override control with a reason field (§4).

**Shop portal** — the hub for everything custom.
- Quote tab: the gates as a transparent ladder — what is secured, what is at risk, what the next payment
  unlocks. This is the customer-facing case for paying more, sooner.
- Choose-your-amount payment, minimum = the next gate, via shop checkout (not invoice links).
- Deep links: a quote or invoice notification must open **the request, on the right tab**. Today both
  land on the portal root and the customer has to navigate. See `CUSTOM_INVOICE_PAYMENT_CONTRACT.md`.
- `%paid` must be measured against the **project total**, never against the invoice's own amount —
  nobody pays a percentage of an invoice.

**Account dashboard** — the existing standalone quote page becomes a quick-view card linking into the
portal quote tab.

---

## 8. Open questions

- **O1 — payment allocation.** Stone-first is assumed throughout (§3). Confirm that a payment is credited
  against gates in risk order rather than pro-rata across lines.
- **O2 — labour is the unsecured tranche.** Labour credits to the artisan at QC pass, so if a customer
  abandons at completion, EFD has paid the bench, holds a finished piece, and the stone in it is the
  customer's — it cannot simply be resold. Possession is the protection; a small labour deposit folded
  into gate 2 is the lever if that ever bites.
- **O3 — expiry mechanics.** Does day 31 re-price automatically or flag for staff re-quote?
- **O4 — accent stones / other materials.** Assumed to slot in after mounting by risk. Bryce also had
  $70 shipping and a $100 design fee that need a home in the ladder.
- **O5 — does accepting a quote auto-create the first invoice?** Undecided.
