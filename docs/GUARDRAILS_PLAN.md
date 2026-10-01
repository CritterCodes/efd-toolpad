# Bringing Kuzu's guardrails to efd-admin

**Kind:** decided — the owner ruled the four decisions on 2026-09-30 (bottom of this page). **As of:** 2026-09-30.
**Asked by:** the owner, 2026-09-30 — *"Development in Kuzu is going a million times better … find what we have set up
that is making the development go so much better"*, then *"We need to make a plan to fix this app based off your
findings in kuzu."*
**Sources:** Kuzu at `C:/Users/jacob/dev/crittercodes/kuzu` (`CLAUDE.md`, `docs/README.md`, `docs/decisions/ADR-0009,
0010, 0016`, `docs/40-plan/{PARITY-METHOD,SHIP-CHECKS,FRICTION-LOG}.md`, `eslint.config.mjs`,
`.dependency-cruiser.cjs`, `.github/workflows/`, `scripts/views.ts`); efd-admin measured at `origin/main` `1ed504bd`.

---

## Why Kuzu goes better, in one line

**Kuzu's rules are tools that fail the build; efd's rules are prose that nobody can check.** Kuzu's own docs say it:
*"If a rule cannot be checked by a type, a lint rule, a test, or CI, it does not belong in a guardrail document."*

## Where efd stands (measured 2026-09-30)

| Guardrail | Kuzu | efd-admin today |
|---|---|---|
| CI on every push | typecheck · lint · dependency-cruiser · tests · build · ship-checks · views | **none** — no `.github/workflows`; 186 test files run only when someone runs them |
| Lint | layer rules, `no-console`, jsx-a11y, unused vars | `next/core-web-vitals` only: **31 warnings, 0 errors** — while undefined names went unnoticed (below) |
| Types | TypeScript everywhere | JavaScript, `checkJs: false`, `strict: false` |
| Who may touch the database | only `packages/db` (lint) | 48 files import `mongodb`; 162 non-test files call `collection(…)` |
| Every page opened in a browser | `pnpm views`: every page, signed in, phone + desktop, seeded throwaway DB; Playwright + Lighthouse on every deploy | nothing — a broken page is found by a person |
| Instructions for a session | 72-line CLAUDE.md that only points at docs | a CLAUDE.md plus five rulebooks that contradict each other (`CONSTITUTION.md`, `CONSTITUTIONAL_FILE_ORGANIZATION.md`, `COPILOT_INSTRUCTIONS.md`, `DEVELOPMENT_STANDARDS.md`, …) |
| Docs | every doc says descriptive / decided / proposed; every claim cites its source; open questions numbered | mixed; rulings live in memory files and scattered docs |
| UI | one kit (shadcn + one theme); pages 18–69 lines | MUI v6 in 343 files; 36 files over 500 lines, 11 over 1,000 (largest 3,250) |
| `console.log` in shipped code | lint error | 369 calls |

**What the missing checks cost, found while measuring:** turning on `no-undef` showed the **Move page has been unable
to move repairs to anything but QC since 2026-09-02** — the access refactor (`f4fa4e0b`) removed `isAdmin` and left one
use. TypeScript, a lint rule or Kuzu's views run would each have stopped it. Fixed in PR #148.

---

## The plan

**The principle: ratchet, don't rewrite.** efd is 1,296 files and Kuzu replaces it at V1. So every rule below starts
by **recording today's violations in a checked-in baseline** and failing only on *new* ones; the baseline may only
shrink. Nothing waits for a cleanup, and nothing gets worse. Each phase is small PRs, each green before the next.

### Phase 0 — stop the bleeding (first)

1. **CI on every push and PR** (`.github/workflows/ci.yml`): `npm ci` (with `NODE_AUTH_TOKEN` read access to GitHub
   Packages for `@crittercodes/refrakt`, as Vercel does) → lint → tests → `next build`. The mongodb-memory-server suites
   that fail locally run fine on Linux runners; cache the binary as Kuzu does.
2. **`no-undef` as an error** — it already caught one live bug. The other hits today are inside `{false && …}` blocks in
   `commerce/sales-invoices/page.js` (dead code to delete) and one test file missing its vitest import.
3. **Branch protection on `main`**: CI must be green to merge (owner, 2026-09-30: yes).

### Phase 1 — the rules that matter, as lint

4. **Move to ESLint flat config** (the current `.eslintrc.json` is deprecated) with:
   `no-unused-vars` · `no-console` (warn/error allowed; scripts exempt) · `eslint-plugin-jsx-a11y` · `max-lines` (400 for
   new files) — each with a baseline.
