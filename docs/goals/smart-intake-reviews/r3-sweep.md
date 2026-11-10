# Round 3 sweep — 2026-11-09

Three fresh reviewers, each given only its brief, against the code as merged in #347. This is the loop's record of
what each found — every finding, condensed. **D** = demonstrated by the reviewer, **S** = suspected. Plus Codex's
finding on #347.

## Server and model

Could not find a silent ×N multiplication or a silent wrong metal. Found one fully silent wrong ticket (the karat
shorthand) and several that are wrong while the warning says something untrue.

- **D** A stone's millimetres after "ring" or "band" is a wide shank (`bandJustNamed`): "14k yg solitaire ring, 6.5mm
  moissanite, band is thin, size 6 to 7" → the 3–5mm task, warning "a wide shank was stated". Also "ring 5mm cz
  missing", "engagement ring 7mm round", "mothers ring - 4mm birthstone loose", "ring, 4mm stone loose", and "heavy
  ring wear on prongs" (the word "heavy"). Over-charge, under a warning that states what he never said.
- **D** Real widths are missed and a correct model pick is downgraded: "comfort fit 6mm, size 9 to 10.5", "shank 4x2,
  half shank", "five millimeter band" → the narrow task, "no wide shank was stated". Under-charge.
- **D** Karat shorthand read as a size: `karatsSaid` needs a word boundary after "k", so "14ky"/"10kw" pass the
  karat-as-size guard. "size 14ky ring to a 9", model 14 → 9 → Size Down ×1, no stock, no warning (a move of exactly 5
  passes). The only fully silent one.
- **D** Per-piece counts, both ways (`Math.max(quantity, pieces)`): "2 14k yg rings, retip 4 prongs on each, clean and
  polish" → Retip ×4 (should be 8) under "each task and material is counted 2 times". "2 14k yg rings clean and
  polish, laser weld on 1" → Laser Weld ×2. `describesDifferentWorkPerPiece` misses "on 1", "on each", "second ring".
- **D** Renaming a wide/narrow task in Admin switches off the width rule with no warning; `taskRoles.problems` covers
  four roles but not the siblings, and `catalog.test.js` only checks the fixture.
- **S** Model retirement: `gemini-2.5-flash` also hard-coded in `describe-item-image/route.js:9`. No `responseSchema`:
  `quantity: "4 prongs"` or a `qty` key becomes 1 silently, a `taskId` key drops the line. A size the parser rejects
  ("6-1/2", "6.5 US") is blanked silently. Two sizing tasks keep the first (customer gold dropped, stock charged).
  Solder Together trusts either count alone and never warns or marks the line "ruled". `generate-ai-meta` asks for
  customer speech for a chatbot; live text contradicts the rulings. Thinking left on, no `maxDuration`, ~94s worst case.
- Right: the model suggests and code decides; stock computed; unknown ids dropped; multiplication needs agreement;
  missing roles warn; karat-as-size, >5 sizes, non-ring sizes, "all 3 to a 6" each blank and say so; temperature 0;
  one prompt; raw answers logged; note beats photo; AI-down adds no tasks.
- Change: width fires only when the band is the next word after the measurement or "wide/width" follows; drop the
  bare "ring/band … Nmm" and "heavy" triggers; add "N mm wide", "NxM shank", number words; when unclear, ask, don't
  swap. Karat guard `\d{2}k[ywr]?`. Warn on anything blanked or defaulted. "each"/"on 1"/"second ring" = different
  work; the warning lists the lines it raised. `responseSchema`, `thinkingBudget: 0`. Width siblings in `problems`.
  Apply the aiMeta proposal with the owner's yes; rewrite the `generate-ai-meta` prompt. Import `INTAKE_MODEL` in the
  photo route. Not worth doing: a role field for 32 tasks, the >80-task prefilter, rate limiting, more piece-count
  regex.

## From the model's answer to the saved ticket

Drove the real hook with the real `decideIntake`. "Yes, a wrong price can reach the save unnoticed."

- **D (logic) / read (UI)** The checks are on the wrong screen. The chips say "tap to fix on review" and jump to step
  3, where metal and sizes are edited and the save buttons are; `ticketChecks` and `sizingStockCheck` render only on
  step 2. Nothing blocks the save. "size up 14k ring 6 to 8" → pick white on Review → rhodium-missing fires unseen.
  Desired 8 → 10: want 3, have 1, unseen. "size up 3 sizes" → stock ×2, then 6→7 typed on Review: want 0, have 2,
  unseen. The daily path.
- **D** A second read turns the guess into a tick: read 1 `assumed.goldColor = "yellow"`, read 2 of the same sentence
  `""` → "✓ yellow gold" (`formHadColor` is true because read 1 filled it). The mic re-reads on every stop.
