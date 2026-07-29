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
| **A3** | Fixed the three `engel**s**finedesign.com` fallbacks in `lib/email.js` (+ one in `users/controller.js`). **None of `SUPPORT_EMAIL` / `NEXT_PUBLIC_ADMIN_URL` / `NEXT_PUBLIC_SHOP_URL` is set, so the fallback is what actually rendered** — every email carried a dead support address and dead links. Env var still needs setting in Vercel (below). |
| **A4** (partial) | Middleware now gates `/dashboard/admin/*` to `STAFF_ROLES` — the page-level twin of A2. **Deliberately scoped to that one prefix**; see "Needs a decision". 19 tests. |
| **A5** | `role: user.role \|\| 'admin'` → defaults to `USER_ROLES.CLIENT`. The JWT now signs the *resolved* role (it signed raw `user.role`, so a role-less account got `undefined` in its token while its session said `admin`). |

`STAFF_ROLES` is now exported from `lib/designPermissions.js` and consumed by `isStaff`, these routes,
the middleware, and `artisanBilling.isEfdSelf` — one definition, so a role can't be staff in one gate
and not another.

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

- **Set `NEXT_PUBLIC_ADMIN_URL=https://admin.engelfinedesign.com` in Vercel** for efd-admin (A3).
  Code fallbacks now cover its absence, but the env var should be right regardless. Same for
  `NEXT_PUBLIC_SHOP_URL` and `SUPPORT_EMAIL`.
- **A7, local dev DBs.** `efd-admin/.env.local` has `MONGO_DB_NAME=efd-db-migrate` while
  `efd-shop/.env.local` has `efd-database-DEV`. The apps share `users` in production but not locally,
  so an application submitted on a local shop is invisible to a local admin ("User not found"). Point
  admin at `efd-database-DEV` to test the flow end to end. Not changed here — it's your env file.
- **Verify A1 for real:** approve a test applicant and confirm the delivered button href is an
  absolute `https://admin.engelfinedesign.com/auth/signin?...`. Templates compile and are unit-covered,
  but nothing here proves deliverability.
