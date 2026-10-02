# Overnight run — 2026-10-01 → 02

> **Kind:** descriptive (what happened) · **As of:** 2026-10-01 ~04:30 CT · Run against `docs/GUARDRAILS_PLAN.md`,
> unattended, at the owner's request. Every PR went through CI (`check`: lint, tests, build, views) before merging.

## Merged

Every merge's production deploy reached **READY**, and the ship check (below) passed on each one. Verified with
`vercel inspect admin.engelfinedesign.com`: production is serving the latest merge's build.

| PR | What |
|---|---|
| [#154](https://github.com/CritterCodes/efd-toolpad/pull/154) | **Views check** (`npm run views`): every page, every role, desktop + phone, in CI. Its first run found a dead Finance → Payroll link and two empty page files that crashed (fixed). |
| [#155](https://github.com/CritterCodes/efd-toolpad/pull/155) | **Ship checks** after every deploy (anonymous, read-only). Its first run found **admin.engelfinedesign.com was indexable by search engines**; fixed (robots meta + robots.txt). |
| [#156](https://github.com/CritterCodes/efd-toolpad/pull/156) | Views burn-down 1: page titles become the `<h1>`; **four phone cut-offs fixed** (Processes, Materials, Blogs, wholesaler home). Reports show their title while loading. |
| [#157](https://github.com/CritterCodes/efd-toolpad/pull/157) | **Phase 3:** `CLAUDE.md` is a router; the five rulebooks moved to `docs/archive/`; `docs/OPEN-QUESTIONS.md` + `docs/FRICTION-LOG.md`. |
| [#158](https://github.com/CritterCodes/efd-toolpad/pull/158)–[#162](https://github.com/CritterCodes/efd-toolpad/pull/162) | `no-unused-vars` burn-down, by area (navigation, repairs, admin, production, the rest): 208 → 2. |
| [#163](https://github.com/CritterCodes/efd-toolpad/pull/163) | Claiming a repair that doesn't exist answers 404, not 500 (found by the burn-down). |
| [#164](https://github.com/CritterCodes/efd-toolpad/pull/164) | **Privacy:** the sign-in service logged every login's email, and new accounts' name/email/phone/**password hash**; a debug route logged the full Cookie header (session token). Stopped. |
| [#165](https://github.com/CritterCodes/efd-toolpad/pull/165)–[#167](https://github.com/CritterCodes/efd-toolpad/pull/167), [#169](https://github.com/CritterCodes/efd-toolpad/pull/169) | `no-console` burn-down (designs/products/AI routes, browser UI, server services, strays): 368 → 82. |
| [#168](https://github.com/CritterCodes/efd-toolpad/pull/168) | Views check: re-measure a still-loading page before calling it blank / title-less (a busy CI runner failed an unrelated PR). |
| [#170](https://github.com/CritterCodes/efd-toolpad/pull/170) | Views burn-down 2: the facelift page titles (50 files) become the `<h1>`. |
| [#171](https://github.com/CritterCodes/efd-toolpad/pull/171) | Views burn-down 3: five more titles. |

## Numbers, start → now

| | Start of night | Now |
|---|---|---|
| Lint baseline, total | 618 | **126** |
| `no-console` | 368 | **82** (all deliberate output, Q6) |
| `no-unused-vars` | 208 | **2** (both deliberate) |
| `max-lines` | 42 | 42 (not started: splitting big files isn't a mechanical change) |
| Views baseline | 296 problems | **8** (4 pages × 2 widths, all "no `<h1>`") |
| Phone cut-offs | 4 pages | **0** |
| Ship check on production | none | 6/6 on every deploy |

## Open or parked, and why

- **Signed-in checks on preview deploys:** not built. They'd need a standing admin password for a public URL (Q1).
- **React hydration mismatch (#418):** strikes random pages, so it's somewhere in the shared shell. The check lists it
  and never fails on it; the root cause isn't found yet.
- **4 pages still without an `<h1>`:** `artisan/designs/new` and `products/drops/new` (the only title is a breadcrumb,
  so which element is the heading is a design call), `repairs/bulk-print` with nothing selected, and
  `admin/repair-tasks/create`.
- **`max-lines` (42 files over 400 lines):** untouched. Splitting files changes structure, so it should go per area
  with tests, not overnight. Some of these may simply be retired by the 2026-10-31 usage report.
- **`.github/copilot-instructions.md`:** left in place (Q3).
- **`/dashboard/repairs/funnel` 503s in the views check:** not a bug. It proxies to the shop with `EFD_ADMIN_API_KEY`,
  which the check blanks on purpose.
- **Lighthouse in the ship checks:** not added.

## Needs the owner (docs/OPEN-QUESTIONS.md)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Signed-in checks on Vercel previews? | **No, for now.** The every-role signed-in crawl already runs on every PR. If wanted later: non-admin roles only, with their own throwaway passwords. |
| Q2 | Remove the Processes page's no-op "Update Prices" button? | **Yes.** Its API does nothing since the one-engine ruling. |
| Q3 | Retire `.github/copilot-instructions.md`? | **Replace it with a pointer** to `CLAUDE.md` + `eslint.config.mjs`, or archive it if nobody uses Copilot here. |
| Q4 | Retire `/dashboard/admin/migrate-repair-tasks`? | **Yes, after the 2026-10-31 usage report.** It calls an API that no longer exists. |
| Q5 | Finish or remove `api/artisans/sync-vendor`? | **Decide what it's for.** It builds a vendor profile and never saves it. |
| Q6 | Let the emergency-logout diagnostics and the status migration print? | **Yes, as three documented per-file exceptions.** Then `no-console` is zero and becomes a plain error. |

# Night, 2026-10-02 (the owner's last two rulings, then the defects list)

Every PR below went through CI and was merged one at a time. Every production deploy reached READY and passed
ship.yml.

| PR | What |
|---|---|
| [#233](https://github.com/CritterCodes/efd-toolpad/pull/233) | **The intake hook 1,492 → ~420 lines**, six pieces, each moved verbatim and called where it sat. A render test pins the exact pre-split API and fails on a temporal-dead-zone mistake. Clicked through end to end. |
| [#234](https://github.com/CritterCodes/efd-toolpad/pull/234) | **Ring sizes read from the sentence.** "size 7 down to 6" came out backwards; "size down 14k …" read the karat as 14 sizes; "currently a 9, needs a 7.5" was ignored. |
| [#235](https://github.com/CritterCodes/efd-toolpad/pull/235) | The previous report. |
| [#236](https://github.com/CritterCodes/efd-toolpad/pull/236) | **The labor-log model 619 → 222 lines** (reports and payroll split out). The class keeps delegates, so its ~20 callers and their mocks are untouched; a test pins the forwarding. |
| [#237](https://github.com/CritterCodes/efd-toolpad/pull/237) | **The Catalog page 658 → 343 lines.** Clicked through: grid, type filter, table, bulk Archive, Duplicate, Reassign, 320px. |
| [#238](https://github.com/CritterCodes/efd-toolpad/pull/238) | **Q12 — ring sizes are asked for only when the ring is being sized.** A blank size is unknown, never size 0. |
| [#239](https://github.com/CritterCodes/efd-toolpad/pull/239) | **A React #418 hydration mismatch, found and fixed.** |
| [efd-shop#87](https://github.com/CritterCodes/efd-shop/pull/87) | **EFD-DEFECTS C4 — a customer who has a password can finally reset it.** |
| [efd-shop#88](https://github.com/CritterCodes/efd-shop/pull/88) | **The shop's `test` job actually runs the tests**, and can no longer hang all night. |

## The owner's rulings, 2026-10-01

- **John Annis's admin account is retired** (*"He does not do any development work for us anymore"*). A read-only check
  first: it was referenced only by 38 notifications, no repairs or invoices. Backed up to `userMergeBackup_20261001`,
  then marked `merged` into his customer account with its email cleared, and verified afterwards. One active admin
  remains. Reversible — the record is kept, not deleted.
- **Q12** (#238). The ruling was the deciding detail: sizes matter *only* when the ring goes up or down. Checking the
  real catalog paid off twice — **Half-Shank** and **Sizing Beads** consume sizing stock without resizing anything, so
  the material is the wrong signal; and every task fills `aiMeta.requiredInfo` but **not one** lists the ring-size
  keys, so that field was useless too. The test pins all 34 production task titles.

## React #418, after a week of "random pages"

Production React prints only an error number. The same page on a `next dev` build names the element, and that found it
in one run: `/dashboard/pending` put a Chip (a `<div>`) in MUI's `secondary` slot, which renders a `<p>`. Invalid HTML,
so the browser closes the `<p>` early and the DOM stops matching the server's. **Before: hydration error. After:
clean.** The repair Move list has the same shape but only renders with repair data, so it was latent.

**A wrong turn worth recording.** The notification bell also puts elements in a `secondary`, and being in the shared
shell it looked like the obvious explanation. It is innocent: every child renders a `<span>` (`caption` falls back to
`span`), and a dev run with seeded notifications produced no message at all. The change made there was reverted. The
guard test exempts it with that reason rather than changing correct code to satisfy a rule.

`listItemTextSecondary.guard.test.js` scans every source file, so the class cannot return on a page no crawl reaches —
which matters, because a full dev-mode crawl is impractical (3 pages compiled in the time production does 101).

## Numbers

| | Start of the day | Now |
|---|---|---|
| `max-lines` (files over 400) | 42 | **21** |
| Lint baseline | 126 | **22** |
| Views baseline | 8 | **0** |
| Shop tests that gate a PR | 0 of 95 | **95** (efd-shop#88) |

## Parked, and why

- **A unique index on `users.email`** (C2): the guard against new duplicates is in, but the index would be refused
  today — `test@test.com` alone is on 21 accounts, and the owner has said those are deliberate placeholders.
- **Whether #418 is fully gone:** one cause is found and fixed. Whether it accounts for the four-page run in the
  FRICTION-LOG is not established, so the views check still lists hydration rather than failing on it.
- Unchanged: the classic intake and report page (retirement candidates), the POS products-cache price, quantity-break
  pricing, efd-shop C3/C5.

## Needs the owner

| | Question | Recommendation |
|---|---|---|
| Placeholder accounts | `test@test.com` is on 21 accounts, two of them **stores** whose email notices therefore go nowhere. Clear them? | **Give the two stores their real addresses**, leave the walk-ins blank. Then the unique email index can go on and the duplicate problem is closed for good. |
| PWA settings | `DebugInformation.js` renders the browser's user agent and URL in a way that differs between server and browser by construction. It sits behind a tab, so it may never render on load. | **Leave it** until #418 is seen again; it is the first place to look if it is. Changing it now would be a guess. |

---

# Continued — 2026-10-01, through the day

> Same run, picking up after #240 (the report above). Every PR went through CI before merging; every production
> deploy reached READY and the ship check passed.

## Merged

| PR | What |
|---|---|
| [#241](https://github.com/CritterCodes/efd-toolpad/pull/241) | **Q14 — retip and whole-catalogue pricing**, opened with the audit behind it (below). Documentation only; no price moved. |
| [#242](https://github.com/CritterCodes/efd-toolpad/pull/242) | max-lines: Leads page 643 → under the limit. |
| [#243](https://github.com/CritterCodes/efd-toolpad/pull/243) | **Five selection bars were 160px off-centre**, and at 320px the action button sat off-screen. Fixed + guard test. |
| [#244](https://github.com/CritterCodes/efd-toolpad/pull/244) | **Q15 — Half-Shank bills ten portions of sizing stock** while every size-up bills one. |
| [#245](https://github.com/CritterCodes/efd-toolpad/pull/245) | max-lines: Labor Review page 609 → 376, with 13 cases over the two figures a reviewer decides on. |
| [#246](https://github.com/CritterCodes/efd-toolpad/pull/246) | max-lines: **AppShell** 609 → 230. The shared shell, so verified by clicking through a clean build. |

## The selection bar, and why lint could never have found it

Five pages centre a floating action bar with `left: 50%` + `translateX(-50%)`, inside MUI's `<Slide>`. **`Slide` sets
its own `transform`**, so the centring half is simply overwritten — the bar sat a full half-width to the right on
every one of them. On a 320px phone that put the primary button past the edge of the screen, unreachable.

Nothing static could catch it: both properties are valid, and they are in different components. The fix is
`left: 0; right: 0; mx: 'auto'; width: 'fit-content'`, which does not use `transform` at all, and
`slideCentering.guard.test.js` now fails if `translateX(-50%)` reappears in any file that also uses `<Slide>`.

## Pricing: a full audit of all 34 repair tasks

The owner asked for this in the middle of an 84-prong retip job, saying he felt guilty about his prices. The method
mattered more than the spreadsheet: every figure below came from **driving the real pricing engine** over the real
production tasks with the real settings, never from recomputing a price by hand.

**The result was the opposite of the worry.** EFD stores **one price per task for every metal**. A trade shop prices
metal by metal. So the platinum retip is at about **41% of the trade rate**, while gold retips sit above it — the
problem is the single-rate structure, not the number. That is **Q14**: price-moving, so nothing was changed.

Also found, and all left alone: **Half-Shank consumes ten portions of sizing stock** against a size-up's one — about
$206 of 14k metal, $370 of platinum, before any labour (**Q15**); **rhodium plating at $7.06** against a trade
surcharge near $33; **fourteen services on the trade sheet with no EFD task at all**; and two duplicate "(Copy)"
tasks in the catalogue.

**A correction worth recording.** The first draft of this audit quoted Geller Blue Book figures taken from an undated
source, and the owner asked which year. They were stale — the current edition is Release 6.6, November 2025, after
significant increases. Q14 now carries that warning at the top, and the comparison was rebuilt on a trade sheet that
publishes its date.

## Numbers

| | Start of the day | After #240 | Now |
|---|---|---|---|
| `max-lines` (files over 400) | 42 | 21 | **18** |
| Lint baseline | 126 | 22 | **19** |
| Views baseline | 8 | 0 | **0** |

## Needs the owner

| | Question | Recommendation |
|---|---|---|
| **Q14** | EFD charges one rate per task for every metal. Platinum work is priced far under the trade rate, gold retips over it. | **Price by metal.** It is the structure, not the number — and it is the only change that fixes the platinum shortfall without raising gold. Read Geller Release 6.6 first if access can be had. |
| **Q15** | Half-Shank bills ten portions of sizing stock; every size-up bills one. | Set it to what a half shank actually consumes. One or two is the likely answer, but how much stock it eats is a bench question, not something to infer. |

---

# Continued — the defect sweep

> Picking up after the section above. admin #248–#251, shop #89–#91. Every PR went through CI before merging;
> every production deploy reached READY.

## What the night was actually about

The max-lines burn-down was the task on the list. The defects were what the burn-down kept walking into: splitting
the repair detail page meant reading it, and reading it found a header that ran off a 320px phone. That is most of
what is below.

## Merged

| PR | What |
|---|---|
| [#248](https://github.com/CritterCodes/efd-toolpad/pull/248) | max-lines: repair detail page 557 → 288, plus the 320px header fix. |
| [#249](https://github.com/CritterCodes/efd-toolpad/pull/249) | **F40** — the Closeout tab called the after photo mandatory. It has not been since 2026-07-31. |
| [#250](https://github.com/CritterCodes/efd-toolpad/pull/250) | **B6** — you could pass the QC on work you did yourself. |
| [#251](https://github.com/CritterCodes/efd-toolpad/pull/251) | **P4** — a payroll credit that could never be batched. |
| [shop #89](https://github.com/CritterCodes/efd-shop/pull/89) | **C3** — the invite email contradicted itself three ways. |
| [shop #90](https://github.com/CritterCodes/efd-shop/pull/90) | `/artisans` was a bare 404; the directory is at `/vendors`. |
| [shop #91](https://github.com/CritterCodes/efd-shop/pull/91) | **C5** — an overpaid repair invoice settled as a clean `paid` with no trace. |

## Three that were worth the night

**C3 — the invite that argued with itself.** One template served two emails that have nothing in common: a reset
someone asked for, and a claim invite nobody asked for. It was written for the reset. So a customer whose account the
studio had just created received the subject *"Your Account Is Ready"* over a body headed *"Reset Your Password"*,
telling them the link expired in **2 hours** and that they should ignore it if they hadn't asked — and they hadn't.
The 2 hours was wrong for everyone: a reset token lasts 1 hour, a claim token 7 days. Never 2, for anybody, ever.

**C5 — the overpayment that left no trace.** Two *online* payments cannot collide; the quote refuses an invoice that
is paid or already checking out. The counter can. Admin writes cash straight onto the invoice and knows nothing about
a Stripe session in flight, so: customer opens the pay link for $43.80, walks up and pays cash, the webhook fires and
takes $43.80 again. `remainingBalance` is clamped at zero, the invoice settles as `paid`, and the money the customer
is owed back exists nowhere. The charge is captured by the time the webhook runs, so it cannot be refused — only
recorded. It is now `overpaidBy` on the invoice and an email to the shop.

**B6 — the easier door.** `separate` QC mode means someone else checks the work. The route only checked the
`qualityControl` capability, so a jeweler holding both could pass their own repair. And the sink that mattered was
not the one in the bench action: **the Move page and the scan's "Approve QC" post straight to
`complete-from-qc`**, past it entirely. Scan your own ticket, approve it, labour credited and an invoice raised.
Guarding one sink would have left the shorter path open. This is the shape of the work-order sync hotfix from
2026-10-01, and the guard test now finds QC-pass sinks by what they *call* rather than by a list.

## Read production before changing it

Three times tonight a read-only query decided the change:

- **B6** — the shop is in self-certify mode (owner, 2026-09-22) with exactly one person holding `qualityControl`. So
  the new refusal is dormant and cannot block tonight's bench. Without that check it would have been a change made
  blind to whether it stops work.
- **P4** — zero unbatched candidate logs in either database. Nothing is stranded today, which is what made widening
  the week match a strict no-op rather than something that moves money.
- **C2** — still blocked. `test@test.com` is on 21 accounts, two of them stores.

## Numbers

| | After #247 | Now |
|---|---|---|
| `max-lines` (files over 400) | 18 | **17** |
| Views baseline | 0 | **0** |
| Shop tests | 99 | **102** |

## Needs the owner

| | Question |
|---|---|
| **Q14** | EFD charges one rate per task for every metal. Platinum sits far under the trade rate, gold retips over it. |
| **Q15** | Half-Shank bills ten portions of sizing stock; every size-up bills one. |
| Placeholder accounts | Two **stores** are on `test@test.com`, so their email notices go nowhere. Clearing them also unblocks the unique email index (C2). |
