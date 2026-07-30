# Artisan onboarding handoff — status

Response to `efd-shop/docs/ARTISAN-ONBOARDING-ADMIN-HANDOFF.md` (audit of shop apply → admin review →
artisan signs in). Every claim below was re-verified against this codebase before acting; two were
wrong or understated, noted inline.

## Done

| Item | What shipped |
|---|---|
| **A2** | `requireRole(STAFF_ROLES)` on GET/PATCH/DELETE of `/api/admin/artisans` and `/api/admin/artisans/[applicationId]`; `status` validated against `['pending','approved','rejected']`; `reviewedBy` taken from the session, not the body. 17 tests. |
| **A8** | Deleted `/api/artisan/[applicationId]/route.js` + `src/lib/emailService.js`. **The handoff filed this as dead-code cleanup; it was actually a second copy of A2's vulnerability** — same missing auth, same `updateArtisanApplicationStatus` call that sets `role: 'artisan'`. Guarding only the `admin` route would have left self-approval fully open. No callers in either app. |
| **A1** | Registered `artisan-approved` / `artisan-rejected` in `lib/email.js` + added both `.hbs` templates (inline-table house style, matching `generic-notification.hbs`). Approval CTA → `${adminUrl}/auth/signin?callbackUrl=%2Fdashboard`, absolute; body names the admin host and says to use the existing shop password. Rejection no longer links `/artisan-application` (a 404 in this app) — it points at the shop. |
| **A3** | Fixed the `engel**s**finedesign.com` fallbacks (an extra "s" — a domain EFD does not own) in `lib/email.js` + `users/controller.js`. **None of those env vars is set, so the fallback is what actually rendered** — every email carried a dead support address and dead links. **Then it turned out to be systemic (see below).** |
| **A3+** | **`NEXT_PUBLIC_ADMIN_URL` was interpolated unguarded at ~26 sites** — 19 with `\|\| ''` (yielding a RELATIVE href, inert in an email client) and 7 with no fallback at all (yielding the literal string `"undefined/products/abc"`). Every repair, payroll, product-submission, drop, collection, custom and bench notification carried one. All 20 files now route through `lib/appUrls.js` (`adminBase()` / `shopBase()` / `adminLink()` / `shopLink()`), which is absolute-or-nothing. 12 tests. |
| **A4** (partial) | Middleware now gates `/dashboard/admin/*` to `STAFF_ROLES` — the page-level twin of A2. **Deliberately scoped to that one prefix**; see "Needs a decision". 19 tests. |
| **A5** | `role: user.role \|\| 'admin'` → defaults to `USER_ROLES.CLIENT`. The JWT now signs the *resolved* role (it signed raw `user.role`, so a role-less account got `undefined` in its token while its session said `admin`). |

`STAFF_ROLES` is now exported from `lib/designPermissions.js` and consumed by `isStaff`, these routes,
the middleware, and `artisanBilling.isEfdSelf` — one definition, so a role can't be staff in one gate
and not another. It includes `superadmin` to match the ~20 incumbent sites that already treat it as
staff; omitting it would have made the new gates the only ones denying it.

## Found by review AFTER the first pass — the audit's scope was not the vulnerability's scope

