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
- **Auth disabled on live endpoints** — `src/app/api/rush-jobs/route.js` and
  `src/app/api/tasks/universal/route.js` both carry *"Re-enable once authentication is
  properly configured"*; the latter hardcodes `createdBy: 'admin@example.com'`. These accept
  requests unauthenticated. **Verify exposure and re-gate.**
- **`src/lib/paymentService.js` is a stub** — `createPaymentLink` / `getPaymentStatus` /
  `processRefund` / `verifyWebhook` are `console.warn` no-ops. Custom orders use Stripe
  directly (`src/app/api/custom-orders/stripe.js`), so confirm who (if anyone) calls
  paymentService and either wire it or delete it.

## 🟡 Unimplemented integrations (stubs that silently no-op)
- **Email / notifications not implemented** — `src/lib/emailService.js`,
  `src/lib/user/user.notification.service.js`, plus "TODO: send notification/email" on:
  admin product decline, wholesale approve/reject, artisan product submit, drop-request
  submit, custom-orders communications. Outbound comms largely don't fire.
- **`useNewRepair.js`** — `submitForm` returns `{ success: false }` (stub). Confirm whether
  the new-repair flow now lives elsewhere (likely) and this hook is dead.
- **`UserGridList.js`** — row edit/delete buttons are `onClick={() => {/* TODO */}}` no-ops.
- **`DashboardLayout.jsx`** — overview cards + "wholesale products" sections are TODO stubs.

## 🟢 Abandoned / duplicate files (dead code → task #29 sweep)
`src/components/dashboards/ArtisanDashboard-{backup,broken,redundant}.js`,
`WholesalerDashboard-backup.js`, `src/app/dashboard/page-backup.js`,
`src/app/dashboard/products/jewelry/[id]/page.js.bak`, `src/utils/processes.util.js.bak`,
`src/services/_deprecated_appointments.js`, `src/services/_deprecated_googleCalendar.js`,
the top-level `deprecated/` dir (incl. the parked legacy my-bench page).
(`src/app/dashboard/bench/page.js` is an intentional redirect stub — **keep**.)

## Deferred by design — tracked in sprints.md (already in live tasks)
- **UI phase** U2 production catalog (#31), U4 product editor (#32), U5 marketplace admin
  (#33), U6 polish (#34). U1 bench + Customs UI done; U3 meshMap ≈ delivered via refrakt Studio.
- **Tech-debt backlog** (#35): orphaned cross-DB code, unify DB helpers, drop junk `inventory*`
  collections, legacy cad-request absorption, customTickets residuals. Plus scrub S3→MinIO (#28).

## This session's loose ends (live tasks)
Branch + PR (#23), manual-verify bench handoff (#24), verify piece/CAD WOs in the
admin-on-behalf board (#25), decide WO auto-spawn/cull (#26), re-normalize test order
CO-mqx0d5ya (#27).

## Git hygiene
12 local branches (archive/*, backup/*, rescue/*, hotfix/*, codex/*, feature/*, ui/modern-redesign)
— prune the merged/abandoned ones. Everything from this session sits on
`chore/react-19-upgrade` (mislabeled) — see #23.
