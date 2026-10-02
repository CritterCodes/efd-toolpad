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

---

# Continued — the UI night

> admin #252–#257. The owner's words, 2026-10-02: *"i hate efd admin and love efd-shop"*, then
> *"kuzu is a million times better. its not the colors i love in kuzu, its components and look."*
> Then, on the plan: *"full send."*

## The finding the night turned on

A `critique` run through the vendored Impeccable skill — two isolated assessments, a design review and a
mechanical detector-plus-browser pass, neither seeing the other — found something that changed the brief.

**Kuzu's primitives ARE efd's primitives.** `kuzu/packages/ui/src/primitives.tsx` says so in its own header:
the Kuzu kit was ported *out of* efd-admin's `src/components/facelift`. Same names, same props, same
"which control for which job" doctrine comments.

So the thing the owner loves is not the components and not the colour. It is what surrounds them:

| | Kuzu | efd-admin |
|---|---|---|
| median screen file | 40 lines | **128** |
| inline style objects | 58 | **4,778** |
| kit exports / adoption | 97, ~every screen | 21, **18 of 384** |
| route-level loading/error/not-found | every app | **zero** (130 files hand-place a spinner) |
| `<main>` | one recipe: padding, max-width, fixed gap | `<Box component="main" sx={{ flex: 1 }}>` |

That is why the palette stays. `theme.js` is a deliberate 543 lines — a three-tier shadow ramp, global
`tabular-nums`, `containedPrimary` scoped so semantic buttons keep their fills, `-webkit-autofill` handled
so it does not punch a white box in the dark ground. **The tokens were never the problem.**

## Merged