A 5th-round adversarial review falsified the A2 claim ("GET no longer serves the applicant pool
unauthenticated") in one anonymous request, and found something worse that no audit had named:

| | |
|---|---|
| **`GET /api/artisan`** | **Still served the entire applicant pool + stats anonymously.** The same `getAllArtisanApplications` as the guarded route. The first pass deleted the `[applicationId]` CHILD as an unauthenticated duplicate and **left the parent**. Zero callers in either repo → deleted, same precedent. |
| **`PUT /api/users/[userID]`** and **`PUT /api/users?query=`** | **Unauthenticated privilege escalation to `admin`.** Stripped only `_id`/`userID`/`createdAt` before a raw `$set`, so `PUT /api/users/<anyone> {"role":"admin"}` succeeded with no session. Strictly worse than the artisan hole (which granted only `artisan`) and it **defeated every other gate in the app** — an escalated account then passes them legitimately. GET leaked any user record; DELETE removed accounts. Now: reads require a session, writes require staff, and privilege fields (`role`, `password`, `status`, `emailVerified`, `staffCapabilities`, `mustChangePassword`) are stripped even for staff, so this generic `$set` can't be a side door around `create-admin` / `promote-affiliate`. 17 tests. |
| **Middleware auth bypass** | `pathname.includes('.')` returned `next()` **before** the session check and before the new staff gate, so `/dashboard/admin/affiliates/x.y` skipped middleware entirely, unauthenticated. Removed — `config.matcher` already limits this middleware to `/`, `/dashboard`, `/auth`, `/emergency-logout`, so real static assets never reach it. |

**The lesson, recorded because it cost two rounds:** guarding the routes an audit *names* is not the
same as guarding every route that can reach the privileged operation. Both misses were duplicate paths
into an already-identified sink. Grep the SERVICE function, not the route.

Reads on `/api/users` are deliberately authenticated-only rather than staff-only: `?role=artisan` feeds
the collaborator pickers artisans use in the drops design editor, so staff-gating reads would break
their own surfaces. That narrowing belongs with the access matrix below.

## Needs a decision (not changed unilaterally)

- **A4, the rest of `/dashboard/*`.** `finance`, `users`, `clients`, `analytics`, `wholesaler`,
  `commerce`, `blogs` and others are still reachable by any authenticated user. The intended access
  matrix isn't recorded anywhere, and a blanket role matcher would lock people out of work they do
  today — exactly what the handoff warned about. `/dashboard/admin/*` was safe to gate because no
  artisan nav item resolves under it (`lib/navigation/artisanNavigation.js`). The rest needs the
  owner to say who may see what.
- **A6, notification read-state.** Both apps write `notifications` with different shapes
  (`status:'read'` vs `inApp.read`, `archivedAt` vs `isArchived`, `in_app` vs `inApp`). Not breaking
  onboarding — Mongo's missing-field semantics make the approval notice appear in both bells — but
  marking read in one app never clears it in the other. **Cross-app schema change: converge
  deliberately, with both sides deployed together.** The lower-risk direction is making each reader
  tolerant of both shapes first, then migrating writers.
- **Retire the `jacobaengel55@gmail.com` hardcode** in `auth/[...nextauth]/service.js`. Kept for now
  *because* A5 changed the default to least-privilege: if that row lacks `role`, the override is the
  only thing preventing the owner from being locked out of his own admin app. Confirm the PROD row has
  `role: 'admin'`, then delete the ternary. A hardcoded identity in an authorization path shouldn't
  outlive that check.

## Yours to do (outside the codebase)

- ~~Set `NEXT_PUBLIC_ADMIN_URL` in Vercel~~ **NOT NEEDED** (owner, 2026-07-29: "don't we already have
  a similar secret"). Correct — `NEXTAUTH_URL` already IS this app's canonical base URL, NextAuth
  requires it in production so it is always set, and the repo already used it this way in
  `users/controller.js`. The chains are now
  `NEXT_PUBLIC_ADMIN_URL || NEXTAUTH_URL || <hardcoded>` and
  `NEXT_PUBLIC_SHOP_URL || EFD_SHOP_URL || <hardcoded>` — both middle terms already exist everywhere,
  so **no new env var is required to deploy this**. Setting `SUPPORT_EMAIL` is still optional if
  `critter@engelfinedesign.com` isn't the address you want on outbound mail.
  (`NEXTAUTH_URL` is server-only — these render server-side, so don't move them into a client
  component.)
- **A7, local dev DBs.** `efd-admin/.env.local` has `MONGO_DB_NAME=efd-db-migrate` while
  `efd-shop/.env.local` has `efd-database-DEV`. The apps share `users` in production but not locally,
  so an application submitted on a local shop is invisible to a local admin ("User not found"). Point
  admin at `efd-database-DEV` to test the flow end to end. Not changed here — it's your env file.
- **Verify A1 for real:** approve a test applicant and confirm the delivered button href is an
  absolute `https://admin.engelfinedesign.com/auth/signin?...`. Templates compile and are unit-covered,
  but nothing here proves deliverability.
