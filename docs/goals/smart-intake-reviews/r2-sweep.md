# Round 2 sweep — 2026-11-09

Three fresh reviewers, each given only its brief, against the code as merged in #346. This is the loop's record of
what each found — every finding, condensed. **D** = demonstrated by the reviewer, **S** = suspected. Plus Codex's
findings on #345 and #346.

## Server and model

- **D** "all N" with nothing after it multiplies the ticket: "14k wg ring retip all 4. size 6 to 7" → Retip ×4, Size up
  ×4, Rhodium ×4. "tighten all 6", "replace all 3" likewise.
- **D** "broken in 2 pieces" counts as two pieces of jewelry ("pieces" is a piece noun). "wears it with 2 bands",
  "matches her other 2 rings", "customer has 3 rings, only sizing this one" → 2, 2, 3.
- **D** Two pieces with different work both get everything: "2 rings. size engagement ring 5 to 6.5, polish the band"
  → Size up ×2, Clean and Polish ×2, stock 2.
- **D** A wide band said with a colour or karat in between is downgraded: "14k wide white gold band size 9 to 11" →
  the up-to-3mm task. "wide 14k band", "thick yellow gold band", "6 mil band" too. Under-charge.
- **D** A millimetre stone not on the list makes the shank wide: "tighten 5mm amethyst" → the 3–5mm task. Garnet,
  topaz, peridot, aquamarine, tanzanite, turquoise, "lab diamond". Over-charge.
- **D** The karat-in-a-size-field guard misses 14k: 6→14 passes (limit 8) with 7 sizing stock; 10→14, 10→18 too.
- **D** A task named twice keeps the larger quantity, not the sum: two Laser Weld lines at 1 → ×1.
- **D** A rename breaks the width rule silently ("under 3mm", "over 3mm").
- **D** Smaller: karat "585" passes through; metalType "white gold" → blank metal, no rhodium; quantity "four" → 1;
  "yellow gold with white gold head" → white.
- **S** Model retirement (name hard-coded in three routes). The photo description steers the metal: whatever metal
  comes back counts as "said" and overwrites the form. "Solder Together per Ring" invites quantity 2 for one join. The
  aiMeta is written for a customer chatbot. Model `pieceCount` trusted up to 20. `todayIso` is UTC.
- Right: the model suggests and code decides; stock, sizing quantity and rhodium never come from model arithmetic;
  unknown ids dropped; a missing role warns; temperature 0; one prompt and one entry point; raw answers logged.
- Change: multiply only when the model's count and the sentence agree; drop "pieces/items", require a noun after "all
  N"; width: `<n>mm <word>` is the shank only when the word is band/shank/ring/wide, and allow filler words after
  wide/thick; reject a size equal to the stated karat and lower the limit to ~5; warn when a banded task has no
  sibling; sum duplicate lines; one model constant; drop or label the photo description in the prompt. Not worth it:
  a role field or migration, rate limiting, the >80 prefilter, rewriting all aiMeta, UK sizes, the timezone.

## From the model's answer to the saved ticket

- **D** The rulings run once, at the read. Pick white on Review after a read that assumed yellow: no rhodium, no
  warning. Read white then change to yellow: the rhodium stays. Platinum picked afterwards keeps the gold-solder task.
- **D** A re-read discards hand corrections to AI lines: set retip to 6, delete rhodium, dictate "and polish" (the
  mic re-analyses on stop) → Retip ×1, Rhodium back. "By hand" meant "has no `__aiQuantity`".
- **D** The AI fails on a corrected sentence and the old ticket stays: metal becomes silver, but Size up, stock ×2 and
  5→8 remain, with green chips. The Work-step alert shows only when there are no tasks.
- **D** Two reads in flight; the older answer lands last (Enter is not guarded).
- **D** The fallback regexes write karats and counts as sizes: "resize 14k wg ring" → desired 14; "retip 2 to 3
  prongs on earring" → 2→3; "restring pearls" → isRing (substring "ring").
- **D** (rules) / **S** (the misread) The size guard passes 7→14; "size 6 and 7 rings" counts 7 pieces; "customer has
  3 rings, size the wedding band down" → Size Down ×3. The multiplication warning shows on the Piece step only.
- **D** Guesses look confirmed: every model-picked task gets "✓ from your sentence"; the chips are built from form
  state; "(assumed)" stays after the jeweler picks the colour. With the photo description in the prompt, a model
  answer of white gold over silver on the form overwrote it, with a tick.
- **S** The classic form (`?ui=classic`) shows none of the warnings, chips or checks.
- **D** (made-up list) Sizing stock falls back to the first stock when none matches the metal.
- Right: the server re-prices everything; stock is one shared formula; `sizingStockCheck`; "added by rule" chips; the
  AI-down path adds nothing; platinum alignment matches by job and a wrong-metal task blocks the save.
- Change: a "ticket check" beside the stock check (white gold without rhodium and the reverse; a generic task where
  a metal counterpart exists), with one-tap fixes; mark AI lines as hand-edited and remember removed ones; make the
  fallback replace too; ignore stale responses and guard Enter; show warnings on the Work step and in the classic
  form; tighten the fallback regexes; relabel the chips; warn when a size equals a karat in the note. Not worth it:
  re-running the rulings on save, per-piece size fields, a role schema.

## Evidence, measurement and upkeep

- **D** No held-out data: rules, marks and the aiMeta proposal were all written against the same 69 tickets on the
  same day. Marks rewrite the expected tasks on 21 of 69.
- **D** `asSaved` (45/69) is not ratcheted. Only the task metric discriminates (sizes and metal are 69/69).
- **D** Rhodium contradicts practice (6 of 12) and nothing counts how often a rule-added line is deleted at the counter.
- **D** Stock is scored only where marked (`saved.materials` is never read).
- **D** The ratchet uses absolute counts; a refresh ends in a blanket `--update` that skips every assertion.
- **D** A model change is invisible (name duplicated; the hash covers prompt and tasks only). Live catalog drift is
  invisible (the hash is over `catalog.json`, not production).
- **D** The "logged" run re-rules already-ruled output (0 of 79 have `raw`).
- **D** The production counter disagrees with the rulings on 13 of 69 tickets, double-counts retries, has no rate or
  trend, writes outcomes once at create, and never logs a failed call.
- **D** Coverage: 21 of 32 tasks ever expected, 10 once; 3 store tickets.
- **D** `apply-aimeta.mjs` names its backup by date: a second `--apply` the same day overwrites the original. No
  restore, no check that live aiMeta matches the catalog the proposal was measured against.
- **S** The proposal's replay score will flatter it: 20 of its 49 symptoms are verbatim from the fixtures. Its Laser
  Weld text may steal Break in chain / Break in Shank tickets. Acceptance leaks into the "truth". Upkeep will lapse.
- Right: the per-ticket ratchet and the passing list in git; a missing answer throws; the prompt hash; every mark has
  a reason; catalog renames fail loudly; the proposal is aimed at a real defect; apply is a dry run by default.
- Change: fix the backup and add `--restore`; assert the model; ratchet `asSaved`; freeze today's 69 as the tuning
  set and score later tickets separately, unratcheted; log which rule added each line and count removals per rule;
  fix the production counter; record the catalog hash in each log entry; score stock from `saved.materials` when
  unmarked. Not worth it: more photo metrics, dollar-weighted scoring, variance runs, a UI for marks.

## Codex

- **D** (#345) "two 14kt white gold rings", "two ss rings" read as one piece. Fixed on the round 3 branch.
- **D** (#346) A re-read that changed the metal kept the old purity; the stock fix over-charged with two stock lines.
  Both fixed before #346 merged.
