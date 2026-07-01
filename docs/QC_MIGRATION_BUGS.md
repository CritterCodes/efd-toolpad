# Post-Migration QC — Bugs & Solutions

> Bugs found while QC-testing the migrated clone via browser. Each: symptom → root cause → proposed
> solution → sub-agent verification. Status: 🟡 proposed · 🔵 sub-agent-reviewing · ✅ agreed · 🔧 fixed.
> A bug is "done for QC purposes" once main + sub-agent **agree on the solution** (not necessarily fixed —
> fixes may be batched later). Companion: [QC_MIGRATION_TEST_LOG.md](./QC_MIGRATION_TEST_LOG.md).

---

## BUG-001 — Migrated custom orders show "Unknown customer"
- **Surface:** `/dashboard/customs/[customID]` (all `CO-mig-*` migrated orders)
- **Symptom:** Overview tab shows "Unknown customer"; only `Client ID: user-xxxx` is displayed.
- **Root cause:** Legacy `customTickets` referenced the customer by `userID` (e.g. `user-3b159832` /
  a wholesaler email), which does **not** resolve against the `clients` collection. The `s7b` migration
  set `clientID = userID` and stashed `legacyUserID`, but the customs UI resolves the display name via
  `clients` — no match → "Unknown customer". (Not a migration regression — a legacy data-model mismatch
  surfaced by the new UI.)
- **Solution (AGREED — refined per sub-agent review):** In `scripts/migrations/s7b-customtickets-to-customorders.mjs`,
  make the customTickets→customOrders step do a per-ticket **`users` lookup** and snapshot the identity
  (primary fix — Option A):
  - `const user = await db.collection('users').findOne({ userID: t.userID })` (lookup key is `users.userID`,
    the same pattern gallery/affiliates routes use — verified).
  - When the legacy ticket lacks `customerName`, snapshot from the user: `customerName = [user.firstName,
    user.lastName].filter(Boolean).join(' ') || user.businessName || user.email`; `customerEmail = user.email`;
    `customerPhone = user.phoneNumber ?? null`.
  - Keep `legacyUserID` for audit. `clientID` stays `userID`. (Secondary/optional: create a minimal `clients`
    row keyed to `userID` — deferred; not required to fix the display.)
  - Note: `buildOrder()` becomes async or the step pre-fetches a `userID→user` map (18 rows — trivial).
- **Status:** ✅ AGREED (main + sub-agent). Fix to be applied to `s7b` (batched with other cutover fixes).

## BUG-002 — Artisan-applicant nav points to a non-existent route
- **Surface:** Artisan-applicant navigation ("Application Status")
- **Symptom:** Nav item segment is `dashboard/application`, but no `src/app/dashboard/application/page.js`
  exists → clicking it 404s. The real applicant landing page is `/dashboard/pending`.
- **Root cause:** `src/lib/navigation/artisanApplicantNavigation.js` line ~39 uses
  `segment: 'dashboard/application'`; the page was built at `/dashboard/pending`.
- **Solution (AGREED):** Change the segment to `dashboard/pending` in `artisanApplicantNavigation.js`
  (line ~39) — one-line fix. Sub-agent confirmed **no other code references `dashboard/application`**
  (only the two docs), so no other updates needed.
- **Status:** ✅ AGREED (main + sub-agent). One-line fix, batchable.
