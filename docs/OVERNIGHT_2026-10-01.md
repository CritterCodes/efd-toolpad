# Autonomous run — 2026-10-01 (day)

> **Kind:** descriptive (what happened) · **As of:** 2026-10-01 · Run against `docs/GUARDRAILS_PLAN.md` and
> kuzu `docs/10-efd/EFD-DEFECTS.md`, by the goal the owner set that day. Every PR passed CI (`check`: lint, tests,
> build, views) before merging; every merge's production deploy reached **READY** and the ship check passed.

## Merged

| PR | What |
|---|---|
| [#181](https://github.com/CritterCodes/efd-toolpad/pull/181) | **B1:** a scanned Needs parts / Communications / Ready for work reaches the bench (the bulk move never synced the work order). The guard now sees every way of writing repairs. Found with it: the store repair edit/delete route let any owner `$set` any field or delete mid-work — locked to admins (retiring it: Q7). |
| [#182](https://github.com/CritterCodes/efd-toolpad/pull/182) | **B2/B3:** claim takes only READY FOR WORK (or your own); someone else's job is an admin takeover; nothing in QC/completed can be pulled back. Only the holder (or an admin) sends a job to QC. |
| [#183](https://github.com/CritterCodes/efd-toolpad/pull/183) | **C7:** QR codes on every print come from our own `/api/qr`, not api.qrserver.com (no third-party call, nothing leaked, prints work when it's down). |
| [#184](https://github.com/CritterCodes/efd-toolpad/pull/184) | **B5/B6/B7:** CAD pieces aren't bulk-moved to QC (server refuses too); the scan box shows only for people the scan routes accept; honest QC toast. |
| [#185](https://github.com/CritterCodes/efd-toolpad/pull/185) | **C2:** every user-creating path refuses an email that already exists (any case); `POST /api/users` answers 409. Merging the 3 existing duplicates + an index: Q9. |
| [#186](https://github.com/CritterCodes/efd-toolpad/pull/186) | Views: the last four pages get an `<h1>` — **views baseline 0**. |
| [#187](https://github.com/CritterCodes/efd-toolpad/pull/187) | Lighthouse after every deploy, report-only. First run, sign-in page: performance 68, accessibility 94, best practices 96, SEO 66 (low on purpose: the admin is noindex). |
| [#188](https://github.com/CritterCodes/efd-toolpad/pull/188) | `max-lines`: `wholesaleLeadService.js` (3,199 lines) → 11 modules, same public API. |
| [#189](https://github.com/CritterCodes/efd-toolpad/pull/189) | `max-lines`: `repairAnalytics.js` (1,722 lines) → 8 modules, same public API. |
| [#191](https://github.com/CritterCodes/efd-toolpad/pull/191) | **Owner fix:** My Bench's Mine tab no longer lists your jobs waiting in QC; every tab is paged (20 a page). |

Earlier the same day (before this goal): #173 retirements (Processes UI, vendor sync, migrations, debug dumps), #174
signed-in preview checks, #175 owner answers, #176–#178 previews on the dev DB + preview sign-in fix, #179 store
check-in hotfix, #180 scan to approve QC.

## Numbers

| | Start of the day | Now |
|---|---|---|
| Lint baseline | 126 | **41** (40 `max-lines` + 1 deliberate unused var) |
| `no-console` | 82 | **0** (plain error) |
| `max-lines` (files over 400) | 42 | **40** (39 once #190 lands) |
| Views baseline | 8 | **0** |
| Ship checks | anonymous | anonymous + signed-in preview crawl + Lighthouse (report) |

## In flight

- #190 `max-lines`: `repairWorkflow.js` → 3 modules (waiting on #192).
- #192 views: measure where a redirect page lands (a redirect page was measured mid-redirect).

## Parked, and why

- **React #418 hydration mismatch** (random pages): not reproducible from a minified build; needs a dev-mode crawl to
  get React's diff. Listed by the views check, never failed.
- **efd-shop defects (C3 invite copy, C4 reset for customers with a password, C5 overpayment, §5 dead routes):** a
  separate repo whose checkout holds someone's unpushed work; needs its own worktree pass.
- **B4 (scanned Needs parts skips the parts dialog), B6 send-back / peer QC, F36/Q4 (Q8):** workflow decisions.

## Needs the owner (docs/OPEN-QUESTIONS.md)

| # | Question | Recommendation |
|---|---|---|
| Q7 | Retire `PUT`/`DELETE /api/wholesale/repairs/[repairId]`? | **Yes** — nothing calls it; it's admin-only now. |
| Q8 | Where should a checked-in Request Quote job wait? | **`NEEDS QUOTE`**, off the bench, until it's priced; then READY FOR WORK. |
| Q9 | Merge the 3 duplicate-email accounts + unique index on `users.email`? | **Yes**, as a backed-up script. |
