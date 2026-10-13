# How EFD prices work

**As of 2026-10-13.** Settings read live from the production database (`efd-database`,
`adminSettings._id: repair_task_admin_settings`). Code references are to `efd-admin`.

This is a reference for someone reasoning about shop rates and profitability. It describes what the
code actually does, not what any older document says it does.

---

## 1. The three rules everything else follows

1. **One engine.** `src/services/pricing/engine.js` prices a task. Every surface in both apps —
   admin intake, the server's save, the shop's estimate — calls it. There is no second code path.
   A guard test (`oneEngine.guard.test.js`) fails the build if one appears.
2. **No stored prices.** A price is computed on every read. Task documents used to carry `pricing`,
   `basePrice` and friends; those fields are now stripped both before a task is stored and before it
   is returned (`computedFields.js`). Nothing reads a saved price, and nothing writes one.
3. **No fallbacks.** Every setting is required. A missing or invalid one throws
   `PricingError('SETTINGS_INCOMPLETE')` naming the field, and the screen shows nothing rather than a
   wrong number. The old engine read `wage || 50` and fee defaults; a real `0` became the default.

> Owner, 2026-09-30: *"Prices should always be calculated the same. There should never be old saved
> prices … If it can't be calculated, it doesn't show. There should not be a single place in the app
> that does not use the same thing. No exceptions."*

**One deliberate exception.** A line on a *saved ticket* keeps the price it was written with
(`ticketPrice: true`) until someone changes that line, the metal, or who the ticket is for. A repaired
ticket is a record of what was charged, not a live quote. (`repairLines.js`)

---

## 2. The formula

```
labor      = Σ (process hours × process quantity) × wage
             …or the task's minimumLaborPrice, whichever is higher

materials  = Σ (unit cost for THIS JOB'S METAL × quantity)

tools      = Σ (cost per use × quantity)

base       = materials + labor + tools          ← this is COST

retail     = base × retailMultiplier            ← then floors, overrides, volume tier
wholesale  = base × wholesaleMarkup             ← then floor, volume tier
```

`retailMultiplier = 1 + administrativeFee + businessFee + consumablesFee`.

Money is rounded to the cent and nowhere else. There is **no $5 rounding** (owner, 2026-09-30).

Order of operations on retail, precisely:

1. `calculatedRetail = round2(round2(base × retailMultiplier) × variantMultiplier)`
2. `retailList = task.priceOverride` **if set**, else `max(calculatedRetail, minimumRetail)`
3. the volume tier for the quantity is applied to `retailList`

`minimumRetail = max(settings.minimumTaskRetailPrice, task.minimumPrice)`. Wholesale is the same shape
with `wholesaleMarkup` and `minimumTaskWholesalePrice`, and **no override and no variant multiplier**.

---

## 3. Live settings

| Setting | Value | What it does |
|---|---|---|
| `wage` | **$50.00 / hr** | The shop labor rate. Every task, every metal, every person. |
| `administrativeFee` | 0.25 | ↓ |
| `businessFee` | 0.50 | ↓ |
| `consumablesFee` | 0.25 | ↓ |
| **retail multiplier** | **2.00×** | The three fees total 1.00, so retail is exactly 2× cost. |
| `wholesaleMarkup` | **1.20×** | Wholesale is 1.2× cost. |
| `rushMultiplier` | 1.5 | Rush fee = subtotal × 0.5. Retail tickets only. |
| `deliveryFee` | $5.00 | Flat, when the ticket includes delivery. Retail only. |
| `taxRate` | 9.5% | Retail only. |
| `minimumTaskRetailPrice` | $0.00 | No shop-wide floor is set. |
| `minimumTaskWholesalePrice` | $0.00 | No shop-wide floor is set. |

Catalog size: **34 tasks, 9 processes, 5 materials, 1 tool/machine.**

### Two stale fields

- `materialMarkup: 2` — **not applied.** It double-marked parts and was removed from the engine
  (`stullerMaterial.js`; a guard test asserts it is not used). It is still sitting in the settings
  document and should be deleted so nobody reasons from it.
- `wholesaleConfig.minimumMultiplier: 1.2` — not read by the engine. The engine reads
  `pricing.wholesaleMarkup`.

---

## 4. A worked example

A task with **0.5 labor hours**, **$4.00 of materials**, and one use of the laser welder at **$10.00**.

