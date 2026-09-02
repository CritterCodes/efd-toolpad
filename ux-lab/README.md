# ux-lab — overnight UI/UX variant loop

An "autoresearch for UX" harness. Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch):
an agent loops `edit → verify → produce a reviewable artifact`, steered by a Markdown
brief, while you sleep. The twist for UX: **there is no automatic metric** — *you* are the
metric. The machine's job is to hand you a handful of finished, verified, clickable
candidates each morning so the only thing left is scoring them.

## How it maps to autoresearch

| autoresearch            | here                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `train.py` (edited)     | the target flow's React components                          |
| `prepare.py` (fixed)    | tests, build pipeline, API contracts (agents must NOT break)|
| `program.md`            | `<flow>/program.md` — the design brief + loop rules         |
| `val_bpb` (the metric)  | **your 1–5 scores** in `<flow>/SCORING.md` (async)          |
| "run 5-min training"    | `npm test` + `npm run lint` + `npm run build` (the gate)    |
| keep / discard          | branch survives only if the gate passes                     |

## The loop (one night)

1. Spin up K agents, each in its **own git worktree** (no collisions).
2. Each agent redesigns the target flow per a **different thesis** (see `variants.md`).
3. Each agent MUST pass the gate: `npm test && npm run lint && npm run build`.
   A variant that breaks the gate deletes its own branch — you never see broken work.
4. Each surviving variant pushes its branch → **Vercel preview deploy** (staging DB).
5. You get a list: variant name, thesis, what changed, preview URL, diff.
6. ☀️ Morning: open each preview, score it in `SCORING.md`.
7. (Next night) the highest-scored variant becomes the new baseline → iterate deeper.

## Safety (non-negotiable)

- Every variant lives on its own branch/worktree. Nothing touches `main` or the current
  working branch until **you** merge a winner by hand.
- Preview deploys point at the **staging** database only — never production.
- The gate (tests stay green) is what stops a broken or regressed variant from shipping.
- The agent **proposes**; you **approve**. No auto-merge, ever.

## Layout

```
ux-lab/
  README.md            ← this file
  my-bench/
    program.md         ← design brief + loop rules for the My-Bench flow
    variants.md        ← the distinct design theses for this run
    SCORING.md         ← morning scoring sheet (your val_bpb)
```
