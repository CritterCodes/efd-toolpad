# program.md — My-Bench UX variant

You are redesigning the **jeweler's "My Bench" screen** of the Engel Fine Design admin app.
Make ONE coherent redesign per the thesis you are assigned (see `variants.md`). You are not
fixing bugs or adding backend features — you are improving the **UI/UX** of this one screen.

## What you may change (the "train.py")

- `src/app/dashboard/repairs/my-bench/page.js` — the bench page (header, tabs, grid, dialogs)
- `src/app/dashboard/repairs/my-bench/components/BenchWorkCard.js` — the per-work-order card
- You MAY add new components under `src/app/dashboard/repairs/my-bench/components/`
- You MAY adjust styling/tokens usage from `@/app/dashboard/repairs/components/repairsUi`
  (the `REPAIRS_UI` palette) — but keep the app's existing dark-panel/gold-accent identity.

## What you must NOT change (the "prepare.py")

- The API contracts. The page fetches `/api/bench/my-bench`, `/api/repairs/bench-jewelers`,
  and posts actions to `/api/bench/work-orders/{id}/{action}` and
  `/api/repairs/{id}/claim`. Keep the same calls, payload shapes, and the work-order shape
  (`workOrderID`, `benchQueue`, `sourceType`, `source`, `discipline`, `assignedToUserID`,
  `isRush`, `promiseDate`, etc.).
- The bench-queue/tab model from `@/services/workOrders/workOrderWorkflow`
  (`BENCH_QUEUE`, `BENCH_TABS`, `isWorkOrderInTab`) and `@/services/repairWorkflow`.
- Auth/session behavior, role gating (`admin`/`dev`), and all existing actions
  (claim, unclaim, move-to-qc, needs-parts, parts-ordered, communication-complete,
  CAD STL/GLB upload, bulk QC approve, scan-to-claim).
- Tests, schemas, scripts, and anything outside `my-bench/`.

Every existing capability must still be reachable. You are rearranging and clarifying, not
removing function.

## The gate (your "5-minute training run")

Before you are done, ALL of these must pass from the repo root:

```
npm test
npm run lint
npm run build
```

If any fail, fix your own changes until they pass, or revert. A variant that cannot pass the
gate is discarded — do not hand back broken work.

## The metric (how you'll be judged)

There is no automatic score. A human will open your Vercel preview and rate it 1–5 on:

1. **Clicks/taps to the common actions** — claiming a scanned repair, moving in-progress
   work to QC, approving QC. Fewer is better.
2. **Glanceability** — can a jeweler see "what's mine / what's next / what's blocked"
   in under 2 seconds?
3. **Bench/tablet usability** — this is used standing at a bench, often on a tablet, sometimes
   with a barcode scanner. Touch targets, scan-first flow, readability matter.
4. **Would I actually use this** — does it feel better than today, not just different?

Optimize for those. Cosmetic-only reskins score low; real friction reduction scores high.

## Deliverable

- All work on your assigned branch only.
- A short `VARIANT_NOTES.md` at repo root describing: your thesis, the 3–5 concrete UX changes
  you made, the click-count before/after for "claim a scanned repair" and "move my bench to QC",
  and anything you deliberately did NOT do.
- Gate green. Branch pushed for preview deploy.
