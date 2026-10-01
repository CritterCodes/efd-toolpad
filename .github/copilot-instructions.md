# Instructions for AI assistants in this repo

Read `CLAUDE.md` at the repo root first. It's a short router: what to read for what, plus the session rules.

- The rules that matter are enforced, not written here: `eslint.config.mjs` (layer boundaries, no `mongodb` outside
  the database layer, no console logging, a11y), the test suite, and CI (`.github/workflows/ci.yml`: lint, tests,
  build, and `npm run views`, which opens every page as every role).
- Never push to `main`. Open a PR; the `check` workflow must be green to merge.
- Owner decisions that aren't made yet live in `docs/OPEN-QUESTIONS.md`. Don't decide them; add a recommendation.

The previous 641-line version (2025, describing AWS S3 and Shopify) is in `docs/archive/copilot-instructions.md`
for history only (retired 2026-10-01, owner: docs/OPEN-QUESTIONS.md Q3).
