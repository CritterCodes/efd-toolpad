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

**Status:** DECIDED 2026-10-01 — owner: *"Q7 retire."* Done: the route and its test are deleted (no caller in either app).

---

### Q8 — Where should a store's "request a quote" job wait once it's checked in? (opened 2026-10-01)

**Context.** EFD-DEFECTS F36 / Q4. A store can create a repair with **Request Quote** (no tasks; `quoteRequest.status =
'requested'`; owner ruling 2026-09-21). When the piece is checked in, `receive` moves it to READY FOR WORK like any
other job, so it appears on the bench as Unclaimed with **no tasks and a $0 price**, and a jeweler can claim it before
anyone has priced it. The `NEEDS QUOTE` status exists but nothing sets it and no quote code reads it (Q1).

**Recommendation:** on check-in, a quote-requested job goes to `NEEDS QUOTE`, which is off the bench and listed for
staff to price. When pricing flips the request to `quoted`, the job moves to READY FOR WORK and joins the bench. This
changes where these jobs show up, which is why it's a question and not a fix.

**Status:** DECIDED 2026-10-01 — owner: *"Q8: Go with your recommendation."* Being built: a checked-in Request Quote job waits in NEEDS QUOTE, off the bench, until it is priced.

---

### Q9 — Merge the 3 duplicate-email accounts and add a unique index on `users.email`? (opened 2026-10-01)

**Context.** EFD-DEFECTS C2. Production has 3 emails held by two accounts each, and no index on `users.email`. Since
2026-10-01 every code path that creates a user refuses an email that already exists (any case), so no new duplicates
can be made through the app. The existing 3 remain: a claim or reset for those people can land on the wrong account.

**Recommendation:** merge each pair into the account that holds their repairs and invoices (a reviewed, backed-up
production script), then create a unique, case-insensitive index on `users.email` (collation strength 2), so the
database itself refuses duplicates. Both are production writes, so both need the owner's yes.

**Status:** NOT DECIDED — owner, 2026-10-01: *"I would need to know what the duplicate emails are and which accounts they are
before I could confirm whether you should merge them or not. Sometimes we don't have the customer's email, and I have filled in
maybe my email or possibly even test@test.com (random emails)."* Read-only production check, 2026-10-01 (names given to the owner in
chat, not kept here):

- `test@test.com` — **21 accounts**, the counter placeholder: 17 walk-in clients, 2 shop customers and **2 stores** (48 and 11
  repairs). Not duplicates of one person, so **not** a merge case. Because two stores carry it, their email notices go nowhere.
  Since the duplicate guard (C2), a 2nd `test@test.com` is refused with "leave it blank if the customer has no email".
- `arkjem@gmail.com` — the same customer twice, created the same day: one account has 4 repairs, the other none. A true duplicate.
- `john.e.annis@gmail.com` — an admin account and a shop customer account for the same person. Probably intentional; leave it.

**Recommendation:** merge only the `arkjem@gmail.com` pair (the empty account into the one with the repairs, backed up first).
Give the two stores their real emails. A unique email index waits until the placeholder accounts are cleared, or it would refuse
them. Waits for the owner.

---

### Q10 — Retire the legacy gem-listing config route? (opened 2026-10-01)

**Context.** `PUT /api/products/gemstones/[id]/designs/[designId]/config` writes `basePrice` / `metalPrices` onto a
`products` document. Nothing in the app calls it, efd-shop no longer reads `products`, and storing prices goes
against the one-pricing-engine ruling (2026-09-30). Until 2026-10-01 any signed-in account could call it; since
CritterCodes/efd-toolpad#197 it is staff-only.

**Recommendation:** delete the route. It is a stored-price writer on a collection nobody reads. Waits for your yes
(nothing is retired without it).

**Status:** DECIDED 2026-10-01 — owner: *"Yes, retire legacy gem listings."* Done: the config route is deleted (no caller).

---

### Q11 — Should the AI helper routes be staff/artisan-only? (opened 2026-10-01)

**Context.** `/api/ai/build-task`, `describe-item-image`, `generate-ai-meta` and `parse-smart-intake` write nothing,
but any signed-in account (a store or a customer included) can call them, and each call costs a Gemini request.
The authorization guard (`src/app/api/routeAuthorization.guard.test.js`) lists them as exempt for that reason.

**Recommendation:** limit them to staff and artisans, plus stores for `parse-smart-intake` if their intake uses it
(check first). It's a cost question, not a data leak, so it waits for your call.

**Status:** DECIDED 2026-10-01 — owner: *"I don't want it abused, but if it's on a page that they can access, then they should be
able to use it ... Definitely a store. That's our flagship intake."* Done: `src/lib/aiAccess.js` gates each helper by the page that
uses it. Smart intake (parse-smart-intake, describe-item-image) is open to whoever may create a repair: admins, stores, on-site
repair ops. The task builder (build-task, generate-ai-meta) is admin-only. Everyone else gets a 403.

---

### Q12 — Smart intake suggests sizing stock from size 0 when the current ring size is blank (opened 2026-10-01)

**Context.** `getRingSizeDelta` (src/hooks/repairs/newRepairFormHelpers.js) reads an empty size as size 0
(`Number('') === 0`). `inferMaterialHintsFromSmartIntake` has no guard, so a description like "resize to 8" with no
current size extracted suggests 7 half-sizes of sizing stock (8 − 0 − the included first size). The test
`newRepairFormHelpers.test.js` pins today's behavior. Found while splitting the intake hook for max-lines.

**Recommendation:** treat a blank size as unknown, with no delta and no extra sizing stock suggested, so the jeweler
enters it. This only removes a wrong suggestion, but it changes what a ticket can charge, so it waits for your yes.

**Status:** open.

---

### Q13 — Smart intake has to be excellent: where does it fall short today? (opened 2026-10-01)

**Context.** Owner, 2026-10-01: *"it needs a lot of work, and we need to ratchet down on the AI smart intake, because that thing
needs to work amazing. They should think that it's a godsend that they get to use that."* It is the flagship intake for stores
and the counter: one sentence, or a photo, becomes the ticket (`/api/ai/parse-smart-intake`, `describe-item-image`, the client
in `src/hooks/repairs/useNewRepairForm.js`). Known so far: Q12 (a blank ring size suggests sizing stock from size 0).

**Recommendation:** treat it as its own project, measured against real cases: (1) collect 20–30 real intake sentences and photos
from the counter and from stores, each with the ticket it *should* have produced; (2) make that the test set and score today's
parse against it (tasks, metal, sizes, promise date); (3) fix the biggest misses first, re-scoring each change. The most useful
thing from the owner: a handful of intakes where it got it wrong, and what was right.

**Status:** open, waiting for those examples.
