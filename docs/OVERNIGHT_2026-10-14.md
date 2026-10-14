# Overnight 2026-10-14

> **Kind:** run report · One session, interrupted twice by the owner with live work. Written when stopping.

## What happened

The night was meant to be the UI burn-down. It became a payments night, twice, because the owner was
awake and a customer had been charged twice. That was the right trade and I would make it again — but
it means the ordered UI steps are **not** done, and the reason the later ones are not done is not the
interruption. It is that **nothing in this worktree can put a screen in front of a browser.**

## Merged

| PR | What | Prod |
|---|---|---|
| efd-admin #311 | Cash payments counted abandoned card attempts as money — the cash route summed the whole `payments` array with no status filter. Three production invoices overstated by $754.32. | READY |
| efd-shop #96 | A refund gave the money back and left it on the books. `charge.refunded` released inventory and stopped; the paid invoice and its credit stood. Now reverses custom orders, repair invoices and the order record. | READY |
| efd-shop #97 | The reversal missed **every payment taken at the counter** — admin's terminal route writes `paymentIntentId`, the shop writes `stripePaymentIntentId`, and #96 matched only the shop's spelling. | READY |
| efd-admin #312 | A refunded invoice read as money still owed: `computePaymentProgress` bucketed anything that was not `paid` or `cancelled` as outstanding, so a reversal double-counted in the opposite direction. | READY |
| efd-admin #313 | Q19 — whether Stripe actually delivers `charge.refunded` to the shop. | READY |
| efd-admin #314 | Q20 — a lead's quoted total comes from the browser, not the engine (EFD-DEFECTS Q3). | READY |
| efd-admin #315 | Two questions were both numbered Q17, and both Q18 — I made that collision earlier in the same session. Renumbered, plus a guard. | READY |

`ship.yml` did not run on any of these: GitHub Actions is billing-blocked. Each deploy was confirmed
READY directly through `vercel inspect`, and both production sites were fetched anonymously and served.

## Production data change (owner's yes, 2026-10-14)

`CO-mud0wv65-947821` — Dylan Caldwell, engagement ring, $1,919.22. The 50% gate of $959.61 was charged
twice, 2m26s apart. The owner refunded `pi_3UQIBtEDpf5R3Hpz1uc1HGqE` in Stripe and said to correct the
database. The duplicate's `customInvoices` row and `customPaymentCredits` entry are `refunded`, its
order is `refunded`, the real payment is untouched. The project now reads:

```
totalPaid 959.61 · totalPending 0 · remainingAmount 959.61 · canStartProduction true
```

Applied with the same rules the new module uses, so it matches what the webhook would have written.
Dry-run first; the dry run named only the refunded charge.

## Scoreboard

| | 2026-10-02 critique | now | note |
|---|---|---|---|
| `<PageBody>` adopters | 0 | **2** of 146 screens | +9 more sit unmerged on a branch |
| `<strong>Label:</strong>` sites | 82 | **20** in 13 files | step 2 largely done |
| MUI `<Tabs>` | 30 | **1** | step 4 done |
| route state files | 0 | **9** | step 3 started |
| kit importers | 18 | **70** of 1242 | |
| inline `sx` objects | 4,778 | **5,286** in 362 files | **going the wrong way** |
| median `page.js` | 128 | **166** lines | **going the wrong way** (Kuzu 40) |
| lint ratchet | — | **17** (0 console · 1 unused · 16 max-lines) | unchanged tonight |

Two of those got worse, and they are the two the critique actually named. Worth saying plainly rather
than reporting only the green rows.

**Correction to the standing brief:** it says `AppShell` renders "a bare `<Box component="main" sx={{ flex: 1 }}>`"
and that PageBody needs wiring into it. That is already done (`AppShell.js:279-284`): the shell owns the
reading column (`maxWidth: 1440, mx: 'auto'`) and deliberately not the gutter, because
`RoleAwareLayout` already supplies one and adding a second would indent every screen twice. The
primitive is shipped and guarded (`src/components/pageFrame.guard.test.js`). What is missing is
**adoption**, not wiring.

## Parked, and why

**`claude/pagebody-repairs-ring`** (edbbb755, 7ec9d8f6) — nine screens in the repairs lane on the page
frame. Each carried its own vertical rhythm, which is why spacing shifts as you navigate; several also
set `p: 3` or `pb: 10` on their root, a second gutter on top of `RoleAwareLayout`'s. `repairs/[repairID]`
and `repairs/new` were hand-rolling PageBody exactly (`pb: 10, flexDirection: column, gap: 2.25`).

Lint clean, production build clean, 2,349 tests pass. **Not merged, because nothing here can look at it.**

- `npm run views` needs `playwright` — not in `node_modules`, not in the workspace root, not in the pnpm store.
- `mongodb-memory-server` is in the store but unlinked, which is also why 3 admin test suites fail locally.
- Adding either is only allowed through `.github/workflows/deps.yml`, which needs Actions, which is billing-blocked.
- The dev server would not bind, and the dashboard needs a session I should not manufacture against a copy of production.

