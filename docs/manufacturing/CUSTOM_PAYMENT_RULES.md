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

**The durable rule is therefore not a percentage. DECIDED 2026-08-12: the floor is `COG × 1.25`.**

That is exactly what 50% has always delivered — at 2.5×, retail = 2.5 × COG, so half of retail is
1.25 × COG. Preserving the cushion means preserving that multiple, not a fixed percentage of retail.

```
deposit floor = cog × 1.25
```

On Bryce that is $5,696 (88% of retail). The owner charged $5,500 — COG × 1.21 — so the instinct was
already within 4% of the rule.

The honest consequence: on a thin-margin job the same absolute cushion is a large share of retail. The
field should therefore show all three reference points so the trade-off is visible rather than implied,
defaulting to `COG × 1.25` and remaining typeable over:

| | Bryce | % of retail |
|---|---|---|
| COG only — breaks even | $4,557 | 70% |
| COG + 10% | $5,013 | 77% |
| **COG × 1.25 — the historical cushion (default)** | **$5,696** | **88%** |

Every input already exists on the quote: `cog`, `total`, `effectiveMarkup`.

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

## 6. Tax — finalised at the lock, not spread across tranches

**DECIDED 2026-08-12.** Tax is computed and added **when the price locks**, not pro-rata per payment.

The lock is whichever applies: 50% paid (Path A), or stone + mounting paid (Path B). Before the lock the
price can still move, so taxing an unlocked total would mean re-taxing it — the tax follows the final
number rather than chasing a moving one.

This supersedes the earlier pro-rata suggestion. It is simpler to explain and simpler to build: tranches
before the lock are pre-tax against materials; tax appears once, on the locked total.

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
- **O3 — expiry mechanics.** Day 31 on the UNPAID lines: auto re-price, or flag for staff re-quote?
  Note this now interacts with §9 — a customer paying monthly never expires, so expiry only bites the
  ones who go quiet, which is also when they default.
- **O4 — accent stones / other materials.** Assumed to slot in after mounting by risk. Bryce also had
  $70 shipping and a $100 design fee that need a home in the ladder.

---

## 9. Ownership, default, and momentum — DECIDED 2026-08-12

### Nothing is theirs until it is paid for

**All payments are non-refundable.** A cleared gate does NOT transfer ownership of the piece — it means
EFD has bought the material and is holding it for them. The customer-facing wording must reflect that:
"your stone is secured," never "your stone." As the owner put it: a garage does not hand back the car
before the bill is paid.

### Default

There is **no payment schedule**. The only obligation is **something every month** — any amount, as
evidence of intent. Miss a month and the order is in default.

On default:

| State at default | Outcome |
|---|---|
| Stone fully paid | They may **collect the stone**. It is paid for; releasing it costs EFD nothing. |
| Partial payment toward the mounting | **Forfeit.** Non-refundable, and the metal was bought or committed. |
| Nothing complete | Forfeit. No material was secured. |

So a fully-paid LINE is recoverable by the customer on default; a partially-paid one is not; and the
unfinished PIECE is never theirs. That is the reconciliation of "nothing is theirs until paid in full"
with "they can pick up the stone" — line-level settlement on exit, no ownership of work in progress.

### Momentum — acceptance must be immediately payable

**Do not stop a customer who has just said yes.** Accepting a quote must land them somewhere they can pay
straight away, with two choices:

1. **Pay 50%** (or the `COG × 1.25` floor when that is higher) — locks the price, production starts.
2. **Start paying what they want** — any amount, gates clear as they go, monthly activity keeps it alive.

This answers O5: acceptance creates a payable position immediately. Whether that is literally an invoice
record or a payable balance is an implementation choice; what matters is that "accept" and "pay" are not
separated by a wait for staff.

---

## 10. Build order

1. **Deposit floor guardrail** (admin, small) — warn when 50% does not clear `COG × 1.25`, offer the
   figure. Catches the next Bryce at quote time. No new concepts.
2. **Gates computed + shown** (admin) — the ladder for this job, in the order it falls, with the
   staff-only "you can buy the stone now" cost marker and the recorded override.
3. **Portal + shop checkout** — quote tab as the hub, choose-your-amount payment, deep links that open
   the right request on the right tab, `%paid` against the project total.

Invoice sending is already live (`POST /api/custom-orders/:customID/invoices/:invoiceID/send`, with
Send/Resend + Print + Email receipt on the invoice row).
