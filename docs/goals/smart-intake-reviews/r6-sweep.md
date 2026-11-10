# Round 6 sweep — 2026-11-10

Three fresh reviewers, each given only its brief, against the code as merged in #350. Every finding, condensed.
**D** = demonstrated, **S** = suspected; class **(a)** wrong with nothing true on screen, **(b)** wrong with a true
warning or check, **(c)** not a price matter. Plus Codex's finding on #350.

## Server and model

Ran all 69 stored answers through `decideIntake` against the saved tickets: 42 match, 18 differ with a warning, 9
differ with none; two of the nine are the model's wrong pick (A, B). Could not get a silent wrong price from the
direction, piece-count or stock arithmetic, or the size guards.

- **D (a), real ticket (A)** A Set Stone tier guessed with no weight in the note: "re-tip, 20 prongs. Remove and
  reset stone" → `Set Stone less than0.49ct`, no warning; he saved 0.5–0.99ct.
- **D (a), real ticket (B)** "Closest task": "Sterling silver bangles hard solder" → Break in chain; he saved Laser
  Weld. The prompt orders "pick the closest listed task" and nothing marks a stretch. The fix sits in the unapplied
  aiMeta proposal.
- **D (b)/(a) (C)** "mens band 5mm x 2mm size 10 to 12" reads as no width (the "x" after "5mm" is taken as the thing
  measured); dictated "5 by 2 shank" the same. Wide pick downgraded; the warning's premise is untrue.
- **D (b) (D)** False wide: "add 4mm ring guard" and "wife has wide band too" → the 3–5mm task with "a wide shank was
  stated" (`ring` counts as the band; "has" is not in the not-this-band list). "size 3 to 5 band" reads as the "3 to
  5" shorthand — (a), rare.
- **D (b) (E)** "customer does not want rhodium", "rhodium not needed", "no replate" still add rhodium.
- **Owner question (F)** Stock against his saved tickets: "5 to a 7" → code task ×1 + stock 1, he saved ×2 + 2;
  "8.5 to 12.25" → code ×1 + stock 3, he saved ×2 + 8. The code follows the 2026-11-09 ruling.
- **S** Model retirement. Catalog edits: renaming "Check & Tighten < 20 stones" removes the count warning; renaming
  Solder Together loses the joins rule; adding "Size Up - 5mm to 8mm" bills a 6mm band at 3–5. Solder quantity 2 with
  pieceCount 1 stands. "18 carat", "pt950", "stamped 750" are not read as naming a karat, so the form's wins. "2
  sizing beads" ×2, "remove 3 links" ×3 unchecked. Only 429 is retried; the photo route calls every piece "the ring".
- Right: the model chooses, the code decides; multiplication needs agreement; the size guards held; a renamed role
  task mostly warns; temperature 0; failures logged.
- Change: apply the aiMeta proposal after the owner's yes (the live "Size up (1 size)" text says not to use it for
  more than one size, which is WHY the model picks the wide task every time — and a warning he sees every time gets
  ignored); warn when a Set Stone tier is chosen and the note has no ct; width: "Nmm x Nmm", "N by N", drop bare
  `ring`, add "has"; widen "no rhodium"; confirm the stock unit; show `problems` on Admin → Tasks; model name from
  the environment, retry 503 once. Not worth doing: more piece-count regexes, the prefilter, validating the
  client-sent catalog, spelled-out karats, a role field.

## From the model's answer to the saved ticket

Could not reach a wrong price unnoticed through: stock count or width with both sizes on the form, material
matching, re-reads duplicating or restoring lines, AI failure adding work, browser-sent prices.

- **D (a)** A count nobody said gets a tick: "retip prongs on 6 prong head" answered 6 → ×6 ticked; "retip 2 prongs
  and set 1 stone" answered retip 1 / set 2 → clean screen. Nothing holds a per-unit count against the note.
