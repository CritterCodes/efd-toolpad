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

## BUG-003 — Admin repair-intake "Add New Client" does not persist a client record
- **Surface / flow:** `/dashboard/repairs/new` (admin) → "Add New Client" dialog (F1 lifecycle test).
- **Symptom:** Filling the "Add New Client" dialog (First/Last/Phone) and clicking "Add Client", then saving
  the repair, creates the repair with `clientName` set (e.g. "QCLifecycle Repair") **but no `clients`
  document is created** (verified: no client with phone `5550009999`; not in the 3 most-recent clients).
  Contrast: the **wholesaler** "Add New Client" flow DID persist a client (`client-873fe5f2`).
- **Root cause (to confirm):** the admin repair-intake NewClientForm likely sets the repair's `clientName`
  locally (walk-in capture) without POSTing to the clients API / creating a `clients` doc — or the create
  call fails silently. Needs code confirmation in the admin `new`-repair client dialog vs. the wholesaler one.
- **Proposed solution (pending sub-agent review):** if adding a client is meant to create a roster entry,
  the admin dialog should POST to the same clients-create path the wholesaler flow uses and link the repair
  to the returned `clientID` (not just store a free-text name). If walk-in-without-record is intended,
  that's by-design — confirm and document. **Sub-agent to determine real-vs-by-design + the correct fix.**
- **RESOLUTION (main + sub-agent agree): NOT a migration bug — reclassified as pre-existing design inconsistency.**
  DB re-check disproved the original symptom: admin "Add New Client" **does persist** — it created `users` doc
  `user-40dfa5ac` (role `customer`). Admin clients live in the **`users`** collection (166 client/customer users;
  `/dashboard/clients` reads users) while the wholesaler roster uses the **`clients`** collection (51). My first
  check searched `clients` — wrong collection. Genuine (pre-existing) quirks, NOT caused by the migration:
  (1) two parallel client models (`users` vs `clients`); (2) admin repair sets `repair.userID` = the creator's id
  and keeps the client only as free-text `clientName` (wholesaler repairs set `userID` = client id). The clone
  behaves identically to prod here. **Does not block cutover; logged for the app-design backlog, not a migration fix.**
- **Status:** ✅ CLOSED (agreed: not a migration regression).

## BUG-004 — Gemstone "Add Gemstone" → `/products/gemstones/new` renders a blank page (no create form)
- **Surface / flow:** `/dashboard/products/gemstones` → "Add Gemstone" navigates to `/dashboard/products/gemstones/new`,
  which renders **empty** (only the header shell; 0 inputs, bodyLen ~42) after full compile. Contrast:
  `/dashboard/products/jewelry/new` renders a full editor (F5 worked).
- **Root cause (to confirm):** likely no `src/app/dashboard/products/gemstones/new/page.js`, so `/new` falls through
  to the `[id]` editor with `id="new"`, and the gemstone `[id]` editor (unlike the jewelry one) doesn't handle the
  `"new"` sentinel → renders nothing. (Pre-existing UI/routing issue, not migration-caused — page content doesn't
  depend on migrated data.)
- **Root cause (sub-agent CONFIRMED):** commit `efb01ac` ("strict architectural refactor <300 line limit")
  gutted the gemstone editor. `src/app/dashboard/products/gemstones/[id]/page.js` is now a server component
  with **no params handling** that renders `<GemstoneDetails/>` + `<GemstonePricing/>` — both of which are
  **stubs that `return null`** → blank page for BOTH `/new` and `/[id]` (edit). The jewelry editor works because
  `jewelry/[id]/page.js` is a client component using `useJewelryEditor(id)` (hook detects `isNew = id==='new'`).
  So the gemstone editor is entirely non-functional (create AND edit), not just `/new`.
- **Solution (AGREED — main + sub-agent):** mirror the jewelry pattern — make `gemstones/[id]/page.js` a
  `'use client'` component that reads `useParams().id`, add a `useGemstoneEditor(id)` hook (analogous to
  `src/hooks/jewelry/useJewelryEditor.js`, `isNew='new'` → empty form; else fetch `/api/products/gemstones/{id}`),
  and implement `GemstoneDetails`/`GemstonePricing` to render the form (they currently render nothing). Or restore
  the pre-refactor editor from commit `f7c6393`. **Pre-existing UI bug (refactor), NOT migration-caused.**
- **Status:** ✅ AGREED (main + sub-agent). Real bug; blocks gemstone create/edit; batchable UI fix.