- **read** The classic form shows none of it (= T19).
- **D** The checks look one way only: sizes edited to 6→5 with Size Up on the ticket → no task check, and the stock
  check reads "Sizing up -1 sizes needs no sizing stock". Platinum Size Up on a ticket changed to 14k white gold →
  only rhodium-missing; three generic size-up tasks tie and the line is skipped.
- **D** A hand-added line blocks the sentence's count: Retip ×1 by hand, then "retip 4 prongs" → stays ×1, no warning.
- **D** Stock with no task: delete the Size Up line, re-read → `3x2 Sizing Stock ×2` and no tasks; the check is null.
- **D** A hand-changed quantity keeps the "from your sentence" tick until the next read.
- **S** Model numbers are not held against the sentence ("retip 4 prongs" answered 40 lands ticked; "18k" answered
  14k lands with `said.karat`). Stock matching ignores colour if materials are named by colour (white-gold aliases
  include plain "gold"). "size 2 white gold rings 6 to 8" is never multiplied (warned). A crafted store POST can set
  its own price for a line whose `_id` is not in the catalog (outside smart intake).
- Held up: AI failure, two reads in flight, reading twice, customer gold gets no stock, phone, photo path.
- Right: stock quantity computed, one function shared by form and server; agreement for the piece count; "added by
  rule" labels; re-read keeps hand quantities and deletions; AI-down adds nothing; the server prices every line and
  refuses an unpriced one.
- Change: render checks and stock check on Review above the save, and in the classic form (or delete it). Keep
  `assumed` until a human picks a colour. Two more checks: sizing direction against the sizes; a metal-restricted
  line on the wrong metal even when no sibling resolves. Warn when a kept hand line and the sentence disagree; drop
  stock that arrives with no size-up line. Hold the model's karat and quantity against the sentence, warning only.
  Not worth doing: more piece-count regex, re-running the rulings on save, per-colour stock scoring unless materials
  are named by colour.

## Evidence, measurement and upkeep

No wrong price demonstrated. What the data proves:

- The 66/69 is a fit: 26 of 69 scored answers (38%) are hand marks written the day the rules were; model run passes
  26/26 marked, 40/43 unmarked; only 10 of 32 marks cite the owner's words. As-saved is 45/69 (65%). Fresh tickets: 0.
  All 79 intakes are 2026-10-02 … 11-09, 20 from one day.
- Fresh "vs the rulings" will not be comparable: unmarked tickets score against the saved ticket, so it will read
  near 65% unless ~4 in 10 new tickets are marked. Not ratcheted; printed only inside a passing test.
- The "logged" run: 0 of 79 fixtures carry `ai.raw`, so it feeds post-rules output through today's rules. Its 60/69
  measures nothing clean.
- The ratchet tests a frozen copy (one Gemini run, one catalog export); the model check is a prefix match.
- `taskRoles.problems` is read only by `catalog.test.js`; the three production callers ignore it.
- `--update` skips every check; a new mark can turn any ticket green.
- The production miss counter: 40 of 79 "changed" per attempt but 32 of 71 per ticket (8 superseded retries each a
  miss); 29 of 32 are task changes that include his breaks and bench additions; newest 200 rows, text and photo
  mixed, no date window; an accepted wrong suggestion counts as a success.
- Coverage: 21 of 32 tasks appear, 10 once; 3 of 71 tickets from stores; photos checked only for colour
  contradiction; promise date, is-ring and price unscored; abandoned suggestions not exported.
- The aiMeta proposal cannot be evaluated on this set: 20 of its 49 symptom strings are verbatim substrings of
  fixture intakes; all 3 current failures have a near-quote in it; headroom is 3 tickets.
- `apply-aimeta.mjs`: restore matches by title and ignores the saved `_id`; the drift check covers only the 11
  proposal tasks; a `MONGODB_URI` in the shell wins over `--env`; `--owner-said-yes` proves nothing.
- **S** Sizes/metal 69/69 inflated by anchoring; temperature 0 is not deterministic; a fixture refresh turns the
  test red until someone with a key reruns the model, so refreshing stops first; rulings live in both code and aiMeta
  prose; `at` is UTC so the evening of 11-09 counts as fresh.
- Right: both scores printed and ratcheted, by ticket id; rules run over the model's answer; the hash forces a
  re-ask; an API error aborts; every mark has a why; `raw` is logged now; logging never fails an intake; the apply
  script has a dry run, backup and drift refusal.
- Change: (1) the production counter per ticket, last attempt, date window, 30-day rate; (2) surface `problems` in
  production; (3) do not apply the proposal on this evidence — measure on fresh tickets after 2–3 weeks; restore by
  `_id`; (4) print fresh as-saved beside the tuning as-saved; (5) drop or relabel the "logged" run; (6) `--update`
  takes a reason; (7) a monthly reminder to export and rerun. Not worth doing: photo scoring, dollar weighting,
  covering all 32 tasks, statistics on n=69, automating marks.

## Codex on #347

- **D** "Add rhodium" from the ticket check added one plating on a two-ring ticket. Fixed before merge (cd3c62ff).