- **D (a)** Silver or platinum guessed onto a blank form looks confirmed ("ring going up from 6 to 8", description
  "silver-toned band", model answers silver → "✓ silver ✓ 925"). The "(assumed)" marker is gold-only.
- **D (b)** AI down after he corrected the ticket: sizes and karat go back to the sentence's; the fallback does not
  honour his edits.
- **D (a)** An edit made while a read is in flight is undone silently: "kept" is decided from the form as it was
  before the call.
- **D (a)/(b)** Rhodium does not follow the piece count: size-up and stock corrected from 2 to 1 leaves rhodium ×2,
  no check; raised to 2 leaves rhodium ×1.
- **D (b)** A hand-set stock quantity is replaced on re-read, and its tick never goes.
- **D (b)** A sizing task the server calls a guess still gets the tick.
- **D (c)** No `isRing` and no "ring" in the note ("wedding set going from a 6 to an 8"): size-up and stock, sizes
  blank, "Not a ring".
- **D (a) if reachable** A reopened ticket: saved lines keep `__aiQuantity`, so a new read treats them as its own and
  can drop them.
- **D (c)** Task list not loaded: an empty ticket with no "No work was matched" line.
- **S** A metal-only task with no general sibling is dropped silently on another metal. Phone: checks at the top of
  Review, save bar at the bottom. The classic form. Stores see "fix the task names in Admin → Tasks".
- Right: the server prices every line; stock is one shared function; agreement for pieces; his hand survives a
  re-read and the screen says so; checks run against the ticket as it stands with one-tap fixes; AI-down adds nothing.
- Change: a second tap to save while a check is open, with the count in the save bar; tick only what the note says
  (any unsaid metal is assumed; an amber chip on a count not in the note; no tick on a guess); honour his sizes and
  metal in the fallback and decide "kept" inside the state update; a check for a per-piece line whose quantity
  differs from the sizing line's; say when a matched task is dropped at alignment or the task list is empty; strip
  the markers at save. Not worth doing: blocking saves outright, re-running the rulings on the server, more sentence
  regexes, repairing the classic form (delete it).

## Evidence, measurement and upkeep

"I found no case where code loses ticket data or puts a price on a ticket that the jeweler does not see." Two of 69
replayed tickets carry a wrong suggestion and no warning (A and B above).

- Proven: the headline is a fit (26 marked all pass; 39/43 unmarked; 45/69 as saved); 71 tickets, 39 days, 0
  platinum, 11 of 32 tasks never expected; `--update` skips every assertion, marking a ticket `skip` passes, CI
  hashes the committed catalog and not the live one; any refresh forces a model run and an `--update`; the replay
  omits `formMetal` and the browser's steps; `logged` and the photo count are noise; the trend is mostly his own
  choices (17 of 29) and needs ~19 points between windows to mean anything; "AI failed" covers the newest 200 rows,
  no photo failures, no missing-key or outer-catch failures, and fallback-built tickets carry no log id; warnings do
  not discriminate (22 of 65 right tickets, 2 of 4 wrong ones); the proposal quotes the fixtures; dollars, bench
  edits, abandoned suggestions and latency are unmeasured.
- **S** The model alias; Actions may not be running; the four-step refresh is what he drops first.
- Apply script: safe enough; restore overwrites later edits; CI passes on the old prompt after an apply.
- Change: store the prompt hash on every log row and split the trend by it; a drift alarm on the admin page (live
  catalog hash against the measured one); export `formMetal`; stop ratcheting `logged` and photos; a one-command
  refresh; a one-tap "AI was wrong / my call" on changed rows; count failures honestly; apply only Laser Weld and
  Glue Pearl from the proposal. Not worth doing: more rule rounds on these 69 tickets, per-attempt statistics, an LLM
  judge, a dollar replay, tuning warnings first.

## Codex on #350

- **D** An assumed colour lost its marker when only the karat was edited by hand. Fixed before merge.
