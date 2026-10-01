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