So the one tool that checks a visual change at desktop **and** 375px is unavailable from both ends at
once. Merging a visual PR on a green build would be claiming a fix I have not seen. In FRICTION-LOG.

**Half of that is now fixed (#317, merged after this report was first written).** Chasing the blocker I
found that `next start` and `next dev` both 500 on their first request in every worktree:
`Cannot find module 'react/jsx-runtime'` from the build output in `%LOCALAPPDATA%`, which has no
`node_modules` on any parent. `next build` survives it because the compiler resolves from the project
root — which is why it was logged on 2026-10-01 as a *build* problem and given a build-shaped
workaround ("use a real `.next` folder"). `prepare-next-dir.js` now links `node_modules` beside the
output; `/auth/signin` goes 500 → 200. Checked 375px while it was up: no horizontal scroll, nothing
overflowing.

**What is still missing is a signed-in session.** `e2e/views/seed.mjs` states in its own header that it
may never point at a real database, so its accounts can only be seeded into a throwaway Mongo — which
needs `mongodb-memory-server`, the part still blocked. **One thing from the owner unblocks it:** the six
`<role>@views.check` accounts already exist on `efd-database-DEV` (Q1), and their password is the
`E2E_PREVIEW_PASSWORD` secret. With it, a local server pointed at `efd-database-DEV` signs in and every
screen becomes checkable, writing nothing.

## EFD-DEFECTS — the list is stale, sweep before working from it

The convention here is that a fix cites its id ("EFD-DEFECTS P1"). Grepping both repos for all 51 ids
in the doc's tables: **36 are already cited by a fix.** That includes the whole of §4d payroll —
P1, P2, P3, P4, P5, P6, P7 — which the standing brief still lists as open work. P3 in particular
("Stripe pays out, the DB write throws, the next run pays again") is the same double-pay shape as
tonight's incident and was fixed months ago, with `priorBatchTransfer` and its own test.

No citation, so plausibly open: **B4, P9, P11, P14–P18, Q1, Q3, Q4, Q6, S1, S2, S3** — but S1–S3 are
known fixed without naming an id, so absence of a citation is weak evidence. Checked by hand:

- **Q3 is live** → Q20. Price-moving, needs the owner.
- **Q4 is largely addressed** — the receive route holds a quote-request in `NEEDS QUOTE` (owner ruling Q8, 2026-10-01), so the doc's stated evidence is out of date.
- **B4 is already Q16** in this register, open since 2026-10-02.

## For the owner — each with a recommendation

1. **Stripe webhooks (Q19).** Everything built tonight for refunds only runs if Stripe delivers
   `charge.refunded` to the shop endpoint. On the test key, admin subscribes to no refund event and the
   shop endpoint is absent entirely; I cannot see live. **Recommendation:** open Developers → Webhooks on
   the live account, confirm `/api/stripe/webhooks` takes `charge.refunded` and `refund.created`, then
   refund $1 of something and watch the invoice move. Under a minute, and it is the difference between a
   fix and dead code.
2. **Browser-priced quotes (Q20).** **Recommendation:** let me run the comparison read-only first —
   both numbers over recent quotes — before anything changes. If they always agree it is a tidy-up; if
   they do not, that gap is money quoted wrong and you should see it before I touch it.
3. **`E2E_PREVIEW_PASSWORD` — the cheapest unblock on this list.** The local server works again (#317).
   The only thing between me and checking every converted screen at 375px is a session, and the six
   `<role>@views.check` accounts you seeded on `efd-database-DEV` already exist for exactly this.
   **Recommendation:** paste me that password, or put it in the worktree's `.env.local`. Nothing gets
   written, nothing is installed, and the parked branch becomes mergeable the same night.
4. **Actions billing.** It is blocking CI, `npm run views`, `ship.yml` and `deps.yml` simultaneously.
   **Recommendation:** settle it, or tell me to treat visual PRs as unshippable indefinitely — right now
   the UI half of the standing brief cannot be completed to its own standard, and saying so beats
   quietly merging unverified screens. (3 above is the cheap workaround; this is the real fix.)
5. **The three cash-route invoices.** `rinv-bca435de`, `rinv-498455fe`, `rinv-96c7c681` still hold
   inflated `amountPaid` totalling $754.32. No money is owed — the completed payment covered each total.
   **Recommendation:** let me correct them the same way I corrected Dylan's, dry run first. One word.

## Mistakes worth recording

- I added a Q17 and a Q18 without checking the file already had both (different heading levels hid it
  from my grep). Fixed in #315, with a guard that now fails on a reused number, a gap, or a missing
  Status.
- I rewrote `OPEN-QUESTIONS.md` with PowerShell `Set-Content` while testing that guard and turned every
  em dash in the document into mojibake. Restored from a copy and verified clean. **Regexes and
  rewrites go through Write/Edit** — already the standing rule, and I broke it.
- I used `git checkout <branch> -- <paths>` to move work between branches and silently discarded an
  uncommitted fix. Caught it immediately and reapplied, but commit first next time.
