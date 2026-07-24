# OVERNIGHT GOAL — Production Runs + Gemstone Phase 3 build-out

**You are executing overnight, autonomously, on a fully-decided architecture. Every design
decision is already made and pinned in the docs below. Your job is implementation, not
re-litigation.**

## Required reading — in this order, before any code

1. `docs/manufacturing/PRODUCTION_PIPELINE_VISION.md` — the build/freeze rules (do-not-forget)
2. `docs/manufacturing/PRODUCTION_RUNS.md` — THE spec for this work; every §DECIDED is law
3. `docs/manufacturing/GEMSTONE_DESIGNS_AND_INVENTORY.md` — gem capability model + Phase 3 scope
4. `docs/policies/ARTISAN_TERMS_AND_POLICIES.md` — the policy surface you'll build in S9
5. `docs/manufacturing/sprints.md` — where this lands in the phase map

## THE VERIFICATION RULE — read twice

**You NEVER check your own work. Ever.** Self-verification degrades into box-checking. Instead:

- After each slice, spawn a **verifier subagent** (Agent tool, fresh context). Give it ONLY:
  the acceptance criteria for the slice (write them BEFORE implementing), the relevant doc
  sections, and the branch name. Its instructions: *adversarially try to prove the slice does
  NOT meet the criteria* — run `pnpm vitest run`, run the production build, exercise the real
  APIs/UI (dev server + preview tools), probe edge cases and permission boundaries.
