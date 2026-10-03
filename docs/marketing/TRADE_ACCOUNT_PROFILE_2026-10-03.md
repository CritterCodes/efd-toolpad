# What a Marlen looks like, in numbers

> **As of:** 2026-10-03 · Source: production (`efd-database`), read-only · Money is taken from
> `repairInvoices` (the authority), never from `repairs.totalCost`, which is `0` on most records because
> prices are computed and never stored. See memory `pricing-one-engine`.

The owner's read — "Marlen is by far our biggest and best account" — is correct, and not for the reason the
repair count suggests. The Smith has sent **3.5× more repairs**. Marlen is still the better account, and the
numbers say exactly why, which is what makes them worth selling on.

## The two trade accounts, head to head

| | **Marlen Jewelers** | The Smith |
|---|---|---|
| Active | 2026-09-03 → 2026-10-02 (**1.0 month**) | 2026-04-17 → 2026-09-22 (5.2 months) |
| Repairs | 47 | 162 |
| Invoiced | **$5,448.27** | $9,687.00 |
| **Invoiced per month** | **$5,448** | $1,863 |
| **Per repair** | **$115.92** | $59.80 |
| Packages | 3 | 41 |
| **Jobs per package** | **15.7** | 3.6 |
| Dominant work | Retip prongs ×111, set stone ×35, laser weld ×46, platinum sizing | Laser weld ×365 |

**Marlen bills 2.9× The Smith's monthly rate at nearly double the value per repair, in 3 packages against
41.**

> **Correction, 2026-10-03 (owner).** A first pass counted five Marlen drop-offs from distinct `createdAt`
> dates. There were **three packages**; the other two "days" are data entry spilling over. A package is an
> **invoice**, not a date in `repairs.createdAt` — the same confusion that makes turnaround unmeasurable
> below. Every per-store count in this file is now taken from `repairInvoices`.

## How the account was actually won

**The first package was a trial, and it was a bake-off.** Andrew sent work to three shops at once to
compare them. Ours was the September 4 invoice — 6 jobs, $236.94. We won it, and the next package was
fifteen jobs.

> Owner, 2026-10-03, reporting what Andrew told him: the other two jewelers' work was **"garbage"**
> — Andrew's exact word, per the owner — and ours was great. The rest of that account is the owner's
> paraphrase, not a quote.

This is the most useful thing in this document, because it is repeatable:

- **The growth curve is not organic.** 6 → 15 → 26 is a trial, a win, and then the account. Do not describe
  it as a store that gradually warmed up; describe it as a store that tested us against its incumbents.
- **The ask is a trial, not an account.** A jeweler will not move their repair work on a pitch. They will
  send five or six pieces to see. That is a far smaller thing to say yes to, and on this evidence we win it.
- **The incumbent is beatable and the bar is low.** Two shops lost this on quality alone, on a handful of
  pieces. We do not need to be cheaper.

**Do not publish the word "garbage" or name the comparison.** It is disparaging about two third parties,
it was said privately, and it buys nothing a prospect needs. What is publishable, *with Andrew's
permission*, is that the account began as a three-way trial and we were kept.

## Why — three things that travel

1. **They batch, on a clock.** Three packages, invoiced 4 Sept, 18 Sept and 2 Oct — **exactly fourteen days
   apart each time.** 15.7 jobs a package against The Smith's 3.6. One intake, one invoice, one shipment for
   sixteen jobs; the per-job overhead of a trade account is almost entirely handling, and batching is what
   makes the volume pay. The fortnightly rhythm is worth asking a prospect for by name — it is schedulable
   bench work, which single tickets never are.

   **And the packages grew fast:** 6 jobs → 15 → 26, and $237 → $2,184 → $3,027, inside one month — because
   package 1 was a trial we won, not a slow start. See *How the account was actually won* above.
2. **They send bench work, not one commodity.** The Smith is 365 laser welds — a fast, cheap, low-skill
   operation, and it prices like one at $59.80 a repair. Marlen sends retipping, stone setting and platinum
   sizing: $115.92 a repair. This is the difference between a shop that is busy and a shop that is earning.
3. **They ship.** Marlen's repairs carry `deliveryMethod: ship` with a real `outboundShipment`. Every other
   store drives it over. **A shipping account does not have to be local** — which is the whole argument for
   whether this is a Fort Smith business or a regional one.

They also pay without chasing: $2,421.42 cleared across two invoices in September.

