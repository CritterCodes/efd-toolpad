# Friction log

> **Kind:** descriptive (a log, newest first) · **As of:** 2026-10-01

What slowed a session down, and what would remove it (Kuzu's FRICTION-LOG; docs/GUARDRAILS_PLAN.md, Phase 3). One
entry per snag: date, what happened, cost, the fix (done or proposed). An entry with a proposed fix is a candidate
for a guardrail.

---

- **2026-10-01: a check that fails at random.** A React hydration mismatch (#418) struck 4 unrelated pages on one CI
  views run and none on the run before. Each one failed the PR. **Fixed:** timing-dependent kinds (console, API,
  hydration) are listed, never failed. **A cause found 2026-10-01:** `/dashboard/pending` put a Chip in MUI's
  `secondary` slot, which renders a `<p>`; a `<div>` inside a `<p>` makes the browser close the `<p>` early, so the DOM
  stops matching the server's. Fixed and re-checked: that page went from a hydration error to clean. Whether it
  accounts for the earlier four-page run is NOT established — it was the only mismatch the crawl reached before dev
  compile times made a full pass impractical. **Lesson:** go to a `next dev` build immediately — production React
  prints only the error number, while dev names the element and the page. And check the claim before believing it: the
  notification bell looked guilty (elements in a `secondary`) and was innocent — every child renders a `<span>`, and a
  dev run with seeded notifications produced no message at all. Guarded by `listItemTextSecondary.guard.test.js`.
- **2026-10-01: Windows and Linux fonts measure differently.** The views baseline made on Windows missed a 10px
  cut-off that Linux CI found. **Fixed:** CI is the reference; every run writes `baseline.next.json` into the
  artifact to adopt.
- **2026-10-01: shell and Python quoting mangle regexes.** A `\b` written through a Python string became a backspace
  character, and a `\d` through `node -e` lost its backslash; both shipped to CI before anyone noticed. **Rule:** edit
  code that contains backslashes with the Edit/Write tools, never through a heredoc or a quoted `-e` script.
- **2026-10-01: the local production build failed with "Cannot find module react/jsx-runtime".** `scripts/prepare-next-dir.js`
  junctions `.next` to `%LOCALAPPDATA%`, outside the project, and the server bundles can't resolve packages from
  there. **Workaround:** a real `.next` folder in the worktree, and move `tsconfig.json` aside while building.
- **2026-10-01: dev dependencies can't be installed locally.** The npm token is dead and this is a pnpm workspace
  member. **Fixed:** `.github/workflows/deps.yml` installs on a branch from CI. For local runs of `npm run views`,
  install `@playwright/test` + `mongodb-memory-server` into a scratch folder and point `VIEWS_MODULES` at it.
- **2026-10-01: every burn-down PR conflicts on `eslint-suppressions.json`.** Each one prunes entries from the same
  file, so after one merges the next conflicts. **Workaround:** merge `main` in, take `main`'s copy of the file, run
  `npm run lint:prune`, push, wait for CI again. Merge burn-downs one at a time. **Proposed:** fewer, larger burn-down PRs.
- **2026-10-01: "no `<h1>`" and "blank" caught pages still loading.** A busy CI runner saw `users/manage` on
  "Loading users…" at desktop width but rendered at phone width, and failed an unrelated PR. **Fixed (#168):** the
  check measures a title-less or blank page again once its spinner is gone (up to 8s).
- **2026-10-01: eslint `no-undef` can't see a page variable named like a browser global.** Splitting the payroll page
  into sections, the sections' props were found by `no-undef` — but the page's `history` state was never flagged
  (eslint knows `window.history`), so `PayrollLists` read `window.history` and crashed on click. Caught only by
  clicking through a local build. **Fixed:** an AST check (page-declared names a section reads but never receives)
  runs after every extraction, and the sections tests assert it for names like `history`, `location`, `name`,
  `status`. Lesson: click every tab/dialog of a split page on a local build before merging.
- 2026-10-01: a heredoc edit script turned an escaped quote (backslash, quote) into a bare quote again (notificationService.js), breaking a string. Caught by reading the output back. The rule stands: any edit with a backslash goes through Edit/Write, even inside a replacement string.
- **2026-10-01: removing a scratch worktree wiped the shared pnpm store.** The worktree had `node_modules` junctioned to efd-admin's; `git worktree remove --force` followed the junction and deleted real packages in `web/node_modules/.pnpm` (next, @aws-sdk/client-s3, everything that sorts before "next"), breaking local dev for every app in the workspace. Restored from the lockfile with `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts --force` in `web/` (~9 min). Rule: unlink a junction with `cmd /c rmdir <path>` first, never a recursive delete (`rm -rf`, `Remove-Item -Recurse`, `git worktree remove --force`) of a folder that still holds one.
- **2026-10-02: `gh pr merge` on efd-shop does not wait for CI, because efd-shop has no required check.**
  efd-toolpad's `main` is protected with a required `check`, so `gh pr merge` there blocks until it is green —
  which is where the habit "merge when the PR is green" comes from. efd-shop has no such protection, so the same
  command merged shop#92 while its `test (20.x)` and `test (22.x)` jobs were still *pending*. It passed on `main`
  afterwards and nothing broke, but that was luck, not process: the local `npm test` run was the only thing
  standing behind it. **Rule for now:** on efd-shop, confirm `gh pr checks <n>` is green *before* calling
  `gh pr merge`, never after. **Proposed:** give efd-shop the same branch protection as efd-toolpad — a required
  `test` check and no direct pushes — so the two repos behave the same way and the habit is safe in both. That is
  a repository settings change, so it needs the owner.
- **2026-10-02: `scripts/views.mjs --keep` will crawl a *stale* server.** `--keep` leaves the production server
  running on 4300 so you can click through afterwards. Start the next crawl without killing it and the script
  reuses whatever is already listening — which is the *previous* build. I nearly verified a TabRail conversion
  against a build that predated it; the giveaway was a tab measuring 40px when the new rail is 44px.
  **Workaround:** before every crawl, `netstat -ano | grep ":4300.*LISTENING"` and `taskkill //PID <pid> //F`.
  **Proposed:** have `views.mjs` refuse to reuse a server it did not start, or stamp the build id it serves and
  compare. A verification tool that silently verifies the wrong thing is worse than one that fails.
- **2026-10-02: the dev database has almost no rows, so whole screens cannot be verified in a browser.**
  `efd-database-DEV` holds the six `views.check` users and essentially nothing else: no repairs, no custom
  orders, no drops, no designs, no materials. The views crawl still proves 115 pages render, but a card grid with
  no cards proves nothing about the card. Four conversions this session (completed repairs, the repair card grid,
  one custom order, one design) were shipped on a build plus an identical-shape argument rather than a render.
  **Proposed:** a seed script that writes one row of each kind into `efd-database-DEV`, run by the views tooling.
- **2026-10-02: the views crawl signs in, so it can never see a signed-out page.** `scripts/views.mjs --role admin`
  authenticates and then crawls 115 pages, which is exactly why it missed that `RootLayout` mounted the MUI theme
  only on its signed-in branch: `/auth/change-password` was an all-white card with a blue button, and
  `/emergency-logout` rendered 50%-white text on a pale blue Alert, and the crawl saw neither, because it never
  visits either page unauthenticated. Found by opening the page by hand while signed out. **Proposed:** a small
  anonymous pass — sign in, sign out, then crawl the `/auth/*` routes and `/emergency-logout` — so the pages a
  locked-out person sees are checked in the state they see them in.