| | Cost build-up |
|---|---|
| Labor | 0.5 hr × $50 = **$25.00** |
| Materials | **$4.00** |
| Tools | **$10.00** |
| **Base (cost)** | **$39.00** |

| Audience | Qty 1 | Qty 20 (tier) |
|---|---|---|
| **Retail** | 39 × 2.0 = **$78.00** | **$64.00** |
| **Wholesale** | 39 × 1.2 = **$46.80** | **$38.40** |

The qty-20 numbers come from the tier maths in §6.

---

## 5. Retail vs wholesale — the number that matters

**Retail is 2.0× cost. Wholesale is 1.2× cost.** On the same job that is $78.00 against $46.80 —
wholesale brings in **60% of the retail price** for identical bench time and identical materials.

Two things make that less lopsided than it looks, and both matter for a profitability discussion:

**The $50 labor is a shop rate, not a wage bill.** The engine prices labor at $50/hr, but what the
jeweler is actually paid is a **per-person ladder rate** recorded on the labor log, which is lower. So
the "cost" in the formula over-states true cash cost, and real gross margin on both audiences is
higher than the multipliers suggest. Whatever the ladder pays is the number to subtract — not $50.

**A store's own resale is its business.** `storeResalePrice()` exists only to show a wholesale
account what *they* would charge their customer, using *their* markup setting. It never changes what
EFD charges the store.

Against that, three things make wholesale **more** expensive than retail per job, none of which the
1.2× recovers:

- stores pay **no rush fee**, **no delivery fee** and **no sales tax** — by design, since they resell;
- shipping back is billed **at cost** on the invoice, with no margin;
- volume is the point of the account, so the quantity tiers bite hardest here.

The honest summary: **wholesale is a volume play at roughly 20% over cost, and the margin lives
entirely in the gap between the $50 shop rate and what the bench is actually paid.** If that gap
narrows, wholesale profitability goes with it. That is the single most important lever in this system
and it is not a pricing setting — it is the pay ladder.

---

## 6. Quantity tiers

Flat, not bracketed: the quantity picks **one** tier and every unit is priced at it. Six prongs is six
at the 5–9 price, not four at full and two discounted.

A tier may move exactly **two** things, and labor is neither of them:

| Lever | What it is |
|---|---|
| `toolPct` | The share of **machine recovery** charged. The welder's $10/use is a sinking fund for a $500/month note sized at ~50 welds a month. Charging it on all 84 prongs of one job recovers nearly two months of the note from one customer. Reducing it corrects an over-recovery — it is not a gift. |
| `marginPct` | The share of **markup** charged. Setting twenty stones has no machine to compress, so a volume price there has to come out of profit, deliberately. |

Labor and materials are **never** reduced. The adjusted cost is the floor a tier can never price below.

```
adjustedBase = base − tool × (1 − toolPct/100)
multiplier   = listUnitPrice / base            ← read back, so retail and wholesale share one path
adjustedMark = multiplier > 1 ? 1 + (multiplier − 1) × marginPct/100 : multiplier
unitPrice    = adjustedBase × adjustedMark
```

### The live ladder

| Quantity | `toolPct` | `marginPct` | Effect |
|---|---|---|---|
| 1–4 | 100% | 100% | List price |
| 5–9 | 70% | 100% | 30% of machine recovery dropped |
| 10–19 | 50% | 100% | Half the machine recovery dropped |
| 20+ | 30% | 100% | 70% of machine recovery dropped |

**Margin is at 100% on every rung.** The current ladder only ever gives back machine recovery, so it
does nothing at all on a task with no tool cost — a labor-only task costs the same at qty 1 and
qty 50. If volume pricing is wanted on bench work, `marginPct` is the dial, and it comes straight out
of profit.

Worked, for the §4 task at qty 20: `adjustedBase = 39 − 10 × 0.70 = 32.00`; retail multiplier stays
2.0, so `32 × 2.0 = $64.00`. Wholesale: `32 × 1.2 = $38.40`.

Task minimums are deliberately **not** re-applied on top: a minimum is a single-job floor, and
enforcing it per unit would cancel the volume price.

An empty ladder means no quantity pricing at all. `DEFAULT_QUANTITY_TIERS` seeds the settings form on
first use and is never a fallback the pricing path reaches for.

---

