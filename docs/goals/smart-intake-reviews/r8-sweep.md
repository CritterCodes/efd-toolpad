# Round 8 sweep — 2026-11-10 — the last

Three fresh reviewers, each given only its brief, against the code as merged in #352. Every finding, condensed.
**D** = demonstrated by running it, **S** = suspected; class **(a)** wrong with nothing true on screen, **(b)** wrong
with a true warning or check, **(c)** not a price matter. Plus Codex's finding on #352. Nothing here was fixed:
round 8 was the cap.

## Server and model

All demonstrations were run through `decideIntake` against the real catalog. Could not break: quantity clamps,
karat-as-size, moves over 5 sizes, unknown ids, wrong-shaped `matchedTasks`, renamed or duplicated role tasks. "Apart
from items 1 and 2, I found no silent wrong price on today's catalog."

- **D (a)** Someone else's band, given as a MEASUREMENT, is read as this ring's width: the real note "10k White
  gold, size 6 to 7.5." plus " wears with 4mm band", with the model's real stored answer (the wide task) → the 3–5mm
  task, no width warning. Also "sits next to 4mm band", "to match her 5mm wedding band". The not-this-band guard runs
  for the worded form ("wide band") and not for measurements.
- **D (a)** A two-tone ring gets no rhodium: "14k yg ring with wg head, retip 4 prongs", model answers yellow (the
  first colour named, as the code itself reads it) → Retip ×4, no rhodium, no warning.
- **D** Warning fatigue, "the root risk": 25 of the 69 real notes come back with a warning — 8 "Added Rhodium", 6 the
  "3x2 default" line. The 3x2 line fires on every multi-size size-up because the narrow task's own aiMeta says not to
  use it "if more than one size up is needed", which steers the model to the wide task, which the rule swaps back.
- **D (b)** "check and tighten 5 stones" stays ×5 (warned, not corrected). "no plating", "no rh", "customer declined
  rhodium" still add rhodium. "2 wg bands, size one 6 to 7, polish both" → Size Up ×2. "2 rings, clean and polish,
  size the smaller 5 to 7" → Size Up ×2, stock 2. "5mm mens, size 10 to 12", "shank 4.5", "band width 5" → the narrow
  task with only the generic 3x2 line.
- **D (c)** A past promise date is accepted ("ready 1/5" answered 2026-01-05).
- **S** A blank colour for "14kw" defaults to yellow with no rhodium. "size down 2 sizes" answered `sizeChange: 2`
  becomes Size Up. Renaming a flat task drops its warning. Model retirement. No length cap, no `maxDuration`. The
  photo prompt says "ring" for every piece.
- Right: stock computed; multiplication needs agreement; title roles fail loud; only catalog ids survive;
  temperature 0, the prompt hash logged, one `decideIntake`; "Size 10KY to an 8" correctly blanks the 10; failed
  reads logged.
- Change: apply the not-this-band guard to measurements; fix the narrow Size Up aiMeta so the model stops picking
  wide, then drop the routine 3x2 warning (about a quarter of all warnings); clamp flat tasks to one per piece
  instead of only warning; widen "no rhodium"; warn when the note names two gold colours; do not multiply the sizing
  when "one", "the smaller" or "only" sits near the sizing words; rewrite the aiMeta generator prompt; reject past
  promise dates; one model constant. Not worth doing: more width regexes for unit-less numbers, a response schema,
  the prefilter, input caps beyond a length limit.

## From the model's answer to the saved ticket

"I could not reach a wrong sizing-stock quantity, direction, rhodium or metal price unnoticed through hand edits,
re-reads or AI failure. Every such path ended in a true check or a blocked save. What remains is where the code takes
the model's word and the screen vouches for it." 11 scenarios, the real hook and the real `decideIntake`.

- **D (a)** Any line the model returns gets "✓ from your sentence": "retip 2 prongs" answered retip ×2 plus Laser
  Weld ×1 → both ticked, no warning. Nothing confirms the note names the work.
- **D (a)** A current size the note never said is taken as said: "ring size to a 7" answered 5 → 7 → Size Up, stock
  ×1, "✓ 5 → 7". The "guess" warning only fires when the sizes do not move.
