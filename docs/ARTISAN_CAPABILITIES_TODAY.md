# What an artisan can do today — by type

**As of 2026-07-31**, read from the code and cross-checked against the live production `users` rows.
This is a description of what IS, not what should be. It's the input for redesigning scopes.

---

## The core problem: three unrelated permission systems on one user

Before the per-type list, this is the thing worth understanding, because it's why "artisan scopes" feels
slippery. An artisan's access is decided by **three independent fields that don't know about each other**:

| # | Field | What it actually gates | Set by |
|---|---|---|---|
| 1 | `role: 'artisan'` | the coarse door — can you reach artisan surfaces at all | approval |
| 2 | `artisanApplication.artisanType[]` | **only** which design *category* you may author (jewelry vs gemstone) | the application form |
| 3 | `employment.isOnsite` + `staffCapabilities.{...}` | **all** repair-shop work | hand-set per user, no UI |

Consequences of them being separate:

- **Artisan type does NOT gate repair work.** A `Gem Cutter` with `repairOps: true` can do bench repairs
  on rings. Nothing prevents it. Type only affects designs.
- **`staffCapabilities` is not tied to type or to anything else.** It's a free-form object hand-written
  onto a user document. There is no admin UI to set it — it was set directly in the database.
- **Both `isOnsite` AND `repairOps` are required** for repair access (`isOnsiteRepairOps`). Either one
  missing = no access. Two switches for one idea.
- **A capability can be granted that its owner's type contradicts**, and nothing flags it.

That's the redesign target: one scope concept instead of three overlapping ones.

---

## Layer 1 — what EVERY artisan can do, regardless of type

Any account with `role: 'artisan'`:

**Studio**
- Edit their own profile (`/api/artisan/profile`) — bio, photos, business info
- Manage their gallery: upload, tag, delete their own gallery pieces (`/api/artisan/gallery`)
- View their affiliate dashboard

**Finance**
- View their own payroll batches and detail (`/api/artisan/payroll`) — scoped to themselves; the
  `[batchID]` route explicitly refuses another artisan's batch
- View their own work log (`/api/artisan/my-work`)
- View sales invoices (`/dashboard/commerce/sales-invoices`)

**Production** (the Production Runs work)
- Create and manage **their own** production runs; mint pieces
- Open casting batches for their own runs, and drive them: `order`, `deliver`, `dispute`, `accept`
  — but **not** `receive`, `pay`, or `place-order` (staff-only: those set the debt or spend EFD's
  vendor account)
- Cancel their own casting batch **only before a charge exists**; once they owe money, staff-only
- Request CAD work
- View their own shipments

**Customs**
- Full visibility of custom orders they are **assigned to** (`/api/custom-orders` scopes by assignment)

**Drops / collections**
- Create and manage collections of `type: 'artisan'` that they own; add/remove their own products
- Submit to drop requests; view drops they own or collaborate on
- **Cannot** publish or release anything — that stays with EFD

**Products**
- Create products, upload images and sales media, submit for approval
- **Cannot** approve, publish, or unpublish their own products

**Read access that is broader than you might expect**
- `GET /api/users` — any signed-in user can list users. This is deliberate (the collaborator pickers in
  the drops design editor need it) but it means an artisan can enumerate customer names and emails.
  Flagged as an open decision, not yet narrowed.

---

## Layer 2 — what the artisan TYPE adds

Type comes from `artisanApplication.artisanType` and is normalized (`"Gem Cutter"` → `gem-cutter`).
**Its entire effect is design authoring.**

| Type | Sees "My Designs" nav | May author JEWELRY designs | May author GEMSTONE designs |
|---|---|---|---|
| `jeweler` | yes | **yes** | no |
| `engraver` | yes | **yes** | no |
| `cad-designer` | yes | **yes** | no |
| `designer` | yes | **yes** | no |
| `gem-cutter` | yes | no | **yes** |

That is the whole of it. Enforced by `canCreateDesignCategory` in `lib/designPermissions.js`.

Anyone with any of the five types also gets the **My Drops** and **My Customs** nav sections.
An artisan with **no type** set gets none of the design surfaces.

**What type does NOT affect:** repairs, casting, payroll, gallery, products, profile, customs
assignment. A `Gem Cutter` and a `Jeweler` have identical access to all of those.

---

## Layer 3 — repair-shop capabilities (the big one)

Requires **both** `employment.isOnsite === true` **and** `staffCapabilities.repairOps === true`.
Admins bypass this entirely.

| Capability | Unlocks |
|---|---|
| `repairOps` | the door to everything below; New Repair, My Bench, claim/unclaim, handoff, move, parts, receive |
| `receiving` | Pending Wholesale intake queue |
| `benchWork` | bench work assignment |
| `qualityControl` | QC pass/fail — **this is where bench labor gets credited to the assignee** |
| `closeoutBilling` | repair closeout and billing; Sales Invoices |
| `parts` | parts ordering / waiting-on-parts flow |

