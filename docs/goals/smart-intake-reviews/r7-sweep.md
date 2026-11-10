# Round 7 sweep — 2026-11-10

Three fresh reviewers, each given only its brief, against the code as merged in #351. Every finding, condensed.
**D** = demonstrated, **S** = suspected; class **(a)** wrong with nothing true on screen, **(b)** wrong with a true
warning or check, **(c)** not a price matter. Plus Codex's finding on #351.

## Server and model

This reviewer's harness failed on a shell quoting error and it was asked to report before fixing it, so **nothing it
reported was executed** — every case is a hand trace. The loop ran four of them afterwards against `decideIntake`:
A–D below reproduce.

- **Traced, then reproduced (a)** The count check was satisfied by any matching digit in the note: "retip prongs on
  6 prong head" answered ×6 → no warning. A quantity equal to the karat or a ring size passed the same way.
- **Traced, then reproduced (a)** A re-read turns white gold yellow and drops rhodium: "14k w/g ring size 7 to 6"
  with the form holding the ASSUMED yellow from an earlier read. `noteNames` did not know "w/g", so the form's yellow
  won. No warning.
- **Traced, then reproduced (a)** The "direction is a guess" warning was silenced by any "up"/"down": "size to a 7,
  pick up friday" → Size Down, no warning.
- **Traced, then reproduced (b), false warning** "band is not wide" read as wide ("a wide shank was stated"); "to
  match her wide band" read as this ring's.
- **Traced (b), true warning** Rhodium on every white gold job against five saved tickets without it (tennis
  bracelet weld, 3 laser welds, two 10k sizings, a half shank). The most frequent wrong line by his own saves; the
  rule follows what he said twice. (Owner question O4.)
- **S** Model retirement — the highest likelihood: every read returns 502, the form falls back, he sees "AI down";
  the replacement will have different habits. aiMeta has no gate: the generator asks for customer speech, an Admin
  edit changes the model's behaviour with no replay, and that route hard-codes its own model. Renames in production
  warn at the counter but nobody is told before a ticket hits one. "Today" is UTC and the model is not given the
  weekday. The prefilter past 80 tasks. No rate limit or length cap.
- Not found: a silent wrong multiplication by piece count; the model's own stock arithmetic or an invented task id
  reaching the ticket.
- Right: the model only suggests; multiplication needs agreement; three-valued width; the width default correctly
  undoes the model's habit of picking 3–5mm on every plain size-up; karat-as-size, big moves and non-ring sizes are
  blanked with a reason; failures logged and `raw` stored; temperature 0; the photo description barred from metal.
- Change: `saysCount` strips karats, sizes and "N prong head" first; the direction word must sit next to a sizing
  word; add "w/g", "y/g", "wht" and do not send an assumed colour or karat as the form's metal; exclude "not"; ask
  the owner about rhodium on chains, bracelets and welds; a calendar reminder and an env override for the model; pass
  the local date and weekday. Not worth doing: more width regexes, a role field, rate limiting, rewriting all aiMeta.

## From the model's answer to the saved ticket

"I could not reach a wrong line or quantity with nothing true on screen (class a). Every wrong state I produced had a
true warning or check beside it. The remaining risk is that nothing makes him act on them." Drove the real hook with
the real `decideIntake`, 10 scenarios, about 30 states.

- **D (b)** A re-read undoes his stock fix: 6 → 8 read, edited to 6 → 9.5, "Make it 3" tapped, then a re-read puts
  the stock back to ×1. The stock check and "sizes were left as you set them" are both on screen. Tasks keep a
  hand-changed quantity; materials do not.
- **D (b), weakest cover** Correcting "2 rings" to 1 leaves other lines at 2: rhodium and stock each get a check;
  polish stays ×2, ticked, under the stale "2 pieces: … counted 2 times".
- **D (b)** AI down after a good read drops the sizes: "size up 6 to 8" is not a form the fallback reads, so the
  sizes blank, and with no sizes the "sizing missing" check cannot fire. The banner is true but does not say a sizing
  job was lost.
