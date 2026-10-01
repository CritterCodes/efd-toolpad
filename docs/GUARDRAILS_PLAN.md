# Bringing Kuzu's guardrails to efd-admin

**Kind:** proposed (until the owner rules on the four decisions at the bottom). **As of:** 2026-09-30.
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
3. **Branch protection on `main`**: CI must be green to merge. *(Owner decision 2 — this changes how merges feel.)*

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

### Phase 2 — open every page in a real browser (the biggest single win)

7. **`npm run views`** — Kuzu's `scripts/views.ts`, adapted: build, seed a throwaway in-memory database with one user of
   each role (admin, on-site artisan, off-site artisan, wholesaler, customer), start the production build against it
   with **every external credential blanked** (no real email, Stripe, Stuller, AI), then open **every page in each role's
   nav, signed in, at phone and desktop width**. Fails on: a console error or uncaught exception, horizontal overflow at
   phone width (the owner's responsive rule, made automatic), a dead link, a missing `<h1>`. A new page must be added to
   the route list or the check fails. Saves a screenshot contact sheet to review.
8. **Ship checks after every Vercel deploy** (`deployment_status` workflow): the same Playwright run against the live
   deploy, plus Lighthouse — needs a Vercel protection-bypass secret and a read-only account. *(Owner decision 4.)*

### Phase 3 — documents that stay true

9. **`CLAUDE.md` becomes a router**, like Kuzu's: what to read for what, the handful of session rules (provenance,
   absolute dates, trace UI → route → collection across both apps, verify a deploy went READY), nothing restated.
10. **Retire the five rulebooks** into `docs/archive/` with a one-line note; rules worth keeping become lint rules
    (Phase 1) or decisions with a date.
11. **Every doc declares its kind** (descriptive / decided / proposed) and an as-of date; **`docs/OPEN-QUESTIONS.md`** is
    the register of what a session may not decide alone; **`friction:`** messages get filed into a friction log.

### Phase 4 — the UI *(owner decision 1)*

12. **Re-theme MUI to Kuzu's look** — warm ivory surfaces, white cards on a soft shadow, one amber, Bricolage Grotesque
    over Instrument Sans, amber-text current nav, grouped nav as dropdowns (ADR-0009, 2026-09-30) — through the MUI
    theme and the existing facelift primitives, so every screen moves at once.
13. **Thin pages over shared components**: the `max-lines` ratchet plus moving logic into hooks/services, page by page as
    they are touched — starting with the files over 1,000 lines.
14. **Redo the dashboards the way Kuzu designed its homes**: every panel names the decision it supports and the data it
    reads; no decorative charts; designed for the phone first (`kuzu/docs/40-plan/V1-PARITY-CHECKLIST.md`, "The two homes,
    designed — owner approved 2026-09-30"). Same canvas process: draw, owner reacts, then build.

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

## Decisions for the owner

1. **UI direction.** Re-theme MUI to Kuzu's look (fast, every screen at once) **or** migrate screens to Kuzu's
   shadcn/Tailwind kit (slow, screen by screen, and Kuzu is replacing efd anyway). *Recommended: re-theme MUI.*
2. **Green CI required to merge `main`?** *Recommended: yes, once Phase 0 is green.*
3. **Ratchet or clean up first?** *Recommended: ratchet — fix violations as files are touched.*
4. **Ship checks on live deploys** need a Vercel protection-bypass secret in GitHub and a read-only account seeded in
   production. *Recommended: yes, after Phase 2 runs locally.*
