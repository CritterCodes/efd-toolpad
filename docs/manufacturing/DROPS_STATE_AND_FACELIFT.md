# Drops — current state audit & facelift plan (2026-09-01)

Owner decision (2026-09-01): **pause new drop features; do a UI facelift of what already
exists first, then polish the listing experience.** This doc is the handoff for that work —
what's really there, what's broken/orphaned, and the direction we agreed on for the round
after the facelift. Companion to `ARTISAN_DROPS_AND_COLLABORATION.md` (the July build doc)
and the release-engine gap tracked in §13 of `PRODUCTION_PIPELINE_VISION.md`.

---

## 1. Two drop systems exist in the repo — one live, one dead

### 1a. LIVE: the `drops` collection (build of 2026-07)

Model: `src/app/api/drops/model.js`

```
dropId, slug, name, description (free text — the ONLY "brief" today),
ownerType: 'efd' | 'artisan', ownerId, ownerInfo,
collaborators: [userID],            // direct-add, no invite flow
channels: showcase|show|online|wholesale,
status: draft → scheduled → released → archived,   // NOTE: no 'vault' (see gap #4)
releaseAt, releasedAt, designOrder[], heroImage, thumbnail, seo
```

Prod data: 2 drops, both `draft` — one EFD ("Test1"), one artisan-owned (`user-0feb2313`).

Permissions (`src/lib/dropPermissions.js`, all enforced server-side and tested):
- **Create**: staff, or any design-authoring artisan (jeweler/engraver/CAD/designer/gem-cutter).
  Non-staff creations are FORCED self-owned + `draft`.
- **View**: staff see all; artisans see drops they OWN or COLLABORATE on (`dropListFilter`).
- **Manage** (meta/curation/collaborators): staff or the owning artisan.
- **Release/schedule/archive + ownership reassignment: EFD STAFF ONLY** — artisan patches that
  touch status/releaseAt/owner are rejected loudly (`validateArtisanDropPatch`).
- **Designs**: a collaborator may attach THEIR designs to the drop
  (`/api/production/designs` checks owner-or-collaborator before honoring `dropId`).
  No submission gate — a collaborator's design lands in the drop directly.

Surfaces:
- `/dashboard/products/drops` — the shared list (Planned/Scheduled/Dropped/Vault tabs,
  cards-only per owner ruling). This is what BOTH admin nav and artisan nav ("My Drops")
  point at; the API scopes what each role sees.
- `/dashboard/products/drops/new` — create form (name/slug/description/status/release date).
- `/dashboard/products/drops/[dropId]` — detail: description at top, Designs tab (grid +
  guided create stepper), Pieces tab.
- `/dashboard/artisan/drops` — an OLDER "My Drops" page with the only collaborator-management
  UI in the app (add/remove by raw userID). **Nothing links to it** (nav points at
  products/drops instead) — orphaned but functional.

### 1b. DEAD: the `drop-requests` API (legacy, never shipped a UI)

Routes under `src/app/api/drop-requests/**` implement an **open-call** model that is,
ironically, exactly the brief/guidelines concept we want:

- Admin creates: `theme`, `vibes`, `description`, structured `requirements`,
  `opensAt`/`closesAt` submission window, `targetQuantity`.
- Publish → status `open` + notifies EVERY artisan ("New Drop Opportunity").
- Artisans submit their published products + an artist `statement`; one submission per artisan.
- Admin approves/rejects submissions (`selectedArtisans`, `selectedProducts`, `collectionId`).

Status: **zero UI** (only orphaned CSS modules `ArtisanDropParticipation.module.css`,
`DropOrchestrationDashboard.module.css`), **zero documents** in the prod collection, built
against the legacy product model (`products.artisanId`). Do not resurrect — harvest its
fields (see §3) and delete the routes.

## 2. Known gaps in the live system (found 2026-09-01)

1. **Collaborator management has no home.** The surface everyone is routed to has NO
   collaborator UI; the only one is the orphaned `/dashboard/artisan/drops` page, and even it
   requires pasting a raw userID. Admin has no collaborator UI at all (API only).
2. **No notification when an artisan is added as a collaborator** — they'd never know.
3. **The New Drop form lies to artisans** — it hardcodes the "EFD · House" ownership chip and
   `ownerType: 'efd'`; the API silently corrects to artisan self-ownership, but the form
   shouldn't mislabel.
4. **`vault` is a tab but not a legal status** — the list page has a Vault tab surfacing
   `status: 'vault'`, but `DROP_STATUS` in the model doesn't include it, so no drop can ever
   reach the tab. (Related: the release engine itself is still not wired — release logic
   still lives on Collections; see PRODUCTION_PIPELINE_VISION §13.)
5. **No brief/guidelines structure** — a collaborating artisan's entire creative direction is
   the free-text `description`. No theme, no references/moodboard, no deadline, no target
   quantity, no per-drop channel guidance.
6. **No discovery face** — an artisan learns a drop exists only by already being on it.

## 3. Direction agreed 2026-09-01 (for AFTER the facelift)

Fold the good half of `drop-requests` INTO the live drop document rather than keeping two
systems:

- A structured **`brief`** on the drop: theme, vibes, guidelines text, reference images,
  submission deadline, target quantity.
- An optional **open-call phase**: per-drop participation mode —
  `invite-only` (today's curated collaborators) vs `open-call` (any artisan can submit a
  design for approval, submission window, approve/reject instead of direct-add).
- Notifications: on collaborator add (invite-only) and on call open (open-call).
- Delete `src/app/api/drop-requests/**` once harvested.

## 4. Sequence

1. **UI facelift of what exists** (next session, owner driving): the drops list/detail/create
   surfaces + fixing gaps #1–#3 (collaborator management with a real user picker on the
   shared surface, added-as-collaborator notification, honest ownership on the create form).
   Cards-only in Drops; design editing stays inline-tabbed (see design-editor-ux ruling).
2. **Listing experience polish** (after the facelift): the shop-facing side of drops/designs.
3. **Brief + open-call build** (§3), then the release engine + vault status (§13 work).
