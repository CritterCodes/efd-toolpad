# Debt & trail-off inventory

> **🚦 `main` is FROZEN.** No PR/merge to `main` until the whole rebuild ships. All work
> stays on the integration branch (currently `chore/react-19-upgrade`). The merge to main is
> the **final gated step** (task #23), and only clears once this checklist is green:
> - **All new UI** — U2 production catalog (#31), U4 product editor (#32), U5 marketplace
>   admin (#33), U6 polish (#34). (U1 bench, Customs UI, U3 meshMap-via-Studio done.)
> - **Auth hardening** — re-gate disabled endpoints (#36); resolve/remove the
>   `paymentService.js` stub; sweep for other auth gaps.
> - **Testing** — bench-handoff E2E (#24), piece/CAD admin-on-behalf (#25), broader coverage
>   + a full regression/QA pass; then a security review of the entire diff.
> - **Prod-relevant tech-debt** — dead-code sweep (#29), scrub S3→MinIO data (#28), tech-debt
>   cluster (#35). Plus the WO auto-spawn/cull decision (#26).
> Lower-priority (not main-blockers): test-order re-normalize (#27), refrakt slider work (#30, separate repo).


A single place for work that was **stubbed, deferred, or abandoned** — found by sweeping the
five surfaces where trail-offs hide (code markers, stub-shaped code, abandoned files, the
sprint doc backlog, git branches). Generated 2026-06-29. Cross-references live tasks (#NN)
and [sprints.md](manufacturing/sprints.md).

> **How to regenerate:** `grep -rnIE "\b(TODO|FIXME|HACK|XXX|STUB)\b" src` + `find src -iname "*-backup*" -o -iname "*-broken*" -o -iname "*.bak" -o -iname "*deprecated*"` + read sprints.md "Tech-debt" / "Deferred UI phase" sections + `git branch`.

## 🔴 Security / correctness stubs (triage first)
- ~~**Auth disabled on live endpoints**~~ ✅ DONE (d5fe3c1) — `rush-jobs` (GET+POST) re-gated
  with `requireRepairOps()`; `tasks/universal` (POST) with `requireRole(['admin','dev'])` +
  session-derived `createdBy`. No disabled-auth patterns remain in the codebase.
- ~~**`src/lib/paymentService.js` is a stub**~~ ✅ DONE (3ddb8f7) — deleted; it was a no-op
  stub with zero references (custom orders use Stripe directly). **🔴 section now clear.**

## 🟡 Unimplemented integrations (stubs that silently no-op)
- **Email / notifications not implemented** — `src/lib/emailService.js`,
  `src/lib/user/user.notification.service.js`, plus "TODO: send notification/email" on:
  admin product decline, wholesale approve/reject, artisan product submit, drop-request
  submit, custom-orders communications. Outbound comms largely don't fire.
- **`useNewRepair.js`** — `submitForm` returns `{ success: false }` (stub). Confirm whether
  the new-repair flow now lives elsewhere (likely) and this hook is dead.
- **`UserGridList.js`** — row edit/delete buttons are `onClick={() => {/* TODO */}}` no-ops.
- **`DashboardLayout.jsx`** — overview cards + "wholesale products" sections are TODO stubs.

## ✅ Abandoned / duplicate files — DONE (commit 9628b08)
Removed (5.2k lines, all zero-reference): `ArtisanDashboard-{backup,broken,redundant}.js`,
`WholesalerDashboard-backup.js`, `dashboard/page-backup.js`, `products/jewelry/[id]/page.js.bak`,
`utils/processes.util.js.bak`, `services/_deprecated_{appointments,googleCalendar}.js`, and the
`deprecated/` dir. (`src/app/dashboard/bench/page.js` is an intentional redirect stub — kept.)

## Deferred by design — tracked in sprints.md (already in live tasks)
- **UI phase** U2 production catalog (#31), U4 product editor (#32), U5 marketplace admin
  (#33), U6 polish (#34). U1 bench + Customs UI done; U3 meshMap ≈ delivered via refrakt Studio.
- **Tech-debt backlog** (#35): ~~orphaned cross-DB code~~ ✅ done (b5ad4d8 — also removed the last
  `jewelry-ecommerce` hardcoded-DB ref); still open: unify DB helpers (`@/lib/mongodb` →
  `@/lib/database`, ~48 importers), drop junk `inventory*` collections at cutover, legacy
  cad-request absorption (+ product-embedded "New CAD Request" dialog + navless `/dashboard/requests`),
  customTickets residuals. Plus scrub S3→MinIO (#28).

## This session's loose ends (live tasks)
Branch + PR (#23), manual-verify bench handoff (#24), verify piece/CAD WOs in the
admin-on-behalf board (#25), decide WO auto-spawn/cull (#26), re-normalize test order
CO-mqx0d5ya (#27).

## Git hygiene
12 local branches (archive/*, backup/*, rescue/*, hotfix/*, codex/*, feature/*, ui/modern-redesign)
— prune the merged/abandoned ones. Everything from this session sits on
`chore/react-19-upgrade` (mislabeled) — see #23.

---

# Dead-code sweep (#29) — ranked inventory

From a 3-lens fan-out (orphan pages / unimported modules / dead API routes + legacy clusters),
reconciled + de-falsed. **Tiers are by confidence + removal risk. Delete top-down.**

## ✅ Tier 0 — removed (11fc43a, this session)
7 empty (0-byte) route stubs (`admin/initialize-processes-materials`, `admin/seed-collections`,
`admin/settings/cascade`, `contact/route`, `tasks/crud`, `contact/bulk`, `contact/analytics`),
2 empty pages (`dashboard/contact-requests`, `dashboard/repair-tasks`), and the 0-ref
`@deprecated` `utils/pricing/legacy-pricing.util.js`.

## Tier 1 — high confidence, delete after a 1-line ref check each
- **Orphan pages (non-empty, 0 refs):** `app/admin/demo/repair-costing/page.js` (demo stub),
  `app/dashboard/admin/artisans/overview/page.js`.
- **Debug/dev API routes (0 callers; also a mild info-leak):** `api/debug-data`,
  `api/debug/env`, `api/debug/session`, `api/debug/session-info`, `api/debug/test-auth`.
- **Complete-but-unused API routes (0 callers):** `api/suggestions` (gemstone), `api/roles/permissions`,
  `api/auth/check-local-storage`.

## Tier 2 — verify EXTERNAL caller first (efd-shop / Vercel cron), then delete
- `api/cron/update-metal-prices` — may be a Vercel cron target (check cron config / vercel.json).
- `api/auth/migrate-passwords` — one-time migration utility; confirm it isn't invoked anywhere.
- `api/products/gemstones/*`, `api/products/cad-designs/*` — 0 in-app callers; superseded by the
  CAD-request flow, but verify efd-shop + the gemstone data model don't depend on them.

## Tier 3 — LEGACY NAV CLUSTER (one investigation, likely deletes together)
Active nav = `@/lib/roleBasedNavigation` + `lib/navigation/*` (confirmed live, imported relatively).
The **legacy** side appears unused and props up 4 false "reachable" pages:
- `src/constants/roles.js` (`DASHBOARD_SECTIONS`) + the `RoleBasedNavigation.jsx` component.
- The 4 pages referenced ONLY by it: `dashboard/artisan/{collections,drops,products}`,
  `dashboard/wholesaler/products`.
Confirm `constants/roles.js` + `RoleBasedNavigation.jsx` have no live importer, then remove the
cluster + those 4 pages as one unit.

## Tier 4 — MODULE-LEVEL: ✅ FILE SWEEP COMPLETE — `knip` reports 0 unused files
Removed across reviewed, build+test-verified batches (each a commit):
`frontend/` (8) · app/components mirror (51) · non-component modules hooks/schemas/services/
utils/config/lib/contexts/constants (207) · components (132) · app/ helper modules (73) =
**~471 files**, on top of the earlier Tier 0–3 stubs/routes/legacy-shell. **knip "Unused files"
is now empty.** Method per batch: re-run knip (cascade-aware) → confirm no dynamic-import target
in the set (codebase dynamic-imports only models/lib/services/packages, never local components)
→ delete → `pnpm build` + `pnpm test`.

**Still open (separate, finer-grained — NOT file deletions):**
- **Unused exports (163)** — dead exports *inside live files*. Trim per-file (remove export +
  confirm nothing breaks). Tedious; lower value. e.g. `DASHBOARD_SECTIONS`/`getDashboardSections`
  in `constants/roles.js` (orphaned when the legacy nav shell was removed).
- **Unused dependencies (17) + devDeps (4)** — prune from package.json, but verify each isn't used
  implicitly (build tooling, runtime, peer) before removing.

### (historical) original knip notes — use knip (installed + configured)
`knip` is now a devDep with `knip.json` (scoped to the admin app: Next + scripts + tests as
entries; `public/`, `frontend/`, `microservices/`, `examples/`, `deprecated/` ignored). Run:
**`pnpm deadcode`**. Validated trustworthy: the `@/` alias resolves, Next route/page/layout
entries are correctly excluded (0 false-flagged), and known-live files (AppShell,
roleBasedNavigation, customProduction, QuoteTab, …) are correctly NOT listed.

Current candidates: **~464 unused src files, 163 unused exports, 17 unused deps** (converges
with the agents' 428 → the dead mass is real). **Caveat — delete in REVIEWED batches, not
blind:** knip can miss `dynamic(() => import())` targets (spot-check found `viewers/GLBViewer.jsx`
flagged-but-referenced). Workflow per batch: take a cluster → confirm none are dynamically
imported → delete → `pnpm build` + `pnpm test`. Best done cluster-by-cluster (e.g. the
`src/app/components/*.component.js` legacy mirror, dead analytics/drop-dashboard components,
`src/schemas/`, `src/config/`).

### Whole abandoned CLUSTERS (knip-surfaced, outside src/) — confirm-then-delete as units
These are separate sub-trees, biggest single wins, but confirm they aren't deployed elsewhere:
- `frontend/` (~8 files) — an old **repair-costing demo** sub-app (`.tsx`); superseded by the
  in-app costing. The deleted `app/admin/demo/repair-costing` page was its admin entry.
- `microservices/custom-tickets-service/` (~13 files) — orphaned microservice for the
  deprecated customTickets system (collection retained, code dead).
- `examples/` (3 files) — material/dialog example scripts.
- `src/middleware copy.js` — a stray copy of `middleware.js` (Next only uses `middleware.js`).

### Also from knip (separate fixes, not deletions)
- **Unlisted deps:** `prop-types` (used across many `app/components/*.component.js`) and `dotenv`
  (used in `scripts/*`) are imported but not in package.json — add them, or (better) these
  `*.component.js` files are likely part of the dead legacy mirror anyway.
- **Unused deps (17) / devDeps (4):** prune from package.json after the file sweep settles.

## Keep — confirmed live despite "legacy"/deprecated labels
`api/repairs/closeout/legacy-close` (called from pick-up page); `repairTasks` schema field
(migration may be incomplete); `@deprecated` *methods* inside otherwise-live files
(`processes/service.js`, `tasks/service.js`, `taskUpdate.service.js`, `material.pricing.js`) —
finer-grained export-level cleanup, defer to the knip pass.
