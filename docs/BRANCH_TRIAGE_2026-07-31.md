# Branch triage — what's on main, what isn't, what to do

**As of 2026-07-31.** Main is at `66d12b9`. Ten branches have commits not on main.

Classified with `git cherry`, which compares commits by **patch content** — so it can tell "this was
already merged under a different commit hash" from "this is genuinely absent." That distinction is what
makes most of this list easy.

---

## Summary

| Branch | New | Files | Age | Verdict |
|---|---|---|---|---|
| **feat/production-pipeline-m1** | **34** | **73** | 23d | 🔴 **DEAD (owner, 2026-07-31)** — ~90% superseded. Keep for salvage; see `PIPELINE_BRANCH_DIFF.md`. |
| claude/clever-hawking-7d38c0 | 2 | 7 | 24d | 🟢 **Merge** — real bug fixes, small |
| ops/epic-production-pipeline-foundation | 4 | 17 | 14d | 🔴 **Do not merge** — superseded casting |
| 001-admin-repair-costing | 5 | 258 | **224d** | 🔴 Delete/archive — superseded |
| hotfix/vercel-nav-utils-fixes | 3 | 6 | 113d | 🔴 Delete — build fixes, builds pass now |
| hotfix/vercel-session-prerender-fix | 4 | 22 | 113d | 🔴 Delete — superset of the above |
| archive/main-2026-04-08 | 16 | — | 113d | ⚪ **Keep as archive, never merge** |
| feature/integrate-repair-costing | 0 | — | 112d | ⚪ Delete — 100% on main already |
| fix/preview-reset-contract | 0 | — | 14d | ⚪ Delete — 100% on main already |
| fix/preview-reset-identity | 0 | — | 14d | ⚪ Delete — 100% on main already |

**Three branches are pure noise** (bottom rows) — every commit is already on main as an equivalent
patch. Deleting them loses nothing and removes three sources of confusion.

---

## 🔴 feat/production-pipeline-m1 — DEAD (owner, 2026-07-31)

34 commits, all from one day (2026-07-07), never PR'd, nothing branched off it. **~90% superseded by main**, which solved the same problems 10–13 days later and far more thoroughly (main's design detail page is 1,921 lines; the branch's is 197).

**Kept, not deleted** — it's now pushed to origin (it was local-only, 34 commits with no backup) so the four salvageable items stay reachable: piece detail/edit/new pages, per-entity images for collections+pieces, a possible multi-metal pricing fix, and rate limiting.

Exact cherry-pick commits and the caveats: **`docs/PIPELINE_BRANCH_DIFF.md`**.

## 🟢 claude/clever-hawking-7d38c0 — merge this

2 commits, 7 files. Small and valuable:

- **stops a create→print 504 crash** on repairs
- corrects **My Work week bucketing**, and makes My Work show all work-order sources, not just repairs

Touches `repairs/model.js`, `repairs/route.js`, `NewRepairForm.js`, `my-work/page.js`, plus a
`repairLaborLogs` model change and two analytics services.

**Relevant to the appointments work in flight** — it's the same repair-intake surface. Worth merging
before that agent gets deep in, so they don't fix the same 504 independently.

## 🔴 ops/epic-production-pipeline-foundation — do not merge

4 new commits, but they are **an earlier, parallel implementation of the casting board** —
`src/services/casting/castingService.js`, `src/app/api/production/casting/route.js`, and
`src/app/dashboard/production/casting/page.js`.

Main already has all of that, built differently: `src/services/production/castingBoard.js` and its own
`dashboard/production/casting/page.js`. Merging this would collide with the casting work that shipped
in PR #27/#28 and could regress the money guards.

**Two things in it might be worth salvaging separately**, since they don't obviously exist on main:
`gemstoneLifecycle.js` and `pieces/[pieceID]/casting/route.js`. Worth a look before deleting — cherry-pick
if useful, but don't merge the branch.

## 🔴 001-admin-repair-costing — do not merge

5 commits, **258 files**, **224 days old** (Dec 2025). A multi-variant materials and cascading-pricing
system. Repair costing has shipped since, several times over. Merging a 258-file diff from seven months
ago would be destructive, not additive.

If there's an idea in it you still want, treat it as a spec to re-implement, not a branch to merge.

## 🔴 hotfix/vercel-* — delete both

Both from 2026-04-08. They fix Vercel build breakage: import paths, task create/edit form wrappers,
compile errors in repair-task and materials hooks. `session-prerender-fix` is a superset of
`nav-utils-fixes` (3 of its 4 commits are the same).

**The app builds clean on main today**, so whatever these fixed is either fixed differently or gone.
Verify with one build on main and delete.

## ⚪ archive/main-2026-04-08 — keep, never merge

Named "archive" and behaves like one: a snapshot of main from before the April work. This is a safety
copy. Leave it alone; merging it would resurrect 16 old commits.

## ⚪ Three fully-absorbed branches — delete

`feature/integrate-repair-costing`, `fix/preview-reset-contract`, `fix/preview-reset-identity`. Every
commit on each is already on main as an equivalent patch. They show up as "unmerged" only because the
merge rewrote the hashes.

```bash
git branch -D feature/integrate-repair-costing fix/preview-reset-contract fix/preview-reset-identity
git push origin --delete feature/integrate-repair-costing fix/preview-reset-contract fix/preview-reset-identity
```

---

## Suggested order

1. **Delete the three absorbed branches** — zero risk, removes a third of the confusion
2. **Merge `claude/clever-hawking-7d38c0`** — small, fixes a live crash, overlaps the appointments work
3. **Verify then delete the two `hotfix/vercel-*` branches** and `001-admin-repair-costing`
4. **Salvage-check `ops/epic-*`** for `gemstoneLifecycle`, then delete
5. **`feat/production-pipeline-m1` is dead** — no action. Salvage list is in `PIPELINE_BRANCH_DIFF.md` if a need arises.