| PR | What |
|---|---|
| [#252](https://github.com/CritterCodes/efd-toolpad/pull/252) | The defect-sweep report. |
| [#253](https://github.com/CritterCodes/efd-toolpad/pull/253) | **Four rows rendered white text on near-white**, measured at 1.11:1 and 1.05:1. |
| [#254](https://github.com/CritterCodes/efd-toolpad/pull/254) | Repair detail rebuilt on the kit; four new primitives; two date and money defects found doing it. |
| [#255](https://github.com/CritterCodes/efd-toolpad/pull/255) | The reading column: every screen centred in one max width. |
| [#256](https://github.com/CritterCodes/efd-toolpad/pull/256) | `Field` rows across the two biggest offenders — 71 → 37 sites. |
| [#257](https://github.com/CritterCodes/efd-toolpad/pull/257) | Route-level loading, error and not-found states. |

Every production deploy reached READY.

## The one a jeweler would have noticed

Two rows on the repair detail carried light-theme Material fills — `#e3f2fd` and `#ffebee` — and inherited
the white text above them. **1.11:1 and 1.05:1.** The blue one reads *"1x 14k sizing stock 3x2mm —
Material — Stuller"*: the line naming the metal to pull was the one line on the page that could not be
read. It had been on screen since the facelift.

The vendored detector never caught it, and the reason matters. Given minimal repro files it flags
`backgroundColor: '#e3f2fd'` but is **blind to MUI's `bgcolor` shorthand**, which is the form three of the
four took. It is also blind to a local palette object, and `bgPanel: '#131416'` is copy-pasted into twelve
files. So the 420 colour findings in the design report are a floor, not a count — the tool is blind to the
exact shape the worst drift takes.

Hence `lightFillOnDarkGround.guard.test.js`, keyed on **relative luminance** rather than a list of known
hexes, so the next one is caught whatever it is. Running it found four more that are light *by design* —
a printable transfer document, two Stripe Embedded Checkout mount nodes, a Recharts tooltip — now exempt
with a reason each, plus a case asserting **every exemption still earns its place**. That is this repo's
existing failure mode: `.impeccable/config.json` whitelists Arial for `repairs/pick-up/page.js`, the print
CSS moved into `invoicePrint.js`, and the waiver has been passing against nothing ever since.

## The frame, and why it shipped as a half

The plan said to put the page recipe on the shared `<main>`. Measuring first showed that would have been
wrong: the shell contributes nothing today and **all 384 screens supply their own padding** — `p: 3` 32
times, `p: 4` 22, `p: 2` 13, `p: 1.5` 9, `p: 6` 7. Adding padding there would have doubled every gutter in
the app on one commit.

So #255 ships the half that is safe globally — the reading column, which no page sets for itself — and
`PageBody` carries the gutter and the rhythm for screens to adopt a segment at a time. The guard pins that
split *including the mistake*, because adding padding to the shell would not look like a mistake. It would
look like finishing the job.

## Found while building, not before

Three defects surfaced only because a screen was being rebuilt and therefore read closely:

- **The promise date rendered a day early.** A promise date is stored as a bare `YYYY-MM-DD`, and
  `new Date('2026-10-14')` is UTC midnight — the evening of the 13th in Central. The record said the 14th;
  the page said the 13th.
- **One price column mixed `$40` with `$63.67`**, defeating the `tabular-nums` the theme already sets.
- **A missing repair reports "Access Denied: You can only view repairs that you created"** — to an admin,
  about a repair that is not there. Logged separately rather than widening a UI PR.

## Numbers

| | Start of the night | Now |
|---|---|---|
| `<strong>Label:</strong>` sites | 82 | **37** |
| files importing the kit (under `src/app`) | 8 | **22** |
| route-level loading/error/not-found files | **0** | **5** |
| `max-lines` (files over 400) | 42 | **17** |
| Views baseline | 0 | **0** (115 pages, 0 problems, on every UI build) |

## Parked

- **`PageBody` adoption.** The primitive is in; no screen uses it yet. Converting means stripping each
  page's own padding, which is a per-segment job, not a sweep.
- **The remaining 37 label sites**, spread thin across 17 files — several of them print templates, which
  stay ink-on-white and are correctly excluded.
- **TabRail.** 30 files use MUI `<Tabs>`; **11 of them hand-patch `MuiTabs-scroller`**, each solving the
  same phone problem independently.

## Needs the owner

| | Question | Recommendation |
|---|---|---|
| **Q14** | EFD charges one rate per task for every metal. Platinum sits far under the trade rate, gold retips over it. | Price by metal. It is the structure, not the number. |
| **Q15** | Half-Shank bills ten portions of sizing stock; every size-up bills one. | Set it to what a half shank actually consumes — a bench question, not one to infer. |
| Placeholder accounts | Two **stores** are on `test@test.com`, so their email notices go nowhere. | Give them real addresses; it also unblocks the unique email index (C2). |

---

# Continued — the UI plan finished, then back to the defects

> admin #259–#264, shop #92. The five UI items the owner approved are all merged.

## The UI plan, done

| PR | What |
|---|---|
| [#259](https://github.com/CritterCodes/efd-toolpad/pull/259) | **TabRail** — one home for a row of a page's views. |
| [#260](https://github.com/CritterCodes/efd-toolpad/pull/260) | **Gold discipline** — ten gold elements above the fold down to one. |

Together with #254–#257 that is all five: the page frame, `Field` rows, route-level states, the tab rail,
and gold. Every one shipped with a **115-page views crawl at 0 problems** and screenshots from a local
production build.

**The measured difference on `/dashboard`:** 10 gold elements above the fold → **1**, and the one left is
`Payroll` — the next unfinished step on the checklist. The second gold anywhere on the page is the global
action FAB, fixed in the corner, which is app chrome and the right place for it.

**On My Bench at 375px:** five lanes, all **44px**; the track scrolls (535px of content in 341px) while the
page does not; the end fade shows on load; tapping the last lane scrolls it into view and flips the fade to
the other edge. MUI's `scrollButtons` — which **11 files** still pass — never renders on a touch screen, so
those last lanes used to be reachable only by a swipe with nothing on screen suggesting one existed.

## Back to the defect list

| PR | What |
|---|---|
| [#261](https://github.com/CritterCodes/efd-toolpad/pull/261) | **Q16** — a scanned "Needs parts" records no part and re-prices nothing. Written up, not decided. |
| [#262](https://github.com/CritterCodes/efd-toolpad/pull/262) | **Q2** — drop-off applied a *declined* estimate. |
| [#263](https://github.com/CritterCodes/efd-toolpad/pull/263) | **P2** — the payroll queue and the batch disagreed on who is payable. |
| [#264](https://github.com/CritterCodes/efd-toolpad/pull/264) | **P7** — three notification links went nowhere, or somewhere wrong. |
| [shop #92](https://github.com/CritterCodes/efd-shop/pull/92) | **Q5** — "Estimate emailed" now means the estimate was emailed. |

### The one with a customer on the other end

**Q2.** `convertLeadToRepair` applied the quote's priced work whenever one existed — draft, sent, declined,
expired. So a customer quoted **$400** who **declined**, then turned up with the piece anyway, got a repair
carrying the $400 of work they had just refused.

The screen had been right all along. `leads/page.js` tells the person at the counter *"No accepted estimate
on this lead, so it converts as-is."* That is why it needed no ruling: the intended behaviour was already
written down, on screen.

Tracing the second caller changed the fix. Bench Day's **"Arrived"** also converts, and the appointment
deliberately stays `active` afterwards because the bench is genuinely occupied — so the button can be
pressed twice. With the new guard the second press would have **thrown at the counter**. It now skips the
conversion instead: the arrival still records, and nothing is re-applied over work since priced.

### The one that was one log away

**P2.** `ownerUserIDs` is what keeps a non-owner's `payer:'self'` labour out of payroll — it realizes at
sale through consignment, so paying it here pays it twice. The **queue** passed it. The **breakdown** did
not even accept it, and the batch is built from the breakdown. The figure on screen and the figure paid
were different numbers, and `buildUnbatchedMatch` applies the clause only when it gets an array, so the
omission was silent rather than an error.

Read-only first: **zero `payer:'self'` logs exist in either database**, so nobody has been double-paid.
This was one non-owner self-labour log away from being real money.

### The one a 404 check would have missed

**P7.** `/dashboard/payroll` has never existed, and two notifications sent an artisan there — *"You have
been paid"* and *"Payouts Enabled"*. In an email and a push, tapped on a phone, away from the shop.

The third is subtler and nearly went out wrong. `/dashboard/products/pending` is **not** a 404: it matches
`[id]`, so an admin tapping *"New Product Awaiting Approval"* got a product detail screen for a product
called "pending". My first fix pointed it at `/dashboard/pending`, which exists but is a different queue.
The test caught it by reporting the route as *resolving*, which is what made me look at where.

So the guard fails on both shapes: a route that renders nothing, and a hard-coded segment that only matches
a `[param]` folder. **A page that is wrong is worse than a page that is missing, because nothing reports
it.**

## Read production before changing it — four times tonight

| Defect | What the check said | What it changed |
|---|---|---|
| B4 / Q16 | zero repairs in any parts status | latent, so it went to the owner rather than being rushed |
| P2 | zero `payer:'self'` logs | safe to fix; nobody to reimburse |
| P4 | zero unbatched candidates | the week-match widening was a provable no-op |
| B6 | self-certify mode, one `qualityControl` holder | the new refusal is dormant and cannot block the bench |

## Numbers

| | Start of the night | Now |
|---|---|---|
| gold elements above the fold on `/dashboard` | 10 | **1** |
| `<strong>Label:</strong>` sites | 82 | **37** |
| files under `src/app` importing the kit | 8 | **22** |
| route-level `loading`/`error`/`not-found` | 0 | **5** |
| hand-patched `MuiTabs-scroller` | 2 | **0** |
| `max-lines` (files over 400) | 42 | **17** |
| Views baseline | 0 | **0** |
| shop tests | 95 | **109** |

## Parked

- **`PageBody` adoption.** The primitive is in and the shell carries the reading column; no screen uses the
  gutter yet, because each must drop its own padding first. Per segment, not a sweep.
- **The remaining 37 label sites**, spread across 15 files at 1–4 each; four are print templates that
  correctly stay ink-on-white.
- **`scrollButtons` in 9 more files** — a ratchet that may only go down.
- **B4** and the rest of **B6** (no QC fail, no per-card pass) — both need a decision, not just code.

## Needs the owner

| | Question | Recommendation |
|---|---|---|
| **Q14** | One rate per task for every metal. Platinum under the trade rate, gold retips over it. | Price by metal. It is the structure, not the number. |
| **Q15** | Half-Shank bills ten portions of sizing stock; every size-up bills one. | Set it to what a half shank consumes — a bench question. |
| **Q16** | A scanned "Needs parts" records no part and re-prices nothing. | Send a single scan to the parts dialog; refuse a batch. The moment the piece is in your hand is the moment you know the part. |
| Placeholder accounts | Two **stores** share `test@test.com`, so their email notices go nowhere. | Give them real addresses; it also unblocks the unique email index (C2). |
| efd-shop branch protection | `gh pr merge` does not wait for CI there, because there is no required check. | Give efd-shop the same protection as efd-toolpad, so the two repos behave the same way. See the friction log. |

---

# 09:30 — the rails, the rows, and three things the browser said that the greps did not

> admin #265–#273, all merged, all reached Vercel READY with `ship.yml` green. The five UI items you
> approved are finished at the primitive level. What is left of them is adoption, which is per-screen.

| PR | What |
|---|---|
| [#265](https://github.com/CritterCodes/efd-toolpad/pull/265) | The run report up to that point. |
| [#266](https://github.com/CritterCodes/efd-toolpad/pull/266) | `max-lines` burn-down: My Bench 557 → 393 effective. |
| [#267](https://github.com/CritterCodes/efd-toolpad/pull/267) | **Correction** — `PageBody` carried a second gutter. |
| [#268](https://github.com/CritterCodes/efd-toolpad/pull/268) | `Field` rows in the approve-and-reject dialogs. |
| [#269](https://github.com/CritterCodes/efd-toolpad/pull/269) | `TabRail` → Wholesale Management, Customs, Drops. Ratchet 9 → 6. |
| [#270](https://github.com/CritterCodes/efd-toolpad/pull/270) | `TabRail` → the guide, admin settings, materials, fit views, one custom order, one design. **6 → 0.** |
| [#271](https://github.com/CritterCodes/efd-toolpad/pull/271) | `Field` rows → completed repairs, the repair card grid, an artisan's business card. |
| [#272](https://github.com/CritterCodes/efd-toolpad/pull/272) | **Signed out, the app had no theme.** A white card and a blue button. |
| [#273](https://github.com/CritterCodes/efd-toolpad/pull/273) | **The 44px touch floor** was a rule we held ourselves to but never put in the theme. |

Open as of this report: [#274](https://github.com/CritterCodes/efd-toolpad/pull/274), `TabRail` for the
three profile headers.

## Three things the browser said that the greps did not

### 1. Two counts in the plan were overstated — by me, twice, before I checked

A grep counts shapes that *look like* the bug.

| The plan said | It actually was | Why the grep lied |
|---|---|---|
| "11 files hand-patch `MuiTabs-scroller`" | **2** patched the scroller; 11 passed `scrollButtons` | the pattern was an alternation of the two |
| "82 `<strong>Label:</strong>` sites in 19 files" | **9** were a label followed by a value | the rest are print and email templates — ink-on-white documents rendered outside the app's CSS, with no kit to import — and prose emphasis: `<strong>Security Notice:</strong> This PIN will only be displayed once.` is a sentence with a lead-in, not a field |

Neither changes what was built. Both change how much was left, and I reported the larger number twice before
checking it. Both now have a guard test holding the *strict* rule, so the count cannot drift back to the
loose one.

### 2. Signed out, the app had no theme at all

`RootLayout` returns early when there is no session — and the MUI theme is mounted by
`RoleAwareNavigationProvider`, which only the signed-in branch rendered. The `/auth/*` pages hid it: they are
built on `AuthShell`, hand-written CSS Modules carrying their own black ground. The two signed-out pages
made of plain MUI did not.

- **`/auth/change-password`** — a page a person is *required* to pass through — was an all-white card with a
  grey heading and a **blue** button, in a black-and-white-and-gold app.
- **`/emergency-logout`** put text on a pale blue Alert; a kit label measured about **1.1:1**.

Both are pages you reach *when something has already gone wrong*, which is the worst moment to be handed a
screen that looks like a different product. Found by opening the page by hand while signed out, after a
`Field` conversion there rendered invisible and was reverted.

**`npm run views` cannot catch this.** It signs in and then crawls 115 pages, so it never visits either page
in the state a locked-out person sees. Friction log has a proposal: a small anonymous pass.

### 3. The app's own 44px rule was not in the theme

MUI's floors are **40px** for a contained button and **34px** for `size="small"`. A default button measured
**42.5px**. Nothing is wrong on a desktop with a mouse, which is why it survived a facelift, a theme and a
views check.

#273 raises the floor to 44 under `pointer: coarse` only — buttons, icon buttons (square: they are aimed at
in both directions), menu rows, autocomplete rows and **clickable** chips. A status chip is read, not
tapped, and inflating a row of them would wreck it. Measured on `/dashboard/admin/tasks/materials` at 375px:
16 interactive controls, **zero** under 44. At desktop width the same page is unchanged.

## Numbers

| | Start of the night | Now |
|---|---|---|
| gold elements above the fold on `/dashboard` | 10 | **1** |
| `<strong>Label:</strong> {value}` on a surface the kit reaches | 9 | **1** |
| `scrollButtons` — a prop that never renders on touch | 11 | **0**, now a ban |
| hand-patched `MuiTabs-scroller` | 2 | **0**, now a ban |
| rows still rendered with MUI's own `<Tabs>` | 19 | 19 (16 once #274 lands) |
| files under `src/app` importing the kit | 8 | **43** |
| route-level `loading`/`error`/`not-found` | 0 | **5** |
| `max-lines` (files over the ceiling) | 42 | **16** |
| guard tests | 4 | **18** |
| Views baseline | 0 | **0** |

## Parked, and why

- **`PageBody` adoption.** The primitive and the reading column are in; no screen takes the vertical rhythm
  yet, because each must drop its own `mb:` first. Per segment, not a sweep.
- **16 files still render `<Tabs>` by hand** after #274. The ban covers the *broken* half; these are merely
  hand-written — though the artisan profile header proves "merely" is not safe to assume.
- **Shaped loading states.** `/dashboard/loading.js` means no dashboard route blanks any more, but it is one
  generic panel, and **133 files still place a `<CircularProgress>` themselves**. A table route deserves a
  table skeleton.
- **F24, the subdocument replace.** Five incidents, each a silent data loss. A guard needs a list of the
  subdocument field names rather than a general rule — designed, not built.
- **B4, and the rest of B6** (no QC fail, no per-card pass). Both need a decision, not just code.

## Needs you

| | Question | Recommendation |
|---|---|---|
| **Q14** | One rate per task for every metal — platinum under the trade rate, gold retips over it. | Price by metal. It is the structure, not the number. |
| **Q15** | Half-Shank bills ten portions of sizing stock; every size-up bills one. | Set it to what a half shank consumes. A bench question. |
| **Q16** | A scanned "Needs parts" records no part and re-prices nothing. | Send a single scan to the parts dialog; refuse it in a batch. |
| Placeholder accounts | Two **stores** share `test@test.com`, so their email notices go nowhere. | Give them real addresses; it also unblocks the unique email index (C2). |
| efd-shop protection | `gh pr merge` does not wait for CI there — no required check. | Give efd-shop the same protection as efd-toolpad. |
| **Dev data** | `efd-database-DEV` holds the six `views.check` users and essentially nothing else — no repairs, no customs, no drops, no materials. Four conversions this session shipped on a build plus an identical-shape argument rather than a render, because there was nothing to render. | A seed script writing one row of each kind, run by the views tooling. It is the difference between "115 pages load" and "the card works". |

---

# 10:30 — the browser kept being right

> admin #274–#280, all merged, all reaching Vercel READY with `ship.yml` green. #281 (F52) is open.

| PR | What |
|---|---|
| [#274](https://github.com/CritterCodes/efd-toolpad/pull/274) | `TabRail` for the three profile headers — the artisan one's **fourth tab was unreachable**. |
| [#275](https://github.com/CritterCodes/efd-toolpad/pull/275) | The previous run report. |
| [#276](https://github.com/CritterCodes/efd-toolpad/pull/276) | **F48** — the bench can look a part up instead of remembering its number. |
| [#277](https://github.com/CritterCodes/efd-toolpad/pull/277) | `TabRail` for user management and artisan applications; counts out of the label strings. |
| [#278](https://github.com/CritterCodes/efd-toolpad/pull/278) | Rendering the two `Field` conversions that shipped without being rendered. |
| [#279](https://github.com/CritterCodes/efd-toolpad/pull/279) | **Gold discipline** on artisan applications: four side-stripes, two of them gold. |
| [#280](https://github.com/CritterCodes/efd-toolpad/pull/280) | **F41** — merging an invoice no longer means typing its ID from memory. |

## The pattern in this batch: open the page

Every real find came from rendering something, and none of them from reading it.

- **#274.** The `scrollButtons` ratchet could not see the artisan profile header, because that header never
  passed `scrollButtons` — it was worse. Four `<Tab>`s in MUI's *default* variant, no overflow handling at
  all: at 375px the track is 271px against 460px of labels, so **"My Bench", the fourth, was clipped
  mid-word** with nothing saying more existed. "Not flagged" and "not broken" are different claims.
- **#278** is me correcting my own shortcut. #271 shipped two `Field` conversions on *"the build is clean
  and the shape is identical"*, and I logged "the dev database is too empty to render it" as friction. The
  gap was mine: this repo has `@testing-library/react` and a jsdom environment, with five component tests
  already in it. Eleven cases now, no production code touched. The one worth having: a missing promise date
  used to render the literal string **"N/A" in the same type as a real date**.
- **#279.** `primary.main` and `warning.main` are **both `#FBBF24`**, so "one gold stat card" was two.
  Reading the source would have shown two different token names.

## F-numbers closed

| | |
|---|---|
| **F48** | The parts dialog searches the catalogue. Typing a number you know still works and fetches nothing. |
| **F41** | Merge is a picker over the same targets that were already printed underneath as a caption. |
| **F19** | **Already fixed, found while checking** — `/dashboard/production/invoices` has had mark-paid and void since the artisan-invoice rail landed. No work needed. |

## Numbers

| | Start of the night | Now |
|---|---|---|
| `scrollButtons` | 11 | **0** (a ban) |
| hand-patched `MuiTabs-scroller` | 2 | **0** (a ban) |
| rows still rendered with MUI `<Tabs>` | 19 | **14** |
| `<strong>Label:</strong> {value}` where the kit reaches | 9 | **1** |
| files under `src/app` importing the kit | 8 | **46** |
| guard tests | 4 | **19** |
| component tests that actually render | 5 | **12** |
| `max-lines` (files over the ceiling) | 42 | **16** |
| Views baseline | 0 | **0** |

## Parked

- **`PageBody` adoption** — the primitive is in, no screen takes the vertical rhythm yet. Per segment.
- **14 hand-written `<Tabs>` rows.** The ban covers the broken half; #274 is why "merely hand-written" is
  not a safe assumption.
- **133 files still place their own `<CircularProgress>`.** No dashboard route blanks any more, but
  `/dashboard/loading.js` is one generic panel; a table route deserves a table skeleton.
- **F24, the subdocument replace** — five incidents, each a silent data loss. Needs a list of subdocument
  field names rather than a general rule. Designed, not built.
- **B4 and the rest of B6** — both need a decision, not just code.

## Needs you

**Q17 is new and it is only words:** what a store reads for a repair's status (F52, #281). The table and
the reasoning are in `docs/OPEN-QUESTIONS.md`. The two I am least sure of: **"Pricing"** for `NEEDS QUOTE`
may read as *putting the price up* rather than *working one out*, and **"In the queue"** for
`READY FOR WORK` is honest but tells a store it is waiting, which the old wording hid.

Still open from before: **Q14** (one rate per task for every metal), **Q15** (Half-Shank bills ten portions
of sizing stock), **Q16** (a scanned "Needs parts" records no part), the two **stores sharing
`test@test.com`**, **efd-shop branch protection**, and **dev data** — `efd-database-DEV` has the six
`views.check` users and almost nothing else, which is why #278 exists.

---

# PAUSED — owner asked for a stopping place

> admin **#281–#288**. Everything below #288 is merged and reached Vercel READY with `ship.yml` green;
> #288 is open and green-pending. Twenty-six PRs merged across the whole run (#265–#287).

| PR | What |
|---|---|
| [#281](https://github.com/CritterCodes/efd-toolpad/pull/281) | **F52** — a store read our internal state machine, in capitals. |
| [#282](https://github.com/CritterCodes/efd-toolpad/pull/282) | The previous run report. |
| [#283](https://github.com/CritterCodes/efd-toolpad/pull/283) | **F14** — a user was approved or rejected and told nothing at all. |
| [#284](https://github.com/CritterCodes/efd-toolpad/pull/284) | The customs artisan audit. |
| [#285](https://github.com/CritterCodes/efd-toolpad/pull/285) | All four holes that audit found. |
| [#286](https://github.com/CritterCodes/efd-toolpad/pull/286) | A loading state should be the shape of what is coming. |
| [#287](https://github.com/CritterCodes/efd-toolpad/pull/287) | `TabRail` — six more rows; ratchet 14 → 8. |
| [#288](https://github.com/CritterCodes/efd-toolpad/pull/288) | `TabRail` finishes: `<Tabs>` reaches **0**. *(open)* |

## The UI order, finished to the primitive level

| | |
|---|---|
| 1. `PageBody` | primitive in, shell owns the reading column. **Adoption is per-screen and not started** — each screen must drop its own `mb:` first. |
| 2. `Field`/`FieldList` | **done.** Strict count 9 → **1**, and the one left is arguably not the bug. |
| 3. Route states | **done.** 5 → **10** files, shaped per segment: a table route gets a table skeleton, a card route a card grid. |
| 4. `TabRail` | **done.** All three counts 0 and all three bans. |
| 5. Gold discipline | `/dashboard` 10 → 1; artisan applications 4 → 1. **The rest of the app is unswept.** |
| 6. EFD-DEFECTS | F48, F41, F52, F14 closed. F19 found already fixed. Customs holes 1–4 closed. |

## Scoreboard

| | Start of the run | Now |
|---|---|---|
| `scrollButtons` · `MuiTabs-scroller` · `<Tabs>` | 11 · 2 · 19 | **0 · 0 · 0**, all bans |
| `<strong>Label:</strong> {value}` where the kit reaches | 9 | **1** |
| files under `src/app` importing the kit | 8 | **58** |
| route-level `loading`/`error`/`not-found` | 0 | **10** |
| guard tests | 4 | **21** |
| component tests that actually render | 5 | **14** |
| `max-lines` (files over the ceiling) | 42 | **16** |
| Views baseline | 0 | **0** |

## Three mistakes worth keeping

**I broke every page in the app**, and CI caught it. F14 wired a notification stub to the live service with
a module-scope import; the navigation modules import `unifiedUserService`, which imports that stub, so
`mongodb`, `email` and `webPush` landed in the **client** bundle — 212 page-errors, every role. The cause
behind the cause is in my own PR body: *"No UI surface changed, so no views run."* That was a judgement I
do not get to make. **Rule now in the friction log: build and crawl every PR touching `src/lib` or
`src/services`.**

**A grep count is a hypothesis, not a defect count.** "11 files hand-patch `MuiTabs-scroller`" was 2.
"82 `<strong>Label:</strong>` sites" was 9. I reported the inflated number twice before checking it.

**A guard that reads documentation is worse than no guard.** An assertion that the old
`email?.includes('@')` idiom was gone passed on the file's *header comment describing that idiom*, and
failed on the fixed code. Removed, with the reason written in place.

## Parked, and why

- **`PageBody` adoption** — per segment; each screen drops its own margins first.
- **Gold discipline beyond `/dashboard` and artisan applications** — the sweep is unstarted.
- **133 files still place their own `<CircularProgress>`.** No route blanks any more, but the in-page
  spinners are untouched.
- **F24, the subdocument replace** — five incidents, each a silent data loss. Needs a list of subdocument
  field names rather than a general rule. Designed, not built.
- **B4 and the rest of B6** — both need a decision, not just code.
- The rest of §4 F-numbers, §4c Q6, §4d P7, §5.

## Needs you

| | Question |
|---|---|
| **Q17** | The store-facing status words (F52, shipped). Least sure of **"Pricing"** for `NEEDS QUOTE` and **"In the queue"** for `READY FOR WORK`. |
| **Q18** | May an artisan add a note or a reference image to a custom? Recommended **images yes, notes no**. |
| **Q14 / Q15 / Q16** | One rate per task per metal · Half-Shank's ten portions of stock · a scanned "Needs parts" records no part. |
| Marlen, 21 paid-closed | Left alone deliberately: $1,110 of labor in four **paid** payroll batches, two **paid** invoices. Reversing means clawing back both. |
| Marlen, `repair-86f66304` | **$300 double-credit** — Vernon 4h and you 2h on one ticket, both `repair_qc_pass`, both paid. The only one of 46 like it. |
| `test@test.com` | Two **stores** share it, so their notices go nowhere; also blocks the unique email index (C2). |
| efd-shop protection | No required check, so `gh pr merge` does not wait for CI there. |
| Dev data | `efd-database-DEV` has the six `views.check` users and almost nothing else. |

## Production work this run

Marlen Jewelers: **25 repairs moved back to QC** at the owner's request, with everything QC-pass created
undone — 25 unbatched labor logs ($1,665.00) deleted and the draft invoice ($2,931.92) removed, so the
re-pass credits the corrected price. Backup `marlenQcReversalBackup_20261002165907`. The 21 paid-closed
repairs were **not** touched.

Worth recording: `creditRepairLaborAtQc` is **idempotent** — it refuses to write a second `repair_qc_pass`
log. So the double-pay the owner was worried about could not have happened; the real risk was the
opposite, a stale credit at the old price that the re-pass would silently decline to replace.
