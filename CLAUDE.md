# Claude project context — a router

> **Kind:** router (points at docs; restates nothing) · **As of:** 2026-10-01 · Kuzu's pattern
> (docs/GUARDRAILS_PLAN.md, Phase 3). Rules that matter are enforced by lint, tests or CI, not by prose here.

## What to read, by task

| Working on | Read first |
|---|---|
| Anything — how a change ships | `docs/GUARDRAILS_PLAN.md` (CI, ratchets, views check, ship checks) |
| Products, listings, the shop catalog | `docs/manufacturing/PRODUCTS_ARE_PROJECTIONS.md` — nobody authors a Product, ever |
| Drops | `docs/manufacturing/DROPS_STATE_AND_FACELIFT.md` (2026-09-01 audit + owner sequencing) |
| Catalog, Collections, Designs, Pieces, casting, custom orders | `docs/manufacturing/CLAUDE_HANDOFF_2026-07-17.md`, `README.md`, `data-model.md`, `PRODUCTION_PIPELINE_VISION.md` (all in `docs/manufacturing/`) |
| Pricing | `src/services/pricing/engine.js` and `catalog.js` headers — one engine, no stored prices, no fallbacks |
| Artisan terms, apprenticeship | `docs/policies/` |
| A decision that isn't yours | `docs/OPEN-QUESTIONS.md` — add it there with a recommendation; don't decide it |
| Something slowed you down | `docs/FRICTION-LOG.md` — add a line |
| Old rulebooks (CONSTITUTION, DEVELOPMENT_STANDARDS, …) | `docs/archive/` — history only; where they disagree with lint or this file, they are wrong |

Owner decisions in the July 17 handoff that still override older manufacturing docs: Drops and Collections are
separate; "concept" is not its own object; Products nav = Catalog, Drops, Collections, Gemstones; Production nav
exposes Casting; BARF is parked, use a direct engineering loop.

## Session rules

1. **Never push to `main`.** Branch `claude/<topic>`, open a PR, wait for the required `check` (lint, tests, build,
   `npm run views`) to go green, then merge. Branch protection applies to admins too.
2. **Ratchets only go down.** Never suppress a new lint violation; after fixing one, `npm run lint:prune`. After fixing
   a views problem, `npm run views -- --update`. CI (Linux) is the reference baseline.
3. **After a merge, the Vercel deploy must reach READY.** `.github/workflows/ship.yml` then checks it anonymously.
4. **Provenance.** Record an owner ruling with its date and the owner's own words; write absolute dates, never "yesterday".
5. **Trace both apps.** A feature usually spans efd-admin and efd-shop: follow UI → route → collection in each before
   concluding anything.
6. **Know which database.** `efd-database` is production, `efd-database-DEV` is dev; `MONGO_DB_NAME` fails closed.
   No production writes without the owner's yes.
7. **Add dependencies only through `.github/workflows/deps.yml`.** Local installs can't update the npm lockfile
   (this is a pnpm workspace member).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- `graphify-out/` is gitignored and there is no commit hook (it would not run in worktrees, where sessions work). In a fresh worktree with no `graphify-out/graph.json`, run `graphify update .` once (~90 s, local, nothing leaves the machine). Installed 2026-09-30, scoped to this repo only (owner).