5. **Who may compute or store what**, as `no-restricted-imports` + baseline (Kuzu's ADR-0002 / ADR-0005):
   - only `lib/database` and the model files import `mongodb`;
   - only `services/pricing/engine.js` computes a price — **already enforced** by `oneEngine.guard.test.js`;
   - the same shape for the other money paths that have burned us: payroll totals (`payrollUtils.payrollTotal`),
     repair statuses (`repairWorkflow`), customer keys (`canonicalClientID`).
6. **dependency-cruiser**: API routes never import dashboard code; shared components never import the database;
   no circular imports.

**Phase 1 — done 2026-09-30.** ESLint moved to flat config (`eslint.config.mjs`) with the rules above; today's
violations recorded with ESLint's bulk suppressions (`eslint-suppressions.json`). CI fails on a new violation **and** on
a fixed one left in the baseline (`npm run lint:prune` removes it), so the count only goes down. Deliberately **not**
ratcheted, with reasons:
- *Services calling the database helper directly* (162 files). Kuzu's rule is "only the db package talks to the
  database"; in efd that means rewriting every service onto models — large, for an app Kuzu replaces. What is enforced
  is the part that matters for safety: browser code never reaches the database, and nobody outside the database layer
  opens a connection.
- *Circular imports.* `import/no-cycle` took over ten minutes on 1,300 files; it belongs in a weekly job, not the gate.
- *Payroll totals.* A hand-summed `laborPay + salePay` once double-paid (PR #110), but the same sum is legitimate when a
  batch is built, so a source pattern can't tell them apart; `payrollUtils.payrollTotal` is guarded by its tests.

### Phase 2 — open every page in a real browser (the biggest single win)

7. **`npm run views`** — Kuzu's `scripts/views.ts`, adapted: build, seed a throwaway in-memory database with one user of
   each role (admin, on-site artisan, off-site artisan, wholesaler, customer), start the production build against it
   with **every external credential blanked** (no real email, Stripe, Stuller, AI), then open **every page in each role's
   nav, signed in, at phone and desktop width**. Fails on: a console error or uncaught exception, horizontal overflow at
   phone width (the owner's responsive rule, made automatic), a dead link, a missing `<h1>`. A new page must be added to
   the route list or the check fails. Saves a screenshot contact sheet to review.
8. **Ship checks after every Vercel deploy** (`deployment_status` workflow): the same Playwright run against the live
   deploy, plus Lighthouse — signed-in against previews on the dev database, anonymous-only against production (decision 4).

### Phase 3 — documents that stay true

9. **`CLAUDE.md` becomes a router**, like Kuzu's: what to read for what, the handful of session rules (provenance,
   absolute dates, trace UI → route → collection across both apps, verify a deploy went READY), nothing restated.
10. **Retire the five rulebooks** into `docs/archive/` with a one-line note; rules worth keeping become lint rules
    (Phase 1) or decisions with a date.
11. **Every doc declares its kind** (descriptive / decided / proposed) and an as-of date; **`docs/OPEN-QUESTIONS.md`** is
    the register of what a session may not decide alone; **`friction:`** messages get filed into a friction log.

### Phase 4 — the UI (decision 1: re-theme, then triage from the views contact sheet)

12. **Re-theme MUI to Kuzu's look** — warm ivory surfaces, white cards on a soft shadow, one amber, Bricolage Grotesque
    over Instrument Sans, amber-text current nav, grouped nav as dropdowns (ADR-0009, 2026-09-30) — through the MUI
    theme and the existing facelift primitives, so every screen moves at once.
13. **Thin pages over shared components**: the `max-lines` ratchet plus moving logic into hooks/services, page by page as
    they are touched — starting with the files over 1,000 lines.
14. **Redo the dashboards the way Kuzu designed its homes**: every panel names the decision it supports and the data it
    reads; no decorative charts; designed for the phone first (`kuzu/docs/40-plan/V1-PARITY-CHECKLIST.md`, "The two homes,
    designed — owner approved 2026-09-30"). Same canvas process: draw, owner reacts, then build.

### Retire what nobody uses (runs alongside every phase)

Owner, 2026-09-30: *"there is a lot in this app that just doesn't get used. Lots of reports that are never opened.
Stats that aren't really useful. Kuzu has a rule on this."* Kuzu's rule: reporting is a clean slate, and **every number
must name the decision it supports** — or it goes (`kuzu/docs/40-plan/V1-PARITY-CHECKLIST.md`, "Reporting is a clean
slate"). Retiring is cheaper than any guardrail: a deleted page needs no lint fixes, no security review, no re-theme.

- **Measure first, from evidence.** efd has no usage analytics today (14 reports, ~150 pages, no record of which are
  opened). Add a first-party page-open log — path, role, day; no content — written from the dashboard layout.
- **After ~30 days:** a "never or rarely opened" list, by role, with each page's size and the routes and tests behind it.
  The owner confirms per page.
- **Then delete for real:** the page, its nav entry, its API routes if nothing else uses them (Graphify answers that),
  and its tests — in one PR per area. A deleted route is one less route to secure.
- **The survivors earn their place:** every remaining stat or report panel states the decision it supports and the data
  it reads (Kuzu's home-page table is the template). One that can't, goes.
- **Until the list exists:** never polish, re-theme or lint-clean a page that looks dead — mark it and move on.

### Phase 5 — how a change gets made

15. **Every fix starts red**: a failing test that shows the defect, then the fix (already the habit for EFD-DEFECTS work).
16. **`EFD-DEFECTS.md` is the tracker**: each item gets a state (open → red → fixed → live-verified).
17. **Graphify** (PR #147) for "who calls this" before changing it — the check behind several of this month's misses.

---

## Order and size

| Phase | What changes for the owner | Rough size |
|---|---|---|
| 0 | A red ✕ on GitHub when something breaks, before Vercel ships it | 1–2 days |
| 1 | Nothing visible; new mistakes of the known kinds can't merge | 2–3 days |
| 2 | Broken pages are caught before you see them; a contact sheet of every page | 3–5 days |
| 3 | Sessions start faster and stop re-litigating old rulings | 1 day |
| 4 | efd looks like Kuzu; dashboards that answer questions | ongoing, by screen |
| 5 | (already mostly the habit) | — |

## Decisions — owner, 2026-09-30

1. **UI direction: re-theme MUI to Kuzu's look.** Owner: *"I guess re-theme but I don't think it'll make a difference
   our ui is fucked lol."* Taken seriously: a theme alone does **not** fix layout, density or flow. So Phase 4 starts
   from **evidence, not taste** — Phase 2's views run produces a contact sheet of every page, per role, phone and
   desktop. That sheet becomes the **UI triage list**: each page marked keep / smooth / rethink (Kuzu's verdicts), the
   rethinks drawn on a canvas for the owner before code, worst-used pages first. The re-theme ships early because it
   lifts every screen at once; the triage is what actually fixes the UI.
2. **Green CI is required to merge `main`** — branch protection on, once Phase 0 is green.
3. **Ratchet — and a plan that ends at zero.** Owner: *"Ratchet, but we need to have a plan to make sure we fix
   everything."* So every baselined rule also has a burn-down:
   - **The baseline is a checked-in file per rule** (`guardrails/baseline/<rule>.json`: file → count). CI fails if a
     file's count rises or a new file appears; a PR that lowers a count must lower the baseline (CI tells it to).
   - **Touch it, clean it:** a PR that edits a file on a baseline clears that file's violations for that rule.
   - **Scheduled burn-down, not just incidental:** after Phase 2, one cleanup PR per area per week (repairs, pricing,
     wholesale, production, admin), largest offenders first, until each baseline is empty.
   - **A scoreboard** at the bottom of this page (rule · baseline at start · today · target date), refreshed by
     `npm run guardrails:report` in CI and committed with each cleanup PR.
   - **Done = zero:** when a rule's baseline is empty its file is deleted and the rule becomes a plain lint error.
     Target dates are set when Phase 1 records the starting counts.
4. **Ship checks on live deploys — Claude sets them up.** One change from the first draft, for safety: efd has **no
   read-only role**, so a "read-only" production account would really be an admin login stored in GitHub. Instead:
   - the full signed-in run (every role) goes against **Vercel preview deployments**, which use the **dev database**
     (`efd-database-DEV`), with seeded e2e accounts there and a Vercel protection-bypass secret in GitHub;
   - **production** gets the anonymous checks only (sign-in page, 404, robots/noindex, console errors, no source maps)
     — no credential for production is ever stored in CI.

---

## Scoreboard

Refreshed by `npm run guardrails:report -- --markdown`; the baseline file is `eslint-suppressions.json`.

| Rule | Baseline at start (2026-09-30) | Today | Target |
|---|---|---|---|
| `no-console` | 368 | 368 (75 files) | 2026-10-31 |
| `no-unused-vars` | 208 | 208 (104 files) | 2026-10-24 |
| `max-lines` (400) | 42 | 42 (42 files) | 2027-01-31 — or retired (see "Retire what nobody uses") |
| `no-undef` | 0 | 0 | — plain error since Phase 0 |
| browser code → database / server models | 0 | 0 | — plain error |
| API routes → UI code | 0 | 0 | — plain error |
| `mongodb` connections outside the database layer | 0 | 0 | — plain error |
| jsx-a11y (alt text, labels, keyboard) | 0 | 0 | — plain error (MUI components carry most of it) |
| customer keyed by `_id` (guard test) | 0 | 0 | — plain error |