- **D (a), rare** A matched task made for another metal with no general sibling is dropped without a word.
- **D (b), and introduced by this loop** Two checks contradict the server's own decision: after "no rhodium" the
  note says rhodium was left off and a standing check says "White gold gets rhodium… [Add rhodium]"; after sizing
  beads the note says no Size Down was added and a check offers [Add size down]. Each leaves "1 check is open" beside
  Save on a correct ticket, one tap from an over-charge — and teaches him to ignore the line.
- **D (b)** A reopened ticket: saved stock keeps `_smartIntakeHintType` (the save strips `__aiQuantity` from tasks
  only), so a read removes the saved sizing stock; with the full sentence it returns re-priced at today's metal.
- **D (b)** Sizes typed after a read with none: the stock check has no "Add" button — about six taps on a phone, in
  the commonest sizing flow.
- **D (c)** Read notes go stale ("2 pieces: … counted 2 times" after every line is set to 1); only "Added…" notes
  retire.
- **D (a), contrived** "Size up 3 sizes", then "This item is a ring" switched off: stock ×2, no sizes, no check.
- **S** The classic form (also every edit): checks beside the sentence box, no "checks open" line, no ticks. The
  read's info notes are not counted in the save-bar line. Chips on Piece tick a hand-picked metal. "Rewrite
  description from photo" appends, and that text goes to the model on the next read. Stores see shop-voice notes. A
  model promise date lands unmarked.
- Right: stock computed by one function; every price derived by one engine, an unpriceable line blocks the save, the
  server re-prices; re-reads keep his quantities, deletions, sizes and metal and say so; AI down takes the earlier
  read's lines off, keeps sizes, guesses nothing; checks run against the ticket as it stands with a count beside
  Save; assumed values are amber; pieces multiply only on agreement.
- Change: tick only what the note backs (have the model return the words it matched for each line; a size whose
  number is not in the note is "assumed"); silence the two contradicting checks; an "Add N" button on the stock
  check; strip `_smartIntake*` from materials at save; say when an aligned task was dropped; retire stale notes and
  count the read's notes in the save-bar line; list the lines on Review. Not worth doing: server-side ruling checks
  on save, more regex for the AI-down path, blocking the save before the contradicting checks are fixed, polishing
  the classic form (retire it for create).

## Evidence, measurement and upkeep

"I found no case where the system puts a wrong price on a saved ticket or loses ticket data silently." One wrong
suggestion is shown without a warning (the silver bangles ticket).

- Proven: 66/69 is a fit on a small set (95% interval 88–99%; a fall to 88% would be invisible); 45/69 as saved;
  26 marked tickets all pass, the 3 misses are among the 43 unmarked; 11 of 32 tasks never expected, 0 platinum, 3
  store tickets; no fresh tickets, and failing fresh tickets would be printed in full, so the next fix tunes on them;
  `--update` skips every check, a new mark passes any ticket, the "logged" run is ratcheted on answers that kept no
  raw; a silent Gemini revision is undetectable; the route logs `promptHash` but neither the page nor the export
  reads it; the export drops `formMetal` and the replay omits it; the production counter: 29 of 71 "changed", 8 his
  own breaks or additions, 5 saved exactly as suggested are wrong by his own rulings, ±16 points at this volume, no
  split by prompt version; "AI failed" has no rate or window and an outage improves the trend; the proposal can
  gain at most 3 and 20 of its 49 symptoms are quotes; 25 of 69 tickets carry a warning and 3 of the 4 not fully
  right are flagged.
- Apply script: careful, with gaps — the database is hard-coded to production so it cannot be rehearsed on DEV;
  `--restore` has no dry run; 11 separate writes.
- **S** Marks stop first; usage may be falling (27 tickets in week one, then 8, 15, 4, 10, 7); Glue Pearl's empty
  aiMeta could abort the apply on task 10 of 11 if production holds `aiMeta: null`; the backup is written into a
  worktree that gets removed; CI may not enforce any of this.
- Change: do not apply the proposal now — wait for ~30 fresh tickets; export `promptHash` and `formMetal`, pass
  `formMetal` to the replay, split the trend by `promptHash`; "AI was right / wrong" on each log entry; log the
  response's model version; failures as a 30-day rate; drop the "logged" run from the ratchet; apply script: a
  `--db` flag, a restore dry run, a null-aiMeta check. Not worth doing: more rulings tuned on these 69, ratcheting
  the fresh score, replaying the client hook, photo scoring, the prefilter.

## Codex on #352

- **D** Hand-edited stock kept its AI markers on the ticket when nothing else changed, so a later read could take
  it back. Fixed before merge.
