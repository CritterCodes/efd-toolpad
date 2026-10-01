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
