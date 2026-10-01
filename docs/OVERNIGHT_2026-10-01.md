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

---

# Evening (goal resumed after the Impeccable talk), 2026-10-01

Every PR went through review + green `check`; every production deploy reached **READY** and `ship.yml` passed
(#204 and #199 still settling as this was written).

| PR | What |
|---|---|
| [#190](https://github.com/CritterCodes/efd-toolpad/pull/190) | `max-lines`: `repairWorkflow.js` → 3 modules, same API. |
| [#192](https://github.com/CritterCodes/efd-toolpad/pull/192) | Views: measure where a redirect page lands. |
| [#194](https://github.com/CritterCodes/efd-toolpad/pull/194) | `max-lines`: `pieceWorkOrderActions.js` (794) → 5 modules, same API. |
| [#195](https://github.com/CritterCodes/efd-toolpad/pull/195) | **Guard:** tasks never store a calculated price — `TasksModel` strips at the sink; only the model writes `tasks`. |
| [#196](https://github.com/CritterCodes/efd-toolpad/pull/196) | **Owner:** Impeccable (skill + `DESIGN.md`/`PRODUCT.md`, the brand kept black/white + gold) and a report-only design check (758 findings). Shop twin: CritterCodes/efd-shop#86. |
| [#197](https://github.com/CritterCodes/efd-toolpad/pull/197) | **Security:** six write routes trusted any signed-in account (casting + shipping legs on anybody's pieces, replacing any design's GLB, adding photos to any listing, a legacy price writer, archiving anybody's notifications). Closed; **guard** `routeAuthorization.guard.test.js` makes every write route authorize beyond sign-in. |
| [#198](https://github.com/CritterCodes/efd-toolpad/pull/198) | **P6:** the guide shows the edited pay ladder, not the default. |
| [#200](https://github.com/CritterCodes/efd-toolpad/pull/200) | **P1/P5:** a labor credit in payroll is never re-flagged, zeroed or split (a split re-paid it). Prod had 0 affected. |
| [#201](https://github.com/CritterCodes/efd-toolpad/pull/201) | Listing photos land on the design (they went to a `products` doc nothing reads — uploads showed up nowhere). |
| [#202](https://github.com/CritterCodes/efd-toolpad/pull/202) | `max-lines`: `wholesaleReconciliationService.js` (653) → 3 modules, same API. |
| [#204](https://github.com/CritterCodes/efd-toolpad/pull/204) | Views: wait for Next's streamed-redirect marker before measuring (the cause of a no-h1 flake on 4 redirect stubs under load). |

In review: [#199](https://github.com/CritterCodes/efd-toolpad/pull/199) **P3** — a payroll batch is never paid twice
(asks Stripe for the batch's transfer before sending one); [#203](https://github.com/CritterCodes/efd-toolpad/pull/203) Q10/Q11.

## Numbers

| | Start of the day | Now |
|---|---|---|
| Lint baseline | 126 | **38** (37 `max-lines` + 1 deliberate unused var) |
| `max-lines` (files over 400) | 42 | **37** |
| Views baseline | 8 | **0** |
| Guard tests for the bug classes (goal step 4) | 0 of 3 | **3 of 3** (sync skipped · stored price · authorized-by-sign-in) |
| Design report (new, report-only) | — | admin 758 · shop 696 |

## Changed by the owner today

- **Phase 4 is no longer a Kuzu re-theme.** Owner, 2026-10-01: *"I don't want to rock our users too much and black
  and white are our brand colors."* efd keeps its brand (`DESIGN.md`); Phase 4 is the keep/smooth/rethink triage plus
  burning down the design report.

## Parked, and why

- React #418 hydration mismatch — needs a dev-mode crawl (unchanged).
- efd-shop C3/C4/C5 and §5 — separate repo, its main checkout holds someone's unpushed work.
- P2 (queue vs batch disagree on owner-operators), P4 (Monday-era logs) — *inferred* in the defect list; need a
  reproduction against data before touching payroll again.
- B4, B6, F36/Q4 — workflow decisions (Q8).

## Needs the owner (docs/OPEN-QUESTIONS.md)

| # | Question | Recommendation |
|---|---|---|
| Q7 | Retire `PUT`/`DELETE /api/wholesale/repairs/[repairId]`? | **Yes** — unused, admin-only. |
| Q8 | Where should a checked-in Request Quote job wait? | **`NEEDS QUOTE`** until priced. |
| Q9 | Merge the 3 duplicate-email accounts + unique email index? | **Yes**, as a backed-up script. |
| Q10 | Retire the legacy gem-listing config route (a stored-price writer nothing calls)? | **Yes.** |
| Q11 | Limit the AI helper routes to staff/artisans (each call costs a Gemini request)? | **Yes**, stores too if their intake uses one. |

---

# Night, 2026-10-01 (max-lines burn-down, biggest first)

Every PR: review + green `check`; every production deploy **READY** and `ship.yml` passed (#215 settling).

| PR | What |
|---|---|
| [#206](https://github.com/CritterCodes/efd-toolpad/pull/206) | `customs/customProduction.js` (642) → 3 modules, same API. |
| [#207](https://github.com/CritterCodes/efd-toolpad/pull/207) | `affiliates/commissionEngine.js` (625) → 4 modules, same API. |
| [#208](https://github.com/CritterCodes/efd-toolpad/pull/208) | `repair-invoices/service.js` (568) → 3 modules, same API. |
| [#209](https://github.com/CritterCodes/efd-toolpad/pull/209) | `sales-invoices/service.js` (486) → 3 modules, same API. |
| [#210](https://github.com/CritterCodes/efd-toolpad/pull/210), [#211](https://github.com/CritterCodes/efd-toolpad/pull/211), [#213](https://github.com/CritterCodes/efd-toolpad/pull/213) | **Payment & Pickup page 2,103 → 362 lines**, off the baseline: helpers, print, cards, two action factories, a list hook, four JSX sections. New tests for both factories. |
| [#212](https://github.com/CritterCodes/efd-toolpad/pull/212) | **Design detail page 2,087 → 321 lines**: 7 component files + a pure save-body builder (checked identical line for line), with a new test. |
| [#214](https://github.com/CritterCodes/efd-toolpad/pull/214), [#215](https://github.com/CritterCodes/efd-toolpad/pull/215) | **Wholesale acquisition page 2,070 → 374 lines**: 6 component files, a lead-action factory, five JSX sections, with a new test. |

In review: [#216](https://github.com/CritterCodes/efd-toolpad/pull/216), the intake hook `useNewRepairForm` 1,809 → 1,484 (pure helpers out, with tests).

**Method** (scratchpad tools, every step mechanical): split by top-level declaration; wire imports from eslint
`no-undef`; for JSX and handler blocks, move them verbatim and turn their free variables into props/deps; verify
the public API by comparing export lists before and after, and check that moved logic is identical line for line.

## Numbers

| | Start of the day | Now |
|---|---|---|
| `max-lines` (files over 400) | 42 | **30** |
| Lint baseline | 126 | **31** (30 `max-lines` + 1 deliberate unused var) |
| Views baseline | 8 | **0** |
| Guard tests (goal step 4) | 0 of 3 | **3 of 3** |

## Parked, and why

- **Classic intake (`NewRepairForm.js`, 1,908) and the report page (`ReportDetailPageClient.js`, 1,885)** are not
  split: both are retirement candidates (F34 two intake UIs; the 2026-10-31 usage report). Retiring beats polishing.
- **POS sale lines without a typed price fall back to the `products` cache price** (`sales-invoices/serviceParts/lines.js`
  `getProductPrice`). The cache is fed by the daily reprice, but it's a stored copy. Moving it to the engine is
  price-moving, so it waits.
- React #418, efd-shop C3/C4/C5/§5, P2/P4, B4/B6/F36: unchanged from the evening report.

## Needs the owner (docs/OPEN-QUESTIONS.md)

| # | Question | Recommendation |
|---|---|---|
| Q7 | Retire `PUT`/`DELETE /api/wholesale/repairs/[repairId]`? | **Yes** |
| Q8 | Where should a checked-in Request Quote job wait? | **`NEEDS QUOTE`** until priced |
| Q9 | Merge 3 duplicate-email accounts + unique email index? | **Yes**, backed-up script |
| Q10 | Retire the legacy gem config route? | **Yes** |
| Q11 | AI helper routes staff/artisan-only? | **Yes** |
| Q12 | A blank ring size reads as size 0, so smart intake suggests sizing stock for the whole range. Treat blank as unknown? | **Yes**. It removes a wrong charge suggestion, but it changes what a ticket can charge. |
