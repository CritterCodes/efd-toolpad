# Round 5 sweep — 2026-11-09

Three fresh reviewers, each given only its brief, against the code as merged in #349. Every finding, condensed.
**D** = demonstrated, **S** = suspected. Reviewers were asked to class each demonstration: **(a)** a wrong line or
quantity with nothing true on screen, **(b)** wrong with a true warning, **(c)** not a price matter. Codex did not
finish its review of #349.

## Server and model

Could not get a silent wrong price from: piece-count multiplication, karat as size, moves over 5 sizes, direction
swaps, unknown ids, the six-task cap, or renaming/adding sizing, rhodium or width tasks.

- **D (a)** A stated wide shank in shorthand is charged narrow, and the warning says "no wide shank was stated":
  "size 6 to 8, 5x2"; "size 6 to 8, 3-5" (the owner's own phrase); "3 to 5 shank"; "band four and a half millimeters"
  (dictated); "heavy mens ring". The model picks the wide task on every stored size-up, so the downgrade runs often.
- **D (a)** Per-piece counts at or below the piece count get no line in the warning: "2 rings, retip 2 prongs each" →
  Retip ×2 under "each task and material is counted 2 times"; "3 rings, clean and polish, retip 2 prongs" → Retip ×3.
- **D (b)** Sizing beads also gets a Size Down ("add sizing beads to fit like a 6.5", sizes 7 → 6.5). The warning is
  true but does not ask.
- **D (b)** Solder Together used for a break is cut to one ("2 rings, both shanks broken, solder back together").
- **D (b)** "no rhodium" is ignored.
- **D (c)** Dictation: "size 7 half size up" folds to "size 7.5 size up".
- **D, needs an off-schema answer** `normalizeMetalType('gold plated')` → platinum; `normalizeKaratValue('7')` → 7k;
  a non-numeric `sizeChange` ("2 sizes") → 0.
- **S** Model retirement or a silent update; timeouts; phone photos over the host limit; UTC "today"; the prefilter
  past 80 tasks; the aiMeta generator; no length cap on the note or the client's task list.
- Right: stock computed; multiplication needs two agreements; roles that fail say so; the form's metal beats the
  photo; width has an "unclear" answer; failures are logged; temperature 0.
- Change: width — treat unitless NxM over 3, "3-5", fractional spoken millimetres and "heavy … ring" as at least
  unclear, and reword the swap warning (it cannot know none was stated); always name a per-unit line in the piece
  warning; do not auto-add sizing when Sizing Beads is matched; solder rule only for joins; honour "no rhodium";
  hardening (`\bplat(?:inum)?\b`, karat range, unreadable `sizeChange`, length caps); the aiMeta generator prompt. Not
  worth doing: a role field, more piece-count regex, a second model, retry tuning.

## From the model's answer to the saved ticket

Could not break: quantities and stock on a first read, edited sizes and stock quantity, two reads in flight, store
users, the photo description leaking into the metal, stock for the wrong metal.

- **D (a)** A guessed karat overwrites a hand-picked one and gets a tick: form 18k by hand, note "gold ring size up 5
  to 7", model answers 14k → 14k, ticked. The server keeps a guessed karat when the model returned one; the hook
  overwrites karat when only the metal was said.
- **D (a)** A re-read undoes a metal he corrected by hand: note "14k yg…", he sets 18k white on Review, dictates "and
  polish" → back to 14k yellow, the rhodium check vanishes. Sizes are protected; metal is not.
- **D (a)** A wide size-up with 3x2 stock: after "Check the width" he swaps in the 3–5mm task by hand; the stock stays
  3x2, ticked; no check (quantity only).
- **D (a)** A line he deleted never comes back, even when the sentence asks for it again ("retip 6 prongs and
  polish" → polish only, no warning).
- **D (b)** The rhodium check offers ×1 on a two-ring ticket with no sizing line.
- **D (c)** AI down after a hand-edited size: the regex puts the sentence's sizes back; the banner shows.
- **S** Checks never gate the save, and on a phone they sit at the top of Review while the save bar is at the bottom.
  "(assumed)" shows on the Piece step only; the Review metal row is plain. The classic form. A 10k ring may be priced
  with 14k stock by the engine's substitution, unflagged on the line. Edit mode may drop saved AI lines on a new read
  (if saved lines keep `__aiQuantity`). Two size-up lines: stock checked against the first. Size-up with `isRing` off.
- Right: the server re-prices everything; stock quantity is never the model's; the tick drops when he changes a
  count; AI-down takes earlier AI lines off; only the latest read lands; hand-edited sizes survive.
- Change: treat metal like sizes, and overwrite karat only when the note names one; open-check count in the save
  bar and a two-tap "Save anyway"; stock width in the stock check; say when a read matches a line he deleted; the
  rhodium check says "check the count"; carry the engine's substitution onto the line. Not worth doing: more sentence
  regexes, classic-form parity (delete it), two size-up lines, sizes in the AI-down path.

## Evidence, measurement and upkeep

"I found no case where the system puts a wrong price on a ticket or silently loses ticket data."

- Proven: the headline is a fit (26 marked tickets all pass; 39/43 unmarked; 45/69 as saved); `--update` and a
  missing `score.json` entry skip the ratchet; it ratchets counts, not rates; no fresh tickets, and when they come
  they fail nothing; 11 of 32 tasks never appear, 0 platinum, 3 store tickets; the replay omits `formMetal` (the
  export does not write it) and the browser's platinum swap; the photo ratchet is an absolute count; unmarked
  sizing stock is read from the repair as it is today; the production trend is mostly his own choices (17 of 29
  changed tickets are ones the marks call breaks) and ±22 points of noise at this volume; a failed read returns no
  log id so the hand-typed ticket never joins the trend; "AI failed" has no window; a missing key or a throw after
  the model answers logs nothing; rhodium 6 of 12.
- **S** The proposal cannot be shown to help (gain at most 3, exposure 41); model drift under the alias; CI may not
  run the ratchet; the refresh is what he stops first.
- Apply script: safe enough; sequential updates leave a partial state on a mid-run failure, which `--restore` recovers.
- Change: flag each new repair "used smart intake / AI failed / not used"; one `intake:refresh` command and a
  committed history of the fresh score; split "tasks changed"; ratchet rates; export `formMetal` and store stock in
  the outcome; hold the proposal; ask him about rhodium. Not worth doing: more rule-tuning on these 69 tickets,
  charts, significance tests, an LLM judge, guarding marks, a transactional apply.