- **D (c)** Stale notes: `Added "Rhodium Plating"` stays after he deletes the line (the rhodium-missing check shows).
- **D (c)** Stock is ticked "from your sentence" though its quantity is computed, and the tick stays after a change.
- **D (b)** A wide task with narrow stock has a check with no one-tap fix.
- Tried and held: a re-read after a direction switch or a platinum switch; analysing twice; "size up 3 sizes" with no
  sizes; customer gold; a metal corrected by hand then re-read.
- **S** Nothing blocks a save with open checks (the highest likelihood × damage left). Review does not list the
  lines; on a phone the checks are at the top and the save bar at the bottom. The checks depend on title wording;
  a rename of a live task turns the stock and direction checks off. The hook reads "wide" from the title with a
  narrower regex than the helper. Karat substitution in the engine. Tasks inferred from the photo's description are
  ticked "from your sentence". The classic form. Store users have no shop eyes before the save.
- Right: the server re-prices everything; an unpriced line blocks the save; checks are recomputed from the ticket on
  every render, on Work and Review; deleted lines are not resurrected and the screen says so; his sizes and metal
  survive re-reads; assumed values are amber and marked on Review; a stale answer is discarded; stock is never the
  model's.
- Change: make open checks gate the save (block, or one "Save anyway (2 open checks)"); list the lines on Review and
  repeat the check count by the save button; keep a hand-changed stock quantity across a re-read; a piece-count check
  for every ticked line, not only rhodium; AI down keeps the sizes the last read set, or says the sizing job was
  removed; clear "Added …" notes when their line is gone; a "Switch stock" button. Not worth doing: re-running the
  rulings on the server, more sentence regexes, reworking the classic form.

## Evidence, measurement and upkeep

"I found no case where the code puts a wrong price on a ticket or loses ticket data silently." The model run gets 3
of 69 suggestions wrong, all visible on the form before the save.

- Proven: the headline is a fit (the 21-ticket gap to "as saved" is exactly the 21 marks that override his saved
  tasks; 26/26 marked, 39/43 unmarked); no fresh tickets; 11 of 32 tasks never expected, 0 platinum, 3 store
  tickets, 7 tickets with stock and 25 with sizes; the replay omits `formMetal`, the browser's steps and the
  fallback, and the export drops `input.formMetal` and `promptHash`; `--update`, `skip` and a mark with no `why`
  all pass, and 4 marks sit on superseded attempts; live drift is invisible, and the route's `promptHash` (empty
  placeholders) can never equal the replay's ("NOTE"/"TODAY"); at today's quality 24 of 69 tickets would show as
  "tasks changed" with 3 real misses; the trend needs ~18 points to mean anything; "AI said" is logged before the
  browser changes it, so every platinum swap counts as his change; the outcome is written at create only; a failed
  read returns no log id; photo failures are not logged; "AI failed" has no window; the photo ratchet cannot move;
  the proposal quotes the fixtures (20 of 49), including two of the three failing tickets.
- **S** The proposal contradicts the prompt line that calls symptoms customer talk; one sample per ticket; task
  order differs between fixture and production; the model check accepts any `gemini-2.5-flash*`; refreshing and
  marking are what he stops first.
- Apply script: reasonably safe; the typed yes flag, non-atomic writes, nothing forcing a re-export.
- Change: a one-tap reason at save when tasks differ from the suggestion ("AI wrong" / "my call"); log what the
  form actually showed and return a log id on failed reads; hold the proposal until ~30 fresh tickets; ONE hash
  function for the route and the replay, exported, with a warning on the admin page when they differ; a CI guard
  (score cannot fall against main, marks need a why, dead marks fail). Not worth doing: more rule rounds on these 69
  tickets, ratcheting the saturated metrics, the photo ratchet, a variance harness, more dashboards.

## Codex on #351

- **D** "ring has a wide shank" was set aside as someone else's band. Fixed before merge.
