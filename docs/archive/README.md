# Archive — retired rulebooks

> **Kind:** descriptive (history) · **As of:** 2026-10-01

Moved here from the repo root on 2026-10-01 (docs/GUARDRAILS_PLAN.md, Phase 3, item 10). They were five rulebooks
that disagreed with each other and with the code, and nothing enforced them. **Do not follow them.** The rules
worth keeping are now lint rules or CI checks (`eslint.config.mjs`, `.github/workflows/ci.yml`), and `CLAUDE.md`
routes to the docs that are current.

| File | Last edited | Why it's retired | Where its useful rule lives now |
|---|---|---|---|
| `CONSTITUTION.md` | 2025-09-28 | Prescriptive architecture rules; no enforcement, contradicted by later code | Layer rules (no `mongodb` outside the DB layer, no DB/service imports in client code, no UI imports in API routes) → `eslint.config.mjs` |
| `CONSTITUTIONAL_FILE_ORGANIZATION.md` | 2025-09-28 | "Strict" directory and naming rules the codebase never followed | File size → `max-lines` (400) lint rule, ratcheted |
| `COPILOT_INSTRUCTIONS.md` | 2025-09-28 | A *proposed* Copilot instructions update; restates the two above | — |
| `DEVELOPMENT_STANDARDS.md` | 2025-08-07 | "Mandatory" MVC(C) layer structure; contradicts the two above in places | Layer rules → `eslint.config.mjs` |
| `MANUAL_RELEASE_GUIDE.md` | 2025-10-19 | Says to push releases straight to `main`, which branch protection now refuses | PR + green `check` → `.github/workflows/ci.yml`; ship checks → `ship.yml` |
| `copilot-instructions.md` | 2025 | A sixth rulebook that GitHub Copilot loaded automatically; described AWS S3 and Shopify. Retired 2026-10-01 (owner, Q3) | `.github/copilot-instructions.md` is now a short pointer to `CLAUDE.md` |