## Where trade sits in the business

Of **$23,469.11** invoiced all time across 148 invoices, **$18,095 — 77% — is wholesale**, from seven
stores. Retail is 23%.

| Account | Invoiced | Repairs |
|---|---|---|
| The Smith | $9,687.00 | 149 |
| **Marlen Jewelers** | **$5,448.27** | 47 |
| Greers Pawn | $1,241.67 | 20 |
| Rocky's Corner | $652.18 | 21 |
| Diamonds Plus | $460.00 | 14 |
| Cooper's Coin and Pawn | $420.00 | 9 |
| Pawn Stars of Fort Smith | $186.00 | 3 |

Two accounts are 83% of trade revenue. That is the concentration risk and the opportunity in one line:
**a third Marlen is worth more than every pawn account combined.**

## What we cannot claim yet, and why

Turnaround is the thing a trade account actually buys, and **we cannot currently prove ours.**

`repairs.createdAt` is when a job was *typed into admin*, not when it *arrived*. The Sept 28 Marlen batch
was keyed in at two-minute intervals from 20:31 to 21:08, and all 18 jobs carry a `completedAt` within
three minutes of each other at batch closeout on Oct 2. Per-job turnaround is therefore an artifact of data
entry, not a measurement.

The honest claim available today is **package-level**, and now that packages are identified properly it
holds across all three rather than resting on one batch:

| Package | Keyed in | Invoiced | Span | Jobs |
|---|---|---|---|---|
| 1 | 3 Sept | 4 Sept | 1 day | 6 |
| 2 | 12 Sept | 18 Sept | 6 days | 15 |
| 3 | 28 Sept | 2 Oct | 4 days | 26 |

**Every package turned inside a week, and the largest turned in four days.** Package 3 carried promise
dates of 6–8 Oct and went back on the 2nd. That is real, repeated and good — it is just not yet a number
we can put a median on, because the start of each span is a keyboard, not a parcel.

## What to start gathering (ranked)

1. **Stamp `receivedAt` when the package is opened.** The field already exists on the repair schema and is
   `null` on every Marlen job. With it plus `outboundShipment`'s date, turnaround becomes a door-to-door
   measurement we can publish — and it is the single most persuasive number in this business.
2. **Merge Marlen's two accounts.** They exist as both `user-c9f82772` (21 repairs) and `client-35605079`
   (26 repairs). Every per-account report, including the first pass of this one, silently halves them.
   Any store that started as a walk-in client and was later made an account has this problem.
3. **Record how each account arrived, and whether it started as a trial.** Nothing in the database says
   Marlen's first package was a three-way bake-off — it took the owner saying so. That is the single most
   decision-relevant fact about the best account on the books, and it exists nowhere but in his head. A
   source field plus a "first package was a trial" flag would let us answer the only question that matters
   here: *does winning a trial reliably turn into an account, or did we get lucky once?*
4. **Ask Andrew for a quote and permission to name them** — on turnaround, on retip/stone-setting quality,
   and, most valuable of all, **permission to say the account began as a three-way trial that we were kept
   from.** A prospect being asked for a trial will believe that one. Without any of it the case study has
   to be anonymous, which costs it most of its force.
5. **Retention.** Marlen is one month old. By January there will be a repeat-cadence number, which is the
   other half of the pitch.

## The prospect to go looking for

Not "a jeweler." Specifically:

- A **retail jeweler with no bench**, or one bench that is backed up — not a pawn shop. Pawn volume is
  chain solder and laser welds at $6–$60 a ticket; retail jewelers send retipping and stone setting.
- Willing to **ship a batch weekly or fortnightly** rather than drive singles over. Ask this on the first
  call; it predicts the account's value better than anything else.
- Sells enough **platinum and prong-set goods** that retipping is routine work.

**And the ask is Marlen's own ask, handed back.** Not "move your repair work to us" — *send us five or six
pieces alongside whoever you use now, and compare.* It costs them almost nothing to agree to, it is how the
best account on the books started, and on the one run of evidence we have, we win it on quality.

Then the pitch the trial earns: *send us the batch you don't have the bench time for, we turn it in under a
week, and you'll get it back before the date we promised.*

## Open

- The Oct 2 invoice `rinv-6fb2c454` for **$3,026.85** (26 repairs) is still `open` in the system although
  the owner reports Marlen has paid. Needs marking paid or the revenue reporting drifts.
