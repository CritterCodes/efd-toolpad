# Open questions

> **Kind:** register (decided by the owner, one at a time) · **As of:** 2026-10-01

Things a session may **not** decide alone (Kuzu's `docs/OPEN-QUESTIONS.md`, docs/GUARDRAILS_PLAN.md Phase 3). Each has
the context, a recommendation, and a status. When the owner answers, record the answer and the date here, then
move the decision into the doc it belongs to.

---

### Q1 — Signed-in checks against Vercel preview deploys? (opened 2026-10-01)

**Context.** Owner decision 4 (GUARDRAILS_PLAN) asked for ship checks after every deploy, signed in on previews (dev
database) and anonymous on production. The anonymous half is built: `.github/workflows/ship.yml` +
`scripts/ship-checks.mjs`. The signed-in half would need:

- standing test accounts in `efd-database-DEV`, one per role, **admin included**;
- their passwords stored as GitHub secrets so the workflow can sign in.

Two problems with that. Preview protection is off, so preview URLs are public: anyone holding that admin password
could sign in to a preview. And the dev database is a copy of production with real artisans in it. Also, Vercel's
Ignored Build Step currently skips preview builds for PRs (the last `Preview` deployment is from 2026-07-17), so a
preview check would rarely run anyway.

**Recommendation: don't add it now.** The signed-in, every-role, every-page crawl already runs on **every PR** in CI
(`npm run views`, against a throwaway database). The only extra a preview run would catch is a problem with the real
environment variables or the real shape of the data. If that's ever wanted: non-admin roles only, their own
throwaway passwords, rotated.

**Status:** DECIDED 2026-10-01 — owner: *"yes"*. Built in #174 (`scripts/views-remote.mjs`, `scripts/seed-preview-e2e.mjs`, Preview step in `ship.yml`). LIVE 2026-10-01: the owner seeded the 6 e2e accounts on `efd-database-DEV` and set the `E2E_PREVIEW_PASSWORD` secret; Vercel's Ignored Build Step now also builds `claude/*` branches (it already built production, `ops/epic-*` and `ops/feature-*`; other branches still skip, to save build minutes). Previews now read efd-database-DEV (they were on efd-preview-admin-default, an empty BARF-era database), and a preview signs in against itself, not production (#177). Rotate the password: re-run `scripts/seed-preview-e2e.mjs` + `gh secret set`.

---

### Q2 — Remove the Processes page's "Update Prices" button? (opened 2026-10-01)

**Context.** `/dashboard/admin/tasks/processes` has an **Update Prices** button. Since the one-engine ruling
(2026-09-30) its API (`/api/processes/bulk-update-pricing`) does nothing and answers "Process pricing is now computed
at runtime — no bulk update needed." The button looks like it does something and doesn't.

**Recommendation:** remove the button (and the no-op route once nothing calls it). It moves no price. Left alone
overnight because removing UI is the owner's call.

**Status:** DECIDED 2026-10-01 — owner: *"processes is retired"*. The Processes pages, AI builder, nav link and the no-op route were removed in #173. `/api/processes` and the data stay: the task builder and the pricing engine still read `task.processes`.

---

### Q3 — Retire `.github/copilot-instructions.md`? (opened 2026-10-01)

**Context.** The five root rulebooks moved to `docs/archive/` on 2026-10-01. A sixth, `.github/copilot-instructions.md`
(641 lines), is from the same era: it describes AWS S3 and Shopify, which are gone, and points at the archived
CONSTITUTIONAL_FILE_ORGANIZATION.md. GitHub Copilot loads it automatically for anyone using Copilot in this repo.

**Recommendation:** replace it with a few lines pointing at `CLAUDE.md` (the router) and `eslint.config.mjs`. If
nobody uses Copilot here, archive it like the others.

**Status:** DECIDED 2026-10-01 — owner: *"yes"*. Replaced with a pointer to `CLAUDE.md` + `eslint.config.mjs`; the old file is `docs/archive/copilot-instructions.md`.

---

### Q4 — Retire `/dashboard/admin/migrate-repair-tasks`? (opened 2026-10-01)

**Context.** Found by `npm run views`: the page calls `/api/admin/migrate-repair-tasks`, which no longer exists, so it
shows an error. It's a one-time migration tool from the repair-tasks rework. It isn't in the sidebar; the admin views
crawl opens it because it opens every page file.

**Recommendation:** retire it, but only after the 2026-10-31 usage report confirms nobody opens it.

**Status:** DECIDED 2026-10-01 — owner: *"yes"*. Removed in #173 (without waiting for the usage report).

---

### Q5 — Finish or remove the artisan vendor-profile sync? (opened 2026-10-01)

**Context.** `POST /api/artisans/sync-vendor` builds a complete `vendorProfileData` object (vendor name, display name,
slug, bio, location …) and then never sends or saves it. Found by the unused-variable burn-down. Whatever the route
returns, the vendor profile it was written to create doesn't happen.

**Recommendation:** decide what it was for. If the shop's vendor profiles are now made elsewhere, delete the route.
If not, finish it. Left untouched overnight; it's one of the two `no-unused-vars` left.

**Status:** DECIDED 2026-10-01 — owner: *"remove"*. The route and the artisan profile's "Create Vendor Profile" menu item were removed in #173.

---

### Q6 — Let the emergency-logout diagnostics and the status migration print? (opened 2026-10-01)

**Context.** `no-console` went from 368 to 82 overnight. The 82 left are output whose job is printing:
`utilities/auth/emergencyLogout.helpers.js` (56) and `hooks/auth/useEmergencyLogout.js` (18), the diagnostic dump on
the emergency-logout page, plus `lib/migrations/migrateToNewStatusModel.js` (8), a migration's progress lines.
Removing them would hollow out those tools.

**Recommendation:** mark each of the three files with one documented exception
(`/* eslint-disable no-console -- printing diagnostics is this module's job */`) so `no-console` reaches zero and
becomes a plain error. Better still, if the status migration has run everywhere, retire it.

**Status:** DECIDED 2026-10-01 — owner: *"idk what that is remove"*. The emergency-logout page's debug-dump buttons and the old products status migration were removed in #173; the page's logout tools stay. `no-console` is 0 and a plain error.

---

### Q7 — Retire `PUT`/`DELETE /api/wholesale/repairs/[repairId]`? (opened 2026-10-01)

**Context.** Found while fixing EFD-DEFECTS B1. The route let any signed-in owner of a repair (a store) `$set` any field
on it (status, prices, `userID`) and delete it at any stage, writing the collection directly. Nothing in efd-admin or
efd-shop calls it. It is now admin-only and goes through `RepairsModel` (work-order sync on update, full cleanup on
delete).

**Recommendation:** delete the route. Admins already edit repairs through `/api/repairs`.

**Status:** open.

---

### Q8 — Where should a store's "request a quote" job wait once it's checked in? (opened 2026-10-01)

**Context.** EFD-DEFECTS F36 / Q4. A store can create a repair with **Request Quote** (no tasks; `quoteRequest.status =
'requested'`; owner ruling 2026-09-21). When the piece is checked in, `receive` moves it to READY FOR WORK like any
other job, so it appears on the bench as Unclaimed with **no tasks and a $0 price**, and a jeweler can claim it before
anyone has priced it. The `NEEDS QUOTE` status exists but nothing sets it and no quote code reads it (Q1).

**Recommendation:** on check-in, a quote-requested job goes to `NEEDS QUOTE`, which is off the bench and listed for
staff to price. When pricing flips the request to `quoted`, the job moves to READY FOR WORK and joins the bench. This
changes where these jobs show up, which is why it's a question and not a fix.

**Status:** open.