## 7. What is deliberately *not* in a price

- **No skill factors.** Labor is the wage, full stop. Owner: *"The labor on any repair is always $50
  an hour."* Who did the work affects what they are paid, not what the customer pays.
- **No material markup.** See §3.
- **No hidden floor.** The old engine silently raised the fee multiplier to 2.0. The fees *are* the
  multiplier now; production's fees happen to total 1.0, so retail is 2.0× exactly as before.
- **No $5 rounding.**

---

## 8. Repair-level totals

```
rush     = subtotal × (rushMultiplier − 1)                  retail only
delivery = deliveryFee, when the ticket includes delivery   retail only
tax      = (subtotal + rush + delivery) × taxRate           retail only
total    = subtotal + rush + delivery + tax
```

A **store's ticket is its lines and nothing else.** A comped ticket is $0 throughout.

---

## 9. Lines that are not catalog tasks

| Line | How it is priced |
|---|---|
| Catalog task | `priceTask` — the full recipe above |
| Custom labor | `priceCustomLabor` — hours priced as a task whose only process is those hours; identical to a catalog task with the same hours |
| Stuller part | `pricePart` — the part's cost × retail multiplier, or × wholesale markup. No material markup. |
| Catalog material on its own | `priceMaterial` — same unit-cost rule as inside a task, so a portion of solder costs the same alone as it does inside "Size Down". **No volume tier** (tiers share out machine time; a material has none). |
| Custom charge (`customLineItems`) | **Not calculated.** The price is what the person typed. |

---

## 10. When the engine refuses

"Can't price this" is an answer, not a zero. The result is `{ ok: false, reason, detail }` and the
screen shows nothing. A form will not submit while any line is unpriced.

| Reason | Means |
|---|---|
| `METAL_REQUIRED` | A metal-dependent material, and no metal chosen yet |
| `UNMATCHED_MATERIAL` | That material isn't stocked in that metal |
| `UNKNOWN_MATERIAL` | Referenced material missing from the catalog |
| `WRONG_METAL` | Task is restricted to other metals (e.g. a platinum-only laser weld) |
| `NO_COST` | No labor, materials, tools **and** no minimum |
| `BAD_TASK` | No task |

### Metal keys

A metal becomes exactly one key — `yellow_gold_14k`, `sterling_silver_925`, `platinum_950` — in one
function (`metalKey`). Intake offers "Silver 925" while stock is filed under `sterling_silver`;
building the key naively gave `silver_925`, which matched nothing, so **every silver job at the
counter priced its solder and sizing stock at $0 and its wire at a whole spool's cost**
(EFD-SILVER-PRICING, 2026-09-30). Fine silver 999 and platinum 999 have no stock: their keys exist,
match nothing, and refuse to price rather than borrow sterling's or 950's cost.

When an exact karat is not stocked, the engine substitutes the nearest **higher** karat of the same
colour (10k → 14k → 18k) and reports the substitution on the result.

---

## 11. Source files

| File | What lives there |
|---|---|
| `src/services/pricing/engine.js` | The engine. `priceTask`, `priceMaterial`, `pricePart`, `priceCustomLabor`, `priceRepairTotals`, `metalKey`, settings validation |
| `src/services/pricing/quantityTiers.js` | The two levers and the ladder |
| `src/services/pricing/repairLines.js` | Every line on a repair, and its totals |
| `src/services/pricing/catalog.js` | Server-side loading; strips computed prices |
| `src/services/pricing/clientContext.js` | What crosses to the browser (costs only — no names, suppliers or SKUs) |
| `src/services/pricing/stullerMaterial.js` | Stuller part cost → price |
| `src/services/pricing/oneEngine.guard.test.js` | Fails the build if a second pricing path or a settings fallback appears |

---

## 12. Open questions worth putting to the other agent

1. **Is 1.2× the right wholesale markup?** At 60% of retail for identical work, it only pays if the
   volume is real and the pay ladder stays well under $50/hr.
2. **Should `marginPct` ever drop below 100?** Today the tiers do nothing on labor-only tasks. That is
   a defensible choice — it just means "volume discount" currently means "machine discount".
3. **Is $50/hr still the right shop rate?** It is one number driving every task in the catalog, and
   the whole margin structure sits on the gap between it and the ladder.
4. **The two stale settings fields** (§3) should be deleted before someone reasons from them.
