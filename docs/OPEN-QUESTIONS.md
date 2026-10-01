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

**Status:** open.

---

### Q2 — Remove the Processes page's "Update Prices" button? (opened 2026-10-01)

**Context.** `/dashboard/admin/tasks/processes` has an **Update Prices** button. Since the one-engine ruling
(2026-09-30) its API (`/api/processes/bulk-update-pricing`) does nothing and answers "Process pricing is now computed
at runtime — no bulk update needed." The button looks like it does something and doesn't.

**Recommendation:** remove the button (and the no-op route once nothing calls it). It moves no price. Left alone
overnight because removing UI is the owner's call.

**Status:** open.

---

### Q3 — Retire `.github/copilot-instructions.md`? (opened 2026-10-01)

**Context.** The five root rulebooks moved to `docs/archive/` on 2026-10-01. A sixth, `.github/copilot-instructions.md`
(641 lines), is from the same era: it describes AWS S3 and Shopify, which are gone, and points at the archived
CONSTITUTIONAL_FILE_ORGANIZATION.md. GitHub Copilot loads it automatically for anyone using Copilot in this repo.

**Recommendation:** replace it with a few lines pointing at `CLAUDE.md` (the router) and `eslint.config.mjs`. If
nobody uses Copilot here, archive it like the others.

**Status:** open.

---

### Q4 — Retire `/dashboard/admin/migrate-repair-tasks`? (opened 2026-10-01)

**Context.** Found by `npm run views`: the page calls `/api/admin/migrate-repair-tasks`, which no longer exists, so it
shows an error. It's a one-time migration tool from the repair-tasks rework. It isn't in the sidebar; the admin views
crawl opens it because it opens every page file.

**Recommendation:** retire it, but only after the 2026-10-31 usage report confirms nobody opens it.

**Status:** open, waiting on the usage report.