These gate **money operations**. `qualityControl` credits labor; `closeoutBilling` bills the customer.
They are the most consequential grants in the system and there is no UI to review or revoke them.

---

## Your six artisans, as they actually exist in production

| Email | Types | Onsite | Capabilities | Effective role |
|---|---|---|---|---|
| critter@engelfinedesign.com | Jeweler, Gem Cutter, CAD Designer | **yes** | all six | full bench + all design categories |
| vernonmcnabb1984@gmail.com | Jeweler | **yes** | all six | full bench + jewelry designs |
| michellelgrazier@gmail.com | Jeweler | **yes** | all six | full bench + jewelry designs |
| robertcowden@mac.com | Jeweler, CAD Designer | no | none | design/production only, no repairs |
| jacobwaynewest@gmail.com | Gem Cutter | no | none | gemstone designs only, no repairs |
| jerellrodriguez@yahoo.com | Engraver | no | none | jewelry designs only, no repairs |

**Three of six hold the full capability set** — every capability including `closeoutBilling` and
`qualityControl`. Worth asking whether all three need all six, or whether that was just the easiest
thing to type into the database.

---

## Vernon's problem: why he can't delete a repair

**Root cause found.** `src/app/api/repairs/[repairID]/route.js`:

| Verb | Gate | Vernon |
|---|---|---|
| `GET` | `requireRepairsAccess()` — admin, wholesaler, or onsite repair-ops | ✅ passes |
| `PUT` | `requireRepairsAccess()` | ✅ passes |
| **`DELETE`** | **`requireRole(['admin'])`** | ❌ **denied** |

So he can create a repair and edit it, but deletion is admin-only. There is also **no delete button
anywhere in the repair UI** — no `method: 'DELETE'` call exists in any repair page or component. So even
you can't delete a repair from the interface; the route is reachable only by hand.

**This is a design question, not just a bug.** A repair is a financial record — it carries labor credit,
parts cost, and customer billing. Options:

1. **Void instead of delete** (recommended). A `voided` status preserves the audit trail, releases the
   labor credit, and can safely be allowed to the creating artisan within a time window. Deleting a
   record someone was paid for is how ledgers drift.
2. Let repair-ops delete only *before* any labor is credited or parts ordered — a narrow, checkable
   window.
3. Keep it admin-only and just build the button for you.

My recommendation is (1), with (3) as the interim: a void action for the creator plus an admin-only
hard delete. But it's your call on how much artisans should be able to unwind.

---

## Gaps and inconsistencies found while mapping this

1. **`GET /api/repairs/estimate-context` has no authentication at all.** It serves repair estimate
   context (pricing-adjacent). Anonymous. Should be repair-ops or at minimum authenticated.
2. **No UI to view or set `staffCapabilities`.** The most consequential permissions in the system are
   database-only. You cannot see who holds `closeoutBilling` without querying Mongo.
3. **`isOnsite` and `repairOps` are redundant** — two fields for one decision, either of which
   silently removes access.
4. **`artisanType` is stored inconsistently**: sometimes an array (`["Jeweler"]`), sometimes a bare
   string (`"Gem Cutter"`). `userArtisanTypes` normalizes both, so nothing is broken, but the data
   shape is unreliable for querying.
5. **`superadmin` is honored in ~20 places but is not a real role** — not in `USER_ROLES`, never
   assigned. Dead branch that reads as meaningful.
6. **Capability grants have no audit trail.** No record of who granted `closeoutBilling` or when.

---

## What a better scope system would look like

The current model asks three questions (role, type, capabilities) that overlap and disagree. A cleaner
shape:

**One list of scopes on the user**, e.g. `scopes: ['designs:jewelry', 'repairs:bench', 'repairs:qc']`,
where:

- **Role stays coarse** — `artisan` vs `staff` vs `customer` decides which app you belong in.
- **Scopes replace both `artisanType` and `staffCapabilities`** — one flat, greppable list. Type becomes
  a *default scope bundle* granted at approval (`Jeweler` → `designs:jewelry`), not a separate gate.
- **`isOnsite` becomes a scope** (`repairs:*` implies onsite) rather than a second switch.
- **Ownership stays separate from scopes.** "Can I open a bench repair" is a scope; "is this MY repair"
  is a record check. Conflating them is what produces the both-or-neither gates that exist today.
- **Every grant is auditable** — who granted, when, why.

That also gives you the admin UI this is missing: a scope list is renderable as checkboxes; a free-form
`staffCapabilities` object is not.

**Sizing, honestly:** this touches every gate in the app — the same ~290 route files I just swept. It's
a real project, not an afternoon. The migration is mechanical (derive scopes from existing type +
capabilities, write them once, then switch gates over), but it must be done with the gates tested, or
it reopens exactly what we just closed.

**Suggested order:**
1. Fix `estimate-context` auth (5 minutes, it's a live hole)
2. Decide Vernon's void-vs-delete question, and build it
3. Build a read-only capability viewer so you can *see* who holds what
4. Then design the scope model, with a migration and gate tests