- The verifier reports PASS or a findings list. On findings: fix, then spawn a **NEW** verifier
  (never re-use the old one — it's anchored). Repeat until PASS.
- A slice is not complete, and the next slice does not start, until a verifier has passed it.
- Before ending the night, spawn one final **audit agent** over the whole diff: axiom
  violations (anything fronted? any deliverable ungated? title-before-payment anywhere?),
  regressions in existing flows (customs, repairs, drops), and doc/code drift.

## Work queue — in order; quality over coverage

Do these sequentially. If the night ends mid-list, that's fine — a verified S1–S4 beats an
unverified S1–S8. Never skip ahead past an unverified slice.

- **S1 — Transactional core (the keystone).** One service: mint a run — create the run record
  (§2 model), mint `Σ qty` pieces via the `beginManualPieceProduction` path all-or-nothing
  against edition caps, AND claim linked-gem editions in the SAME transaction (§3, §5). Include
  `cancelRun`/scrap paths: **pre-sale scrap releases the edition slot, retires the number,
  replacement gets a fresh number** (§4.1). Pure logic unit-tested; Mongo transaction
  integration honest about session semantics. This service serves BOTH runs and gemstone
  Phase 3 — build it once, shared.
- **S2 — Ledger fields (Connect-compat, mechanical).** `payer` scope on laborLogs (rule:
  laborer == piece's owning artisan → `self`, else `efd`; §4.4) and `payeeUserID` on every
  paying ledger row (laborLogs, salePayouts, artisan invoices; §4b). Backfill-safe defaults.
- **S3 — Request-CAD on-ramp.** A `cad` WO spawnable from a DESIGN (sketch attached), driving
  the existing `cad_requested → cad_in_progress → cad_qc` statuses (§2 stage 1). Quote shown
  and **accepted at WO creation** (§4c) — CAD flat fee from the designer's profile. WO spawns
  pre-assigned to creator when solo (§0).
- **S4 — Casting board.** The Production→Casting placeholder becomes real: ONE board,
  ownership-scoped API (artisans see their runs' castings; staff see all). Batch lifecycle
  `needs_ordering → ordered (vendor, est) → received`; in-house alternative = `casting`
  discipline WO. Invoice-at-receipt hook: on `received`, generate the artisan invoice at actual
  vendor cost × 1.20, casting **gated from shipping until paid** (§4.1). 48h dispute window +
  auto-accept on delivered castings.
- **S5 — Artisan billing rail.** Generalize the customs Stripe-invoice service to WO-completion
  invoices: labor + materials lines, **COGS × 1.20** (self-fulfilled WOs bill NOTHING),
  shipping/insurance passthrough at cost, consumed gems at consignment price never × 1.2
  (§4c). Deliverable gating on payment (CAD unlock / casting ship / piece handoff). **Freeze:**
  any overdue invoice blocks new runs/WOs/listings for that artisan (§4c). Liquidation itself
  is manual/staff — build only the freeze + overdue surfacing, not auto-liquidation.
- **S6 — Shipments.** `shipments` record per handoff `{ from, to, carrier, tracking, pieceIDs,
  status }`, declared-value insurance line billed through, **nothing-ships-unpaid** gate wired
  to S5 (§4.2).
- **S7 — Artisan run UI.** My Runs: create wizard (own design → variants/qty → quotes preview →
  solo default), run detail with stage progression, casting + WO status. Collab designs:
  **dual-signature required + declared payout split on the run record** (§4e). Design-editor UX
  conventions apply (inline tabbed editing, sticky unsaved bar, NO click-to-edit dialogs).
- **S8 — Gemstone Phase 3 claim-time.** Extend the MTO claim path with linked-gem edition
  claims (shares S1's service), enforce `maxPieces`/lot depletion, authoritative reprice at
  claim, spawn `gem_cutting` WOs carrying resolvedConfiguration target specs
  ({sizeMode, species, color, carat, targetMm?, tolerance?}). Cutter payout via consignment
  **net of EFD-fronted rough** (§4d).
- **S9 — Policy pages + versioned acceptance.** Render `ARTISAN_TERMS_AND_POLICIES.md` sections
  as in-app policy pages; `users.agreements[] { docId, version, acceptedAt }`; artisan features
  gate on current-version acceptance; re-prompt on version bump.
- **S10 (stretch) — My Drops collaborator management UI.**

## Hard constraints (violating any of these = the night failed)

- **Axioms are inviolable:** nothing is fronted; title passes at payment; deliverables gate on
  payment; WOs private by self-assignment; solo-first (every flow must work with zero
  outsourcing); Pieces ALWAYS have a variantId (synthetic for one-offs — NEVER optional).
- **Do not merge to main.** Main auto-deploys to PROD. Work on a feature branch
  (`feat/production-runs-m1` off latest main), clean commits per slice, open PR(s) at the end
  with a morning-review summary. The owner merges.
- **Do not touch PROD data.** Dev DB = `efd-database-DEV` (contains REAL artisan accounts —
  create test entities prefixed `TEST-`, clean up after verification).
- **pnpm workspace:** NEVER `npm install` in web/ members. `pnpm add --ignore-scripts` with
  NODE_AUTH_TOKEN from .env.local (never print it). For lockfile-only: `npm install
  --package-lock-only` pattern only where already established.
- **No re-litigation:** if you hit a genuine spec gap, take the most conservative choice
  consistent with the axioms, mark it `PROPOSED (overnight)` in PRODUCTION_RUNS.md, and keep
  moving. Never block on a question; never silently invent policy.
- **No regressions:** customs, repairs, drops, and design flows must keep working — the final
  audit agent checks this explicitly. Match-or-beat legacy form+function.
- **Out of scope tonight:** efd-shop changes (Phase 4), actual Stripe Connect integration
  (compat fields only), auto-liquidation, the attorney's agreement review, deposit/true-up
  billing for gem customs (flag as follow-up if you touch its edges).

## Known gotchas (learned the hard way — don't re-learn)

- `/api/users` returns `{success, data}`, not an array — use `fetchArtisans()`.
- `artisanTypes` on session are raw Title Case, array OR string — always normalize kebab-case
  via `normalizeArtisanType`.
- Permission modules stay pure for vitest: lazy-import next-auth inside gated functions.
- Pre-existing vitest failure: productContract meshMap (refrakt /server VALID_FINISHES in test
  env) — NOT yours, don't chase it; everything else must be green.
- Middleware is auth-only; API routes are the real permission guard.
- Dev Mongo (23.94.251.158) can transiently EHOSTUNREACH — retry with backoff, don't rearchitect.
- laborLogs (not repairLaborLogs) is the canonical labor collection.

## Cadence & reporting

- Track slices with the task tools (TaskCreate/TaskUpdate) as you go.
- Keep `docs/manufacturing/NIGHTLOG.md` on the branch: per slice — what shipped, verifier
  verdict + findings fixed, anything PROPOSED, anything deferred.
- End of night: PR(s) open, NIGHTLOG complete, final audit verdict at the top, and a concise
  morning summary as your last message: what's verified-done, what's in flight, what needs the
  owner (merge decisions, the liquidation X-days value, casting-metal→COGS choice).
