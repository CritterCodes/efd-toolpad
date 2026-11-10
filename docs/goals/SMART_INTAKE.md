# Goal — smart intake, ratcheted until it stops getting better

> **Kind:** goal file for an unattended loop · **Opened:** 2026-11-09 · **Owner:** Jacob Engel
> Owner, 2026-11-09: *"Let's make our fixes. Let's run the sweep again with the three agents, where they tear it apart
> again … make those changes again to make it better … over and over, until we have some sort of end product where
> it's just not getting better."*

Smart intake turns one typed, spoken or photographed sentence into a priced repair ticket. This file is the whole
brief for a loop that fixes it, has three fresh reviewers attack it, fixes what they find, and repeats.

## The loop

Each round, in this order. Write what happened in **Round log** at the bottom before starting the next.

1. **Fix.** Take the open items in **Backlog**, highest first. One PR per round (`claude/smart-intake-r<N>`), small
   commits, a test with every fix. A fix that would change a price in a way the owner has not ruled on is NOT made:
   it goes to **Owner questions** with a recommendation, and the round moves on.
2. **Measure.** Run `npm run intake:replay` (round 1 builds it — see Backlog A1). Record the score in the Round log.
   A round may not merge if any score went down, unless the Round log names the tickets that flipped and why that is right.
3. **Ship.** Before the PR: run `npm test`, `npm run lint` and `npm run views` yourself and paste the result lines
   into the Round log. **GitHub Actions is not running on this repo** (on 2026-11-09 the only PR checks were Vercel's
   build and GitGuardian), so nothing else will run the tests. Then PR → those checks green → merge → confirm the
   Vercel production deploy completed. Never push to `main`. A red test is fixed, never skipped or suppressed.
4. **Sweep.** Start three fresh reviewers with **no context from this file, earlier rounds or each other** — only the
   three briefs in **Reviewer briefs**, verbatim. Save each report to `docs/goals/smart-intake-reviews/r<N>-<lens>.md`.
5. **Triage.** Every finding becomes exactly one of: a Backlog item (with the report's file:line), an Owner question,
   or a line under **Declined** with the reason. Reproduce a "demonstrated" bug yourself before believing it; reviewers
   are sometimes wrong about the live catalog.

## When to stop

Stop, and write a final summary at the top of the Round log, when **either**:

- **It has stopped getting better:** two rounds in a row where (a) the sweep produced no demonstrated wrong-price bug
  and no demonstrated silent-data-loss bug, and (b) the replay score did not improve by even one ticket; **or**
- **Round 8** is finished. That is a cap, not a target. Say what is still open.

Also stop and say why if a round cannot make progress without the owner (every remaining item is an Owner question),
or if production smart intake is found broken — fix that first, outside the loop's order.

## Rules that do not bend

- **Production data is read-only.** Reading `efd-database` to refresh fixtures is fine. No writes without the owner's
  yes. Task `aiMeta` rewrites are prepared as a script with a dry run and a printed before/after, and wait.
- **The model picks catalog ids; code decides prices and rulings.** Never move a ruling out of code into prompt wording.
- **One pricing engine, no stored prices, no fallbacks** (`docs/PRICING_ENGINE.md`). Smart intake never computes a price.
- **Ratchets only go down** (lint, views). `CLAUDE.md` session rules apply in full.
- **Record owner rulings with the date and his words.** Absolute dates only.
- **Don't build what the reviewers agreed to skip:** confidence scores, alerting, a smarter regex fallback, switching
  AI provider, rate-limit infrastructure, embeddings.

## The score

`npm run intake:replay` replays the frozen real intakes and prints, per run:

- **Tickets with the same tasks and quantities** as the saved ticket (the headline).
- Same tasks ignoring quantity · same ring sizes · same metal/karat/colour · same sizing-stock quantity.
- The tickets that flipped since the last recorded run, both directions.

Two modes, both required once they exist:

- **Rules mode (no AI call, runs in CI):** the logged raw model answer → today's deterministic rules → compare. This
  measures the code and never needs a key.
- **Model mode (calls Gemini):** today's prompt → Gemini → rules → compare. An API error ABORTS the run; it is never
  scored as an empty answer. **The key:** the one in the local `.env.local` is out of credit (402 on 2026-11-09). Owner,
  2026-11-09: *"You can pull the Gemini key from vercel."* Verified the same day: the production key answers 200. Get it
  with `npx vercel env pull <file> --environment=production --yes` run from the main checkout, copy ONLY the
  `GEMINI_API_KEY` line into a gitignored `.env.replay.local`, and delete the pulled file — it holds every production
  secret. Never print the key, never commit it. A full replay is about 70 calls; don't run it more than a few times a round.

**Sizing tickets are not ground truth.** Owner, 2026-11-09: he gave customers breaks on some size-ups, rounding
down instead of up. A saved ticket shows what he charged that day, not what the rule is. So for every fixture where
the ring is sized UP, the expected sizing quantity and sizing stock come from the owner's rule (O1, answered: task ×1,
stock = sizes rounded up − 1), never from the saved ticket. Never tune a rule or the prompt to match a discounted ticket. The same goes
for any other field the owner later says he discounted — mark the fixture, don't learn from it.

Baseline before any of today's fixes, from the production log (2026-10-02 → 11-06): 77 saved typed intakes = 70
tickets; tasks+quantities matched on 44 of 77 logs; 40 of 70 tickets saved exactly as suggested.

## Backlog (round 1 starts here)

From three independent reviews on 2026-11-09. Already fixed and merged that day (#336, #337): whole catalog sent to the
model; promise-date false miss; rhodium on white gold, per piece; yellow default for a blank colour only; sizing stock
in whole sizes; a sizing task whenever two sizes are given; 3x2 unless a wide shank is stated.

**A — measurement first (nothing else is trustworthy without it)**

- ✅ r1 **A1.** Build `npm run intake:replay` as described above. Commit sanitized fixtures (`input.text`, `input.description`,
  `output`, `outcome`, `createdAt`, and the task catalog as the model saw it) under `test/fixtures/smart-intake/`, plus
  a read-only `scripts/intake/export-logs.mjs` that refreshes them. Hand-mark the ~13 tickets whose final work was
  never said in the sentence ("14 Kar" → Laser Weld) as `unknowable` and exclude them from the headline.
- ◐ r5 (per ticket by the last read, 30 days against the 30 before; failed AI reads are now logged and counted; the form's metal is logged. Still no prompt hash, and the trend does not split "AI line removed" from "he only added") **A2.** Fix the miss counter (`src/services/ai/smartIntakeLog.js`, Admin → Smart intake log): count per ticket, not
  per log; split typed from photo; include materials; log AI failures and invalid JSON (today they return before the
  log write); store the task ids offered, a prompt hash and the model version; add a date range (the page loads the
  newest 200 and there are already 194).
- ✅ r1 **A3.** A test that every title-keyed rule resolves to exactly one task in the committed catalog fixture.

**B — wrong price, nobody notices**

- ✅ r1 **B0 — several pieces on one job. RULED 2026-11-09, build first.** Owner: *"Sometimes there are 2 rings in a single
  job. If there are 2 rings then there are 2x task and 2x materials. Each ring gets a task and a material."* So the
  piece count multiplies every task AND every material: 2 rings sized 5→7 = size-up ×2 + sizing stock ×2 (1 per
  ring × 2); with white gold, rhodium ×2. Today only the prompt asks for it, the sizing task added in code is always
  ×1, and sizing stock is never multiplied. Make the piece count one explicit number the model returns
  (`pieceCount`, default 1), and apply it in code to the sizing task, the stock and rhodium. Per-unit counts stay
  what they are: "2 rings, retip 4 prongs each" = retip ×8. Logged cases to pin as fixtures: "size from 8.75 to 7.25,
  Rhodium plating, 2 rings" (saved Size Down ×2 + Rhodium ×2), "Size all 3 to a 6", "Solder together two rings"
  (that one is ONE job on two rings — not a piece count).
- ✅ r1 **B0b — solder together. RULED 2026-11-09, build with B0.** The Solder Together task's quantity is rings − 1
  ("2 rings is 1x task, 3 rings is 2x"). Decide it in code from the stated ring count; pin "Solder together two
  rings" (= ×1) and a three-ring case (= ×2) as fixtures.
- ✅ r1 **B1.** Platinum size-up becomes a Half-Shank: `src/services/repairs/metalTaskFilter.js` picks the platinum
  counterpart by title-word overlap. Swap only within the same job family, or store a counterpart id. Confirm against
  the live catalog first — the reviewer used titles from tests.
- ✅ r1 **B2.** A fraction becomes a promise date: "set 1/2 ct diamond" → January 2 (`newRepairFormHelpers.js`, the regex
  date fallback used when the model returns none). Seen twice in the production log. Remove it from the AI path; in
  the rule path require "due/by/ready" and reject past dates.
- ✅ r1 **B3.** Sizing stock is taken from the model's number when it sends one (`useSmartIntake.js`). Always compute it
  from the two sizes; drop material hints other than `sizing_material`.
- ✅ r1 **B4.** Fractional and worded sizes: "7 1/2" and "size 7" are misread by `parseFloat` in the server rules; share one
  size parser between server and form.
- ✅ r1 **B5.** `statesWideShank`: "6mm stone" and "heavy wear" read as a wide shank; "4 millimeter band" does not; the
  description field is never checked.
- ✅ r1 **B6.** A fourth job is dropped silently (cap of 3 server-side, 2 in the fallback). Raise the cap to about 6 and
  say when something was cut.
- ✅ r1 **B7.** Duplicate lines when a generic and a platinum task are both matched; duplicate task ids kept.
- ✅ r1 **B8.** The dictation normaliser also rewrites typed text: "size 7 half shank" → "size 7.5 shank".

**C — rules that break on a catalog edit**

- **C1.** Replace title regexes (rhodium, size up/down, width band, narrow sibling) with fields on the task — a role
  and a width band — set in Admin → Tasks. Until then, A3 guards them. Needs a production write to set the fields:
  prepare it, dry-run it, and wait for the owner's yes.
- ✅ r3 (smart intake only: `INTAKE_MODEL` in `smartIntakeLimits.js`, read by the route and the replay, and a test holds the stored answers to it. The other AI routes still hard-code theirs.) **C2.** The model name is hard-coded in four files and `build-task` is on an older model. One constant.
- ◐ r1 (prompt rewritten, contradictions and phantom task names gone; `responseSchema` not yet) **C3.** Use Gemini `responseSchema` with enums; remove the prompt's contradictions ("extract only what is explicit"
  vs three defaults; "up to 3 tasks" vs "cover every job"; `matchedTasks` vs `matchedTaskIds`) and the task names that
  do not exist in the catalog ("Ring Sizing with Stones", "Chain Repair").

**D — the AI metadata**

- ◐ r2 (prepared: `scripts/intake/aimeta-proposal.json` for 11 tasks, `apply-aimeta.mjs` with a dry run, `npm run intake:replay -- --proposal` to score it. WAITING ON THE OWNER — see the Round log) **D1.** `aiMeta` is written in customer voice for a chatbot; the reader is a jeweler's shorthand (0 of 106 real
  inputs contain "my"). Rewrite, in shop shorthand and from the real inputs, for: Laser Weld (used on chains and
  bracelets, described as a crack near a stone), Size up (1 size) (says never for more than one size; all 5 real
  uses were), Clean and Polish (says not with other work; 7 of 10 were), Set Stone (says single stone; the shop uses
  quantity), the two jump-ring tasks (identical metadata), Glue Pearl (none). Change the generator prompt to match.
  Production write — prepare, dry-run, wait.
- **D2.** Require `aiMeta` on a task before it is offered to the model, or show a warning in Admin → Tasks.

**E — the form**

- ✅ r2 **E1.** Re-analysing a corrected sentence keeps the old metal, tasks and stock with no message. Make it replace what
  the previous analysis set and keep what was added by hand.
- ◐ r2 (assumed values are marked "(assumed)"; Review still shows a count, not the lines) **E2.** A ticket can be saved without seeing its tasks: the green chips skip Work, Review shows "3 · $185.00", and the
  chips are built from form state so a default reads as "picked up from that sentence". List the lines on Review; mark
  defaults as defaults.
- ✅ r2 **E3.** Return `warnings` from the server ("rhodium added: white gold rule", "unknown task id dropped") and show them.
- ✅ r2 **E4.** When the AI is down the regex fallback fills in a weaker ticket. Shrink it to metal and sizes, with "AI
  unavailable — add the work by hand".
- ✅ r2 **E5.** No test covers `useSmartIntake.js`, where the model's answer becomes ticket lines. Add one.

**G — the photo description**

- **G1.** Make the description worth printing (owner, 2026-11-09: "trash, need to be better"). Known faults: the prompt
  says "the ring" for every item; 9 of 65 logged descriptions that name a metal colour contradict the ticket (6 say
  "silver-toned" on yellow gold). When the ticket already has a metal, karat and colour, give them to the model
  rather than letting it guess from the picture, and have it describe only what a customer would recognise: the kind of
  piece, stones, visible damage. Score it in the replay as "description contradicts the ticket's metal: N of M" —
  the count must go down. It needs model mode and the stored images; if the images cannot be fetched read-only, say
  so and score the text fixtures only. Do this after B and C.

**H — found while building the replay (round 1)**

- **H1.** The two jump-ring tasks have identical aiMeta, so the model picks between them by chance; the owner removed
  the "w/ laser" one all 3 times it was suggested. Part of D1.
- **H2.** "Sterling silver bangles hard solder" → saved as Laser Weld. The model returns nothing or Solder Together.
  Shop knowledge (silver is laser welded) that belongs in Laser Weld's aiMeta. Part of D1.
- **H3.** A reset stone with no size said ("Remove and reset stone"): the model picks the smallest band, the ticket
  had 0.5–0.99ct. Unknowable from the sentence; the form should ask rather than guess. With E2.
- ◐ r2 (temperature 0 in the route and the replay; a few tickets still flip between runs) **H4.** Model-mode answers vary run to run on a few tickets ("Sterling silver clean polish" matched in one run and
  not the next). Score a model run only against another model run, and consider `responseSchema` (C3) and
  temperature 0.
- **H5.** `npm run views` needs a production build with `NEXT_PUBLIC_URL=http://localhost:4300`; not run in round 1.
  Three production test files cannot load `mongodb-memory-server` in a worktree. Neither is smart intake's, both
  mean the local gate is weaker than the goal file assumes.

**S — from the round 1 sweep** (`docs/goals/smart-intake-reviews/r1-sweep.md`)

- ✅ r2 **S1.** Piece count misread multiplied the ticket ("retip all 4 prongs", "5 diamond band", "7 ring needs to be
  6", "size 7.5 ring" — the last found by Codex, fixed in #345). The count is now a whole number against a PLURAL
  piece noun, with only describing words between; "all N" counts only when nothing else follows to be counted.
- ✅ r2 **S2.** Sizing was never checked against the sizes. Now: the task follows the direction of the sizes; a sizing
  task is exactly one per piece; two sizing tasks keep the first; a move over 8 sizes is blanked as a misread; no
  ring sizes on a piece that is not a ring; "all 3 to a 6" is not size 3.
- ✅ r2 **S3.** Shank width only went down. A stated wide shank now upgrades a narrow pick; "heavy mens band" and
  "cigar band" are wide; "4mm princess cut" and "center is 6.5mm" are not. Read from the sentence only (see Declined).
- ✅ r2 **S4.** Rhodium was decided from the model's colour, not the form's. The form's metal is sent to the route.
- ✅ r2 **S5.** `warnings` were computed and never shown; rule-added lines carried the "from your sentence" tick. The
  form shows the warnings under Analyze and labels those lines "added by rule: …".
- ✅ r2 **S6.** A ruling whose task is missing or ambiguous in the catalog went quiet. It now warns on the form, by name.
- ✅ r2 **S7.** A second Analyze left stale tasks, stock and metal (= E1).
- ✅ r2 **S8.** Sizing stock never followed a size edit or a hand-added size-up. The Work step now shows the mismatch
  with a one-tap fix (`sizingStockCheck`). The SAVE still does not check it — open as **S8b**.
- ✅ r2 **S9.** The fallback wrote a confident wrong ticket (= E4). It now reads the metal and sizes only.
- ✅ r2 **S10.** Material matching took any positive score. Only a sizing-stock material is ever added as sizing
  stock; the 3x2 unless the wide task is on the ticket; a warning when the list has none.
- ✅ r2 **S11.** The replay's honesty: it prints "vs the rulings" AND "vs what he saved"; the ratchet is per ticket;
  `npm test` fails when the prompt or task list changed since the model was last asked; no logged-answer fallback in
  the model run; "no work was said" tickets are scored as "should suggest nothing" instead of skipped (8 → 2 skips).
- ◐ r3 (the form now checks rhodium and the metal's own task as well as stock; the SAVE still checks nothing) **S8b.** The save (`src/app/api/repairs/route.js`) prices the lines it is given and does not hold sizing stock
  against the sizes. A server-side check, or at least a note on the saved ticket.
- ◐ r4 (see A2) **S12.** The production miss counter (= A2): per ticket, materials, failures, dates, prompt hash.
- **S13.** Run `taskRoles` when a task is saved in Admin → Tasks and warn there — catches a rename at the moment it
  is made, before the next intake. Cheaper than C1 and worth doing first.
- ◐ r4 (warnings, ticket checks and the stock check now show on Review, above the save; Review still shows a count, not the lines) **S14.** Review step: list the actual lines (rest of E2); show the stock check there too.
- **S15.** Coverage: no platinum ticket, 4 store intakes, 10 tasks appear once. Add hand-written fixtures for the
  platinum swap and a store intake when real ones don't arrive.
- **S16.** Photo path: "the ring" for every item; gold items described "silver-toned" (= G1, F3).
- **S17.** A mixed multi-piece job ("size one up, clean the other") cannot be expressed — the form holds one size
  pair. It now refuses to multiply and says so; splitting into two tickets is the real answer.

**T — from the round 2 sweep** (`docs/goals/smart-intake-reviews/r2-sweep.md`)

- ✅ r3 **T1.** The piece count multiplied tickets on a regex alone ("retip all 4", "broken in 2 pieces", "customer has 3
  rings"). The ticket is now multiplied ONLY when the model's count and the sentence agree; otherwise nothing is
  multiplied and the jeweler is told. "pieces"/"items" are no longer piece nouns; "all N" needs a noun; pieces that are
  merely mentioned ("her other 2 rings") do not count.
- ✅ r3 **T2.** Width erred both ways. A millimetre measurement is the shank only when the band is the next word or was
  just named — so "5mm amethyst" (or any stone) is not a wide shank — and "wide 14k white gold band" is.
- ✅ r3 **T3.** The misread guard: the limit is 5 sizes (was 8), and a size equal to a karat named in the note is blanked
  ("resize 14k wg ring" → 14).
- ✅ r3 **T4.** A task the model names twice is two of it (the quantities add).
- ✅ r3 **T5.** Vocabulary: "white gold" as a metal, "585", a quantity of "four", "yellow gold with white gold head".
- ✅ r3 **T6.** A metal the NOTE does not name never overwrites the form (the model may have read it off the photo's
  description). The prompt now says the description is appearance only.
- ✅ r3 **T7.** The rulings ran once, at the read. `ticketChecks` now holds them against the ticket as it stands:
  white gold without rhodium, rule-added rhodium on a ticket that is no longer white gold, a generic task where the
  metal has its own — each shown on the Work step with a one-tap fix.
- ✅ r3 **T8.** A re-read discarded hand corrections. An AI line whose quantity he changed is kept as his; an AI line
  he deleted is not put back.
- ✅ r3 **T9.** A failed read left the previous read's ticket. It now takes off what the earlier read added, and the
  warning shows on the Work step whether or not there are lines.
- ✅ r3 **T10.** Two reads in flight: only the latest lands.
- ✅ r3 **T11.** With the AI down, sizes are read only from "size X to Y" / "from X to Y" / "X needs to be Y", never a
  karat or a count; "restring" and "earring" are not rings.
- ✅ r3 **T12.** Sizing stock for another metal is not added (a silver ring got yellow gold stock).
- ✅ r3 **T13.** "(assumed)" clears once the jeweler picks the colour.
- ✅ r3 **T14.** Measurement: a held-out "fresh" score for tickets saved after 2026-11-09 (printed, never ratcheted,
  never tuned against); `asSaved` is ratcheted; the stored answers are held to the route's model; the prompt hash now
  covers every word of the prompt; unmarked tickets score sizing stock against what he saved.
- ✅ r3 **T15.** `apply-aimeta.mjs`: a timestamped backup that cannot be overwritten, `--restore`, and a refusal when
  the live aiMeta is not what the proposal was measured against.
- **T16.** Count how often a rule-added line is removed at the counter, per rule (log which rule added each line; the
  save already records the outcome). This is the only honest test of a ruling — rhodium above all — and replaces most
  hand-marking.
- ◐ r4 (see A2) **T17.** The production counter (= A2, S12): still per attempt, still no rate, still silent on failed calls.
- **T18.** Live catalog drift: the prompt hash is over `catalog.json`, not production. Record a catalog hash in each
  log entry so an aiMeta edit in the admin shows up.
- ✅ r4 (the classic form shows the same warnings and checks, from the same component) **T19.** The classic form (`?ui=classic`) shows none of the warnings, chips or checks. Delete it or wire them in.
- **T20.** The chips still tick values built from form state ("✓ 925"); the tick should mean "the note said it".
- ✅ r4 (`unpairedWidthTasks`; `taskRoles.problems` carries `shankWidth`; the counter is warned when the task on the ticket is one of them. Warning in Admin → Tasks at the moment of the rename is still S13) **T21.** The width rule still fails silently if a banded task is renamed ("under 3mm"). Warn when a task that looks
  banded has no sibling (with S13).

**U — from the round 3 sweep** (`docs/goals/smart-intake-reviews/r3-sweep.md`)

- ✅ r4 **U1.** Width was wrong both ways again: a stone's millimetres after "ring" made the shank wide ("ring 5mm cz
  missing"), and real widths were missed ("comfort fit 6mm", "shank 4x2", "five millimeter band"). `shankWidthSaid` now
  gives three answers — wide, nothing, or UNCLEAR. Unclear swaps nothing either way: the model's pick stays and the
  jeweler is asked to check. The next word after a measurement is what was measured.
- ✅ r4 **U2.** "14ky" / "10kw" (karat with its colour on) slipped past the karat-as-size guard, and was not read as the
  note naming its metal or colour. See O6 for the one real ticket this changes.
- ✅ r4 **U3.** Per-piece counts: "laser weld on 1", "the second ring", "one only" are different work per piece (nothing
  multiplied). A line whose count is above the piece count is still left alone, but the warning now names it and says
  so — and asks, when the note says "each", instead of claiming everything was counted N times.
- ✅ r4 **U4.** Nothing dropped silently: a size the parser cannot read ("6-1/2 US") is said; a quantity like "4 prongs"
  is 4; `taskId`/`qty` keys are read; Solder Together says when it changed the count and marks the line "ruled".
- ✅ r4 **U5.** The checks were on the wrong screen. Metal and sizes are edited on Review, where the save is; the checks
  showed on Work only. One component (`IntakeChecks`) now shows on Work, on Review above the save, and in the classic
  form.
- ✅ r4 **U6.** A second read turned "(assumed) yellow" into a tick. The assumed colour is remembered until a person
  changes it.
- ✅ r4 **U7.** The checks looked one way only. Added: the sizing task against the direction the sizes go (6 → 5 with
  Size Up on the ticket), and a task made for another metal even when nothing resolves by name. The stock message no
  longer says "sizing up -1 sizes".
- ✅ r4 **U8.** A hand line the sentence counts differently is kept and said. Stock is not added when the size-up line
  it belongs to was deleted. A count he changed loses the "from your sentence" tick at once.
- ✅ r4 **U9.** Measurement honesty: the headline is labelled a fit, not a forecast; the fresh line compares as-saved
  with as-saved; the "logged" run is described as what it is. `apply-aimeta.mjs` restores by `_id`, and the `--env`
  file's database beats one left in the shell. The photo route reads `INTAKE_MODEL`.
- **U10.** Hold the model's own numbers against the sentence, warning only: "retip 4 prongs" answered 40; "18k"
  answered 14k. Needs a model error to trigger; not seen in 79 intakes.
- **U11.** Sizing stock matching ignores colour when materials are NAMED by colour (white-gold aliases include plain
  "gold"). The live materials list names no metal, so this is latent. Check when a colour-named stock is added.
- **U12.** `generate-ai-meta/route.js` asks for customer speech for a chatbot, so every new task gets aiMeta that
  argues with the rulings. Rewrite its prompt in jeweler shorthand (with D1).
- **U13.** `--update` should take a one-line reason written into `score.json`; a monthly reminder to export and
  re-run the model. The scheduler matters more than more tests.
- **U14.** A store's POST can price a line whose `_id` is not in the catalog from the line itself
  (`repairLines.js`). Outside smart intake; needs its own look — it is a guard-the-sink question.

**V — from the round 4 sweep** (`docs/goals/smart-intake-reviews/r4-sweep.md`)

- ✅ r5 **V1.** Width overrode a correct model pick under a false reason ("5mm flat band", "wide comfort fit band" →
  narrow) and upgraded on someone else's band ("she wears it with a wide band", "center stone is 5mm wide"). The code
  now overrides the model ONLY when the note is plain; any other mention of a width is "unclear": the pick stays and
  he is asked. Curly apostrophes are read.
- ✅ r5 **V2.** A wide platinum shank: there is no 3–5mm platinum size-up, and the width was dropped without a word.
  Now said. (Whether there should BE such a task is the owner's — see O7.)
- ✅ r5 **V3.** A sizing task with no sizes and no direction in the note ("ring size to a 7" → Size Down) is called a
  guess.
- ✅ r5 **V4.** "No work was matched from this note" is said when nothing was matched. A count on a whole-piece task
  ("check and tighten 5 stones" ×5) is questioned.
- ✅ r5 **V5.** Sizing stock left on a ticket with no size-up line (after "Switch it" to Size Down, or a deleted
  size-up) raises a "Remove it" check.
- ✅ r5 **V6.** The sizes change and no sizing task is on the ticket: a check, with "Add size up/down". The server's
  "Added Size up" is no longer shown for a line the form did not put back.
- ✅ r5 **V7.** Two rings going to different sizes ("one 6 to 8 and one 5 to 9") are not multiplied; he is told to
  check each line. The form still holds one size pair (S17).
- ✅ r5 **V8.** A gold karat the note never said ("gold ring" answered 14k) shows as "(assumed)", like the colour.
- ✅ r5 **V9.** Sizes he edited after a read survive a re-read, and the difference is said.
- ✅ r5 **V10.** Failed AI reads write a log row and are counted on the admin page; the form's metal is logged with
  each read.
- **V11.** Named work that got no line when OTHER work did ("set stones" dropped from a three-job note). Needs either
  a list of work words (declined, below) or the model to say what it left out — a prompt change, so a model re-run.
- **V12.** The replay does not send what production sends (no form metal, catalog in id order). Now that the form's
  metal is logged, the next fixture export can carry it.
- **V13.** Split the trend into "an AI line was removed or its quantity changed" against "he only added" (18 of 29
  changed tickets are additions).
- **V14.** Fail the replay on a mark that points at a superseded attempt (4 of 32 do).
- **V15.** "pt" as points ("set 3 pt diamond") can be read as platinum and override the form. Suspected only.
- **V16.** The classic form: no "(assumed)" markers, no per-line chips, checks far from Save. Retire it (T19 wired
  the checks in; the owner decides whether it goes — see O8).

**W — from the round 5 sweep** (`docs/goals/smart-intake-reviews/r5-sweep.md`)

- ✅ r6 **W1.** Width shorthand was read as "no width" and the wide pick downgraded: "5x2", "3-5" (the owner's own
  phrase), "3 to 5 shank", dictated "four and a half millimeters", "heavy mens ring". All are now wide or unclear,
  never nothing. The default's warning no longer claims "no wide shank was stated" — it says no width was READ, and
  to switch it if the shank is over 3mm.
- ✅ r6 **W2.** The piece warning names every line that carried a count of its own — raised, left, or equal to the
  piece count ("is 2 — check whether that is 2 in all or 2 on each piece").
- ✅ r6 **W3.** Sizing beads to make a ring fit smaller no longer get a Size Down added. "No rhodium" in the note is
  honoured. The solder warning says what to do if these are separate repairs.
- ✅ r6 **W4.** A karat the note never named no longer replaces the one on the form (server and form), and a metal he
  corrected after a read survives a re-read, with the difference said — as sizes already did.
- ✅ r6 **W5.** A 3-to-5mm size-up with 3x2 stock (or the reverse) is flagged by the stock check.
- ✅ r6 **W6.** A line he deleted that the sentence asks for again is still not put back, and now that is said.
- ✅ r6 **W7.** The rhodium check says one is added when nothing counts the pieces. Review's metal row carries
  "(karat assumed)" / "(colour assumed)".
- ✅ r6 **W8.** Odd model answers: "gold plated" is not platinum; a karat is 8–24; "2 sizes" is 2.
- **W9.** The checks do not gate the save; on a phone they are at the top of Review and the save bar is at the
  bottom. Put the open-check count in the save bar. (A two-tap "Save anyway" is the owner's — O9.)
- **W10.** Edit mode: if saved lines keep `__aiQuantity`, a new read on an existing ticket may drop them. Suspected;
  check what the save stores.
- **W11.** The engine may price a 10k ring with 14k stock by substitution, and the line does not show it. Outside
  smart intake — pricing; needs its own look.
- **W12.** Measurement, again: flag each new repair "used smart intake / AI failed / not used" (a failed read
  returns no log id, so the hand-typed ticket never joins the trend); one `intake:refresh` command and a committed
  history of the fresh score; ratchet rates, not counts; export `formMetal`; store sizing stock in the outcome.
- **W13.** Length caps on the note and the client's task list (= F2).

**X — from the round 6 sweep** (`docs/goals/smart-intake-reviews/r6-sweep.md`)

- ✅ r7 **X1.** A stone-weight tier picked when the note gives no weight is questioned (the real "remove and reset
  stone" ticket came back as the under-half-carat tier, silently).
- ✅ r7 **X2.** A count over 1 that the note does not say is questioned ("retip prongs on 6 prong head" answered 4; a
  task the model names twice arriving as ×2).
- ✅ r7 **X3.** Width: "5mm x 2mm" and "5 by 2 shank" are the shank; "4mm ring guard" and "wife has wide band" are
  not; "size 3 to 5 band" is a size move.
- ✅ r7 **X4.** "No rhodium" in the words it is said in: "does not want rhodium", "rhodium not needed", "no replate".
- ✅ r7 **X5.** A metal the note never named (silver read off the photo text) is "(assumed)", with its purity, on
  the chips and on Review.
- ✅ r7 **X6.** His sizes and metal stand when the AI goes down, and an edit made while a read is in flight is not
  undone: "kept" is decided against the live form.
- ✅ r7 **X7.** Rule-added rhodium follows the sizing line's count (a check, "Make it N").
- ✅ r7 **X8.** `__aiQuantity` is no longer saved with the ticket, so a read on a reopened ticket does not take the
  saved lines for its own. An empty task list says so.
- ✅ r7 **X9.** Every read logs a hash of the instructions and task list it was made with (`input.promptHash`).
- ◐ r8 (the route and the replay now hash with ONE function, `intakePromptFingerprint`; they still differ in practice until the form sends the task list in the fixture's shape and order) **X10.** Use it: split the admin trend by `promptHash`, and show a drift alarm when the live catalog's hash is not
  the one the replay measured.
- **X11.** "Closest task" picks ("hard solder" → Break in chain) carry no mark. Wants the model to say when a pick is
  a stretch — a prompt change — or the aiMeta fix (D1).
- **X12.** A sizing task the server calls a guess still shows the "from your sentence" tick. A hand-set stock
  quantity is replaced on a re-read.
- **X13.** A metal-only task with no general sibling is dropped silently on another metal (invented task; today's
  four platinum tasks all have siblings).
- **X14.** Stores see "fix the task names in Admin → Tasks", which they cannot act on.
- **X15.** One-tap "AI was wrong / my call" on changed rows in the admin log, in place of hand-edited marks.

**Y — from the round 7 sweep** (`docs/goals/smart-intake-reviews/r7-sweep.md`)

- ✅ r8 **Y1.** The count check was satisfied by any matching digit: "retip prongs on 6 prong head" answered ×6
  passed. Karats, size moves, "N prong head" and millimetres are taken out of the note before it is searched.
- ✅ r8 **Y2.** White gold written "w/g" lost to an ASSUMED yellow on a re-read, and the rhodium went with it. "w/g",
  "y.g.", "wht" are read as colours, and an assumed karat, colour or metal is no longer sent back as "what the form
  knows".
- ✅ r8 **Y3.** "pick up friday" no longer counts as a sizing direction. "band is not wide" is not wide; "to match
  her wide band" is hers.
- ✅ r8 **Y4.** A stock quantity he set by hand survives a re-read, as task quantities do, and loses its tick.
- ✅ r8 **Y5.** The AI goes down on a ring whose sizes the fallback cannot read: the sizes the last read set stay,
  so the "no sizing task" check can speak.
- ✅ r8 **Y6.** A corrected piece count names the other lines still at the old count (a check, no button).
- ✅ r8 **Y7.** An `Added "X"` note goes when X is no longer on the ticket.
- ✅ r8 **Y8.** The save bar on Review says how many checks are open at the top of the page. It does not hold the
  save (O9).
- **Y9.** Review still shows "3 · $185.00" and not the lines (= E2, S14). The largest thing left on the form.
- **Y10.** The checks read task titles (`isSizeUpTask`, the width regexes): a rename of a live task turns the stock
  and direction checks off at the form, as it does the rulings at the server (= C1, S13).
- **Y11.** A wide task with narrow stock has a check with no "Switch stock" button.
- **Y12.** Tasks the model takes from the photo's description are ticked "from your sentence".
- **Y13.** The model: `gemini-2.5-flash` will be retired. An env override, a reminder, and a replay run after any
  swap — every ruling here was tuned to this model's habits. The aiMeta generator still hard-codes its own model
  and still asks for customer speech (= U12).
- **Y14.** "Today" is UTC and the model is not told the weekday (= F4).
- **Y15.** Measurement (= W12, X15): a one-tap "AI wrong / my call" at save when tasks differ from the suggestion;
  log what the form actually showed, after the browser's steps; a log id on failed reads; photo failures; a CI guard
  on `score.json` and on marks.

**Z — from the round 8 sweep** (`docs/goals/smart-intake-reviews/r8-sweep.md`) — NOT fixed: round 8 was the cap

*In the order they should be done. The first two were introduced by this loop; they were fixed after the close.*

- ✅ 2026-11-10, after the close (the rhodium check reads the note for "no rhodium"; the sizing check stands down for sizing beads to fit smaller) **Z1. Two checks contradict the server's own decision (introduced in rounds 6–7).** After "no rhodium"
  the ticket is right, and a standing check still says "White gold gets rhodium… [Add rhodium]". After sizing beads,
  a check offers [Add size down]. Each puts "1 check is open" beside Save on a correct ticket, one tap from an
  over-charge. Fix: the form must know the read left the line off on purpose (carry it in the read's notes) and not
  raise the check.
- ✅ 2026-11-10, after the close (the `_smartIntake*` markers are stripped from materials at save) **Z2. A reopened ticket loses its saved sizing stock on a new read.** The save strips `__aiQuantity` from tasks
  but leaves `_smartIntakeHintType` on materials. Strip the `_smartIntake*` markers from materials at save.
- **Z3.** Someone else's band given as a measurement ("wears with 4mm band", "to match her 5mm wedding band") is
  read as this ring's width, with no warning. Apply the not-this-band guard to measurements → unclear.
- **Z4.** A two-tone ring ("yg ring with wg head") gets no rhodium and no warning. Warn when the note names two gold
  colours.
- **Z5.** Any line the model returns is ticked "from your sentence", and a current size the note never gave
  ("size to a 7" answered 5 → 7) is taken as said. Tick only what the note backs: a size whose number is not in the
  note is "assumed"; for tasks, have the model return the words it matched (a prompt change, so a model re-run).
- **Z6.** Warning fatigue: 25 of 69 real notes come back with a warning, 6 of them the routine "3x2 default" line,
  which exists because one sentence of live aiMeta steers the model to the wide task. This is D1's strongest case.
- **Z7.** Flat-priced tasks: clamp to one per piece instead of only warning. "no plating", "no rh", "declined
  rhodium". "size one", "the smaller" near the sizing words: do not multiply the sizing. Past promise dates.
- **Z8.** The stock check has no "Add N" button when there is no stock line (sizes typed after a read with none —
  the commonest sizing flow). Stale notes other than "Added…" ("2 pieces: …"). A matched task dropped at metal
  alignment is not said. The read's info notes are not counted in the save-bar line.
- **Z9.** The apply script: a `--db` flag so it can be rehearsed on DEV, a restore dry run, a null-aiMeta check
  (Glue Pearl), and keep the backup outside a worktree.

**F — hardening, small**

- **F1.** Timeouts: worst case 94s against a 90s function limit; cap the total at 30s, cap `Retry-After`, retry 503.
- **F2.** Cap `inputText` and `tasks` size; send the key in a header.
- **F3.** Photo prompt says "the ring" for every item; a phone photo over ~4.5MB fails with an unguarded JSON parse.
- **F4.** "Today" is UTC, so "tomorrow" is a day off in the US evening.

## Owner questions (do not decide these)

- **O1 — multi-size size-up. ANSWERED 2026-11-09.** Owner: *"1.25 sizes is charged as 2"* and *"2 sizes up is 1x
  task and 1x sizing stock material."* The rule: the size-up task is always ×1; it covers the first size; sizing stock
  = (sizes moved, rounded up) − 1. So 5→7 = task ×1 + stock ×1; 4.75→6 = task ×1 + stock ×1; 8.5→12.25 = task ×1 +
  stock ×3. This is what has been live since #336. Saved tickets that differ (task ×2, stock ×8, no stock) were breaks
  or hand entries, not the rule.
- **O2 — photo descriptions. ANSWERED 2026-11-09.** Owner: *"The image description is trash, need to be better and we
  don't use the descriptions at all, just rely on images."* So "76 saved, none edited" meant nobody reads them, not
  that they are right. They still print as the customer-facing description. Backlog G1.
- **O3 — "solder together". ANSWERED 2026-11-09.** Owner: *"Solder Together is per ring. 2 rings is 1x task. 3 rings
  is 2x tasks."* The quantity is the number of joins: rings − 1. It is NOT a piece count (B0 does not apply to it).

- **O4 — rhodium on white gold. ANSWERED 2026-11-09, twice.** Owner: *"yes all white gold get rhodium"*, and again when
  shown that he saved it on only 6 of his 12 white gold tickets: *"All wg gets rhodium."* So it is every white gold
  job — rings, bracelets, laser welds, customer-supplied gold — and the six tickets saved without it were misses, not
  a different rule. The marks that add rhodium stand.
- **O5 — a pair of earrings.** Is a pair one piece or two? "14k white gold earrings set with stones over 1 carat,
  2 times" was saved as Set Stone ×2 + Rhodium ×1; "14k yellow gold earrings, laser weld" as Laser Weld ×2. The model
  is told a pair is one piece unless the note counts them. (Opened round 1.)
- **O6 — "Size 10KY to an 8".** A store typed this on 2026-10-10 and the ticket was saved as size 10 → 8, 10k yellow.
  Read literally, "10KY" is the karat and the ring's current size was never said. From round 4 the current size is
  left BLANK with a warning ("Size 10 looks like the karat"); the Size Down the model picked stays. Is that right — or
  when a store writes it that way, is the ring really a 10? (This is the one replay ticket round 4 made worse on
  purpose: sizes 69 → 68.)
- **O7 — wide platinum shanks.** The catalog has Size Up for platinum but no 3mm-to-5mm version, so a wide platinum
  band is priced as a narrow one. Smart intake now says so on the ticket. Should there be a wide platinum size-up
  task, or do you price those by hand? (Opened round 5.)
- **O8 — the classic repair form** (`?ui=classic`). It now shows the same checks, but none of the "(assumed)" or
  "from your sentence" markers. Does anyone still use it, or can it be removed? (Opened round 5.)
- **O9 — should an open check hold the save?** Today a check (rhodium missing, stock does not match the sizes, wrong
  metal's task) is a warning with a one-tap fix, and the ticket can be saved past it. A reviewer suggested a
  two-tap "Save anyway" while any check is open. That slows the counter on purpose. Your call. (Opened round 6.)
- **O4, a third time.** Three reviewers in a row have pointed at the same number: of your 12 white gold tickets, 6
  were saved with rhodium and 6 without. You have said twice that all white gold gets it, and the rule follows that.
  From round 6 a note that says "no rhodium" is honoured. Nothing else changes unless you say so.
- **D1, the reason to say yes (round 7).** A reviewer read the live text on "Size up (1 size)": it tells the AI not
  to use that task "if more than one size up is needed". That is why the AI picks the 3–5mm task on every multi-size
  job, and why you see a width warning on nearly every one of them. Warnings that fire every time get ignored. The
  prepared rewrite fixes that line. It still cannot be PROVEN on the saved tickets (it was written from them), so
  the honest plan is: apply it, then watch the admin trend, which from round 7 can tell reads made before and after.
- **D1, updated round 4.** The round 3 evidence reviewer measured the aiMeta proposal against the fixtures: 20 of its
  49 symptom phrases are word-for-word from the tickets it is scored on, so the replay cannot show that it helps —
  only that it does no harm (65/69 against 64/69, inside the noise). Recommendation: do not apply it yet. Refresh the
  fixtures in 2–3 weeks and measure it on tickets saved after 2026-11-09. Still the owner's call.

## Declined

*(findings a round chose not to act on, with the reason)*

- **Changing the sizing stock to match two saved tickets** (round 6: "5 to a 7" saved as task ×2 + stock 2;
  "8.5 to 12.25" as ×2 + stock 8). The owner ruled on 2026-11-09 — "2 sizes up is 1x task and 1x sizing stock
  material" — and said the saved size-ups were breaks and not ground truth. The ruling stands.
- **Spelled-out karats ("18 carat", "stamped 750"), validating the client-sent catalog, the prefilter, a dollar
  replay, an LLM judge** (round 6 reviewers' own "not worth doing").

- **Telling a join from a break for Solder Together** (round 5: "2 rings, both shanks broken, solder back
  together" → ×1). It needs a list of break words read by a regex. The warning now says what it did and what to do
  if these are separate repairs.
- **Classic-form parity, two size-up lines on one ticket, protecting hand sizes when the AI is down, guarding
  marks.json, a transactional apply, an LLM judge** (round 5 reviewers' own "not worth doing").

- **An "uncovered work" check built from a list of work words** (round 4 server reviewer). It is another word list
  read by a regex, the thing rounds 1–3 kept getting wrong. The plain case — nothing matched at all — is said (V4);
  the partial case is V11 and wants the model to report it.
- **Blocking the save on a check, the in-flight delete race, colour-aware stock matching while the live materials
  name no colour, more width vocabulary, retry tuning, significance tests** (round 4 reviewers' own "not worth doing").

- **Multiplying a count by the pieces when the note says "each"** (round 3 server reviewer: "retip 4 prongs on each"
  of 2 rings should be 8). Tried in round 4 and taken back the same hour: the model sometimes answers with the total
  already, and 16 is worse than 4. The line is left and the warning asks.
- **`responseSchema`, `thinkingBudget: 0`** (round 3, again). Either changes what the model answers on every ticket,
  for a failure — a mis-keyed field — that has not happened in 79 intakes and is now read anyway (U4).
- **Photo scoring, dollar-weighted scoring, covering all 32 tasks, statistics on n=69, automating marks, a role field
  for a 32-task catalog, more piece-count regex, re-running the rulings on save** (round 3 reviewers' own "not worth
  doing").

- **Read the item description for a wide shank** (round 0 review: "a wide band described there is downgraded").
  Reversed in round 2: the description is usually written by the photo model, and round 1's sweep showed "band is
  thick" in such a description keeping the 3–5mm task. The owner's rule is "unless specified", and he called the
  descriptions "trash". Width is read from the jeweler's sentence only.
- **Response schemas, the over-80-task prefilter, retry tuning, "585" karats, hardening the client-sent task list**
  (round 1, server reviewer's own "not worth doing").
- **A photo replay with stored images, variance statistics, a bigger dashboard** (round 1, evidence reviewer's own).
- **Trusting the sentence regex alone for the piece count** (round 1 built it as a backstop "so 2 rings never depends on
  the model"). Reversed in round 3: it multiplied a ticket in every review. Agreement between the model and the
  sentence is now required. The cost is known and accepted: when only one of them counts the pieces, the ticket is not
  multiplied and the jeweler is told instead.
- **Re-running the rulings on save, per-piece size fields, a task role schema, response schemas, UK sizes, the
  timezone** (round 2 reviewers' own "not worth doing").
- **Scoring every mark against the saved ticket instead of the rulings.** Kept both numbers instead: the owner said
  on 2026-11-09 that saved size-ups were breaks, so "what he saved" cannot be the target — but it is printed.

## Reviewer briefs

Give each reviewer its brief verbatim and nothing else. Each is read-only, may run tests and throwaway scripts outside
the repo, must separate **demonstrated** from **suspected**, give file:line evidence, stay under 900 words, and end
with the three findings it is most confident matter. Each answers the same three questions: **what will make this
fail within 6 months, what is it doing right, what should change (and what is not worth doing).**

- **Server and model** — `src/app/api/ai/parse-smart-intake/route.js`, `describe-item-image/route.js`, their tests,
  `src/lib/aiAccess.js`, `src/services/ai/`, and wherever task `aiMeta` is defined, authored or generated. Try to break
  the deterministic helpers with adversarial task titles, quantities, sizes and catalogs.
- **From the model's answer to the saved, priced ticket** — `src/hooks/repairs/useSmartIntake.js`,
  `newRepairFormHelpers.js`, `useNewRepairForm.js`, `src/services/repairs/smartIntakeExtractors.js`, `spokenIntake.js`,
  `metalTaskFilter.js`, the intake UI in `src/app/components/repairs/NewRepairFlow*.js`, how a suggestion becomes a
  priced line (`src/services/pricing/`), and what `src/app/api/repairs/route.js` re-checks on save.
- **Evidence, measurement and upkeep** — `src/services/ai/smartIntakeLog.js`, the admin log page, the replay and its
  fixtures, the quality of the `aiMeta` text in the catalog fixture, and whether one busy person can keep this right
  for years. Give counts computed from the fixtures, not adjectives.

Describe the feature to them in two sentences and give no opinion of it. Do not tell them what earlier rounds found.

## Round log

*(newest first: date, PR, what was fixed, replay score before → after and which mode, what the sweep found, what was
declined, what is waiting on the owner)*

### Final summary — the loop is closed — 2026-11-10

**Stopped on** the second condition in "When to stop": *"Round 8 is finished. That is a cap, not a target. Say what
is still open."* NOT on the quiet-rounds condition: every one of the eight sweeps
demonstrated at least one wrong line with nothing true on screen, so the loop never had a quiet round. It was still
finding things when it stopped — fewer, narrower and further from the price each time.

**What the eight rounds did.**
- Rounds 1–3 moved the score: 39/63 → 58/63 → 66/69 against the rulings. Those were the code putting wrong lines on
  tickets: rhodium ×14, white read as yellow, stock from the model's arithmetic, a ticket multiplied by a prong count.
- Rounds 4–8 moved no saved ticket. They closed cases the 69 tickets do not contain, mostly by making the screen say
  when it is guessing: the checks at the save, "(assumed)" on what nobody said, his hand kept across a re-read, a
  question on every pick the note does not back.
- What three independent sweeps in a row could NOT break: sizing stock arithmetic, the piece-count multiplication,
  the direction of a sizing task, karat-as-size and the other size guards, an invented task id, a catalog rename
  (it warns), and anything the browser sends as a price.

**What is still wrong, in order of what it costs.**
1. ~~Z1 and Z2 — introduced here, live.~~ Fixed on 2026-11-10 after the close, outside the loop's order, as "When to
   stop" allows for a break in production ("fix that first, outside the loop's order"). No sweep has reviewed that fix.
2. The three tickets the model still gets wrong are all the task descriptions (D1), and one sentence of that text
   causes the commonest warning on the screen (Z6). The rewrite is prepared and has never been applied.
3. The score is a fit to 69 tickets, 26 of them hand-marked the day the rules were written. There is no held-out
   ticket. Nothing here predicts next month until the fixtures are refreshed with tickets saved after 2026-11-09.
4. Nothing notices if the live prompt or Google's model changes. The log now records a prompt hash on every read;
   nothing reads it yet (X10).
5. No screen this loop changed has been opened in a browser, and `npm run views` was never run.

**The next thing worth doing is not a ninth round of rules.** It is, in this order: open the intake
screens once in a browser; answer D1; then leave it alone for two or three weeks, refresh the fixtures
(`node scripts/intake/export-logs.mjs`, then `npm run intake:replay -- --model`), and read the FRESH line. That
number, and not 66/69, says whether any of this worked.

**Waiting on the owner.** O5, O6, O7, O8, O9, D1.

### Round 8 — 2026-11-10 — `claude/smart-intake-r8` — the cap

**Round 7's sweep** (`docs/goals/smart-intake-reviews/r7-sweep.md`). For the first time the reviewer who drives the
form reported: "I could not reach a wrong line or quantity with nothing true on screen." Every wrong state it
produced had a true warning or check beside it. The evidence reviewer found no wrong price and no lost data, for the
fifth sweep running. The server reviewer's harness failed and it reported hand traces only; the loop ran four of
them, and three class-(a) cases reproduced (a count backed by an unrelated digit; "w/g" losing to an assumed yellow
on a re-read; "pick up friday" silencing the direction warning). So round 7's sweep was not quiet either. Triage:
Y1–Y15.

**Fixed.** Y1–Y8 (see Backlog), and X10 in part. New in code: `saysCount` strips what is plainly not a count; the
form no longer sends assumed values as its metal; `_smartIntakeQuantity` on the stock line; the `piece-count`
check; `stillTrue` for stale notes; the open-check count in the save bar; `intakePromptFingerprint`.

**Score** (69 tickets, 2 skipped; the stored model answers — the prompt did not change):

| | Before any work | End of round 1 | End of round 3 | End of round 8 |
|---|---|---|---|---|
| vs the rulings — same tasks and quantities | 39 / 63 | 58 / 63 | 66 / 69 | **66 / 69** |
| vs what he saved | — | — | 45 / 69 | **45 / 69** |
| Sizes · metal · sizing stock | — | — | 69 · 69 · 69 | **68** · 69 · 69 |
| Fresh tickets (saved after 2026-11-09) | — | — | none yet | none yet |

**The score has not moved since round 3.** Rounds 4–8 changed no ticket for the better; one (sizes, "Size 10KY to an
8") was made worse on purpose and is Owner question O6.

**Local gate.** `npm test`: 279 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: never run in this loop (H5). **No screen changed in rounds 1–8 was ever
opened in a browser**; they are covered by hook and render tests only.

**Round 8's sweep and the loop's close** are written below this entry once the sweep has reported.

**Round 8's sweep** (`docs/goals/smart-intake-reviews/r8-sweep.md`) — recorded and triaged (Z1–Z9), not fixed.
The server reviewer ran everything this time and found two class-(a) cases on today's catalog (another ring's band
given as a measurement; a two-tone ring with no rhodium) and could not break anything else. The form reviewer could
not get a wrong stock quantity, direction, rhodium or metal price past a true check through hand edits, re-reads or
an AI failure; what it found is where the screen vouches for the model's own word (a tick on any line; a size the
note never gave). It also found two checks this loop introduced that fire on a correct ticket (Z1). The evidence
reviewer found no wrong price on a saved ticket and no lost data, for the sixth sweep running.

**Waiting on the owner.** O5, O6, O7, O8, O9, D1.

### Round 7 — 2026-11-10 — `claude/smart-intake-r7`

**Round 6's sweep** (`docs/goals/smart-intake-reviews/r6-sweep.md`) again demonstrated class-(a) cases: on two REAL
tickets the model's pick is wrong with nothing said (a stone tier with no weight in the note; "hard solder" matched
to Break in chain); a count nobody said, ticked; silver guessed onto a blank form, ticked; "5mm x 2mm" read as no
width; an edit made during a slow read undone; rhodium not following a corrected piece count. The arithmetic — the
piece count, stock, direction, the size guards — held for the third sweep running. The evidence reviewer found no
wrong price from code and no lost data. Triage: X1–X15, a reason added to D1, two entries under Declined.

**What changed in kind.** The earlier rounds fixed places where the CODE put a wrong line on the ticket. What is left
is the MODEL's own pick being wrong, which no rule can correct without knowing the answer. Round 7's answer is to
hold each pick against the note and ask when the note does not back it: a tier with no weight, a count with no
number, a metal with no name.

**Fixed.** X1–X9 (see Backlog). New in code: `smartIntakeNotes.js` (`ticketNotes`, `saysNoRhodium`); the width
reader takes "N unit x N unit" and "N by N"; `assumed.metal`; the keep decision moved inside the state update;
the `rhodium-count` check; `input.promptHash` on every log row.

**Score** (69 tickets, 2 skipped; the stored model answers — the prompt did not change):

| | End of round 6 | End of round 7 |
|---|---|---|
| vs the rulings — same tasks and quantities | 66 / 69 | **66 / 69** |
| vs what he saved | 45 / 69 | **45 / 69** |
| Sizes · metal · sizing stock | 68 · 69 · 69 | 68 · 69 · 69 |
| Fresh tickets (saved after 2026-11-09) | none yet | none yet |

**The score did not improve by a ticket**, for the fourth round running. Of the three tickets still wrong, two now
carry a true warning (the stone tier; "No work was matched" on the earrings). The bangles ticket still does not.

**For the stop condition:** no quiet round yet — every sweep so far has demonstrated at least one wrong line with
nothing on screen. Round 8 is the cap.

**Local gate.** `npm test`: 279 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: not run (H5). The form changes were **not opened in a browser**.

**Waiting on the owner.** O5, O6, O7, O8, O9, D1.

### Round 6 — 2026-11-09 — `claude/smart-intake-r6`

**Round 5's sweep** (`docs/goals/smart-intake-reviews/r5-sweep.md`) asked each reviewer to class what it
demonstrated. Class (a) — a wrong line with nothing true on screen — still turned up six times: width shorthand
read as "no width" ("5x2", "3-5"); a per-piece count with no line in the warning; a guessed karat replacing a
hand-picked one; a re-read undoing a corrected metal; a wide size-up left with 3x2 stock; a deleted line silently
not put back. The server reviewer could not break the piece count, the size guards, the direction swap or any
catalog rename. The evidence reviewer again found no wrong price and no lost data. Codex did not finish its review
of #349; it was merged on the green build. Triage: W1–W13, O9, a third note on O4, two entries under Declined.

**Fixed.** W1–W8 (see Backlog). New in code: `smartIntakeVocabulary.js` (split for the line limit); the width
reader treats bare `NxM`, "3-5" and "heavy … ring" as unclear; `keepMetal` beside `keepSizes`; the stock check's
width; "no rhodium".

**Score** (69 tickets, 2 skipped; the stored model answers — the prompt did not change):

| | End of round 5 | End of round 6 |
|---|---|---|
| vs the rulings — same tasks and quantities | 66 / 69 | **66 / 69** |
| vs what he saved | 45 / 69 | **45 / 69** |
| Sizes · metal · sizing stock | 68 · 69 · 69 | 68 · 69 · 69 |
| Fresh tickets (saved after 2026-11-09) | none yet | none yet |

**The score did not improve by a ticket**, for the third round running, and no ticket flipped. Everything fixed
since round 3 has been a case no saved ticket contains.

**For the stop condition:** three rounds without a better score, each after a sweep that demonstrated wrong-price
bugs. Still no quiet round. Two rounds remain before the cap (round 8).

**Local gate.** `npm test`: 279 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: not run (H5). The form changes were **not opened in a browser**.

**Waiting on the owner.** O5, O6, O7, O8, O9, D1.

### Round 5 — 2026-11-09 — `claude/smart-intake-r5`

**Round 4's sweep** (`docs/goals/smart-intake-reviews/r4-sweep.md`) demonstrated wrong tickets again, fewer and
narrower: width still overriding a correct model pick ("5mm flat band"); sizing stock left behind after a switch to
Size Down; two rings with different sizes charged from one pair; a guessed karat shown with a tick; a re-read undoing
hand-edited sizes. The server reviewer could no longer break the piece count, the stock arithmetic, the size guards
or a catalog rename. The evidence reviewer found no wrong price and no lost ticket data. Triage: V1–V16, O7, O8, two
entries under Declined.

**The shape of the width fix**, since it is the fourth: the code no longer decides the width from the sentence
unless the sentence is plain. Every other mention of a width leaves the model's pick and asks. The earlier rounds
kept widening what the regex understood; this one narrows what it is allowed to overrule.

**Fixed.** V1–V10 (see Backlog). New in code: `shankWidthSaid` rewritten; `sizePairsSaid`; `withUnknownDirection`;
`withPlainSpeaking`; the orphan-stock and sizing-missing checks; `assumed.karat`; `keepSizes`; failed reads in the
log. `noteNames`/`karatsSaid` moved to `smartIntakeSaid.js` (line limit).

**Score** (69 tickets, 2 skipped; the stored model answers — the prompt did not change):

| | End of round 4 | End of round 5 |
|---|---|---|
| vs the rulings — same tasks and quantities | 66 / 69 | **66 / 69** |
| vs what he saved | 45 / 69 | **45 / 69** |
| Sizes · metal · sizing stock | 68 · 69 · 69 | 68 · 69 · 69 |
| Fresh tickets (saved after 2026-11-09) | none yet | none yet |

**The score did not improve by a ticket**, for the second round running; no ticket flipped either way. The three
misses are the same three, all aiMeta (D1).

**For the stop condition:** rounds 4 and 5 both failed to improve the score, but each followed a sweep that DID
demonstrate wrong-price bugs, so neither is a quiet round. Round 5's sweep decides whether the count starts.

**Local gate.** `npm test`: 279 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: not run (H5). The form changes were **not opened in a browser**; the hook and
the checks are driven in `useSmartIntake.test.jsx`.

**Waiting on the owner.** O5, O6, O7, O8, D1.

### Round 4 — 2026-11-09 — `claude/smart-intake-r4`

**Round 3's sweep** (`docs/goals/smart-intake-reviews/r3-sweep.md`) demonstrated wrong tickets again, so the stop
condition was not met: a stone's millimetres read as a wide shank and real widths missed (both under a warning that
said something untrue); "14ky" read as size 14 with no warning at all; per-piece wording; and — the largest — every
check built in round 3 was on the Work step, while the metal and sizes are edited on Review, where the save is. The
evidence reviewer demonstrated no wrong price, and showed that the headline score is a fit to the tickets the rules
were written on, with no held-out data. Triage: U1–U14 in the Backlog, O6 and an update to D1 under Owner questions,
three entries under Declined.

**Fixed.** U1–U9, T19, T21; A2/S12/T17 and S14 in part (see Backlog). New in code: `smartIntakeSaid.js` (the
sentence readers, split out when the rules file passed the line limit) with `shankWidthSaid`; `unpairedWidthTasks`;
`IntakeChecks.js` and `ticketCheckActions.js`, used by the stepped flow's Work and Review steps and by the classic
form; two more `ticketChecks`; `summarizeTickets` and its line on the admin log page.

**Score** (69 tickets in the tuning set, 2 skipped; the stored model answers from round 3 — the prompt did not change,
so the model was not asked again):

| | End of round 3 | End of round 4 |
|---|---|---|
| vs the rulings — same tasks and quantities | 66 / 69 | **66 / 69** |
| vs what he saved | 45 / 69 | **45 / 69** |
| Sizes · metal · sizing stock | 69 · 69 · 69 | **68** · 69 · 69 |
| Fresh tickets (saved after 2026-11-09) | none yet | none yet |

**The score did not improve by a ticket.** One ticket flipped, for the worse and on purpose: "Size 10KY to an 8" now
leaves the current size blank (O6). Nothing that was wrong became right: the three misses are still the reset stone
with no size said, the silver bangles, and the white gold earrings — all aiMeta, all waiting on D1. Recorded with
`--update`.

**For the stop condition:** this round's sweep (round 3's) DID demonstrate wrong-price bugs, so this is not yet one of
the two quiet rounds. If round 4's sweep demonstrates none, that is the first.

**Local gate.** `npm test`: 279 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: not run (H5). Review, Work and the classic form changed and were **not
opened in a browser** (no preview password); the Review step is rendered and clicked in
`NewRepairFlowIntakeNotes.test.jsx`. The classic form's new block has no render test.

**Waiting on the owner.** O5, O6, D1.

### Round 3 — 2026-11-09 — `claude/smart-intake-r3`

**Round 2's sweep** demonstrated wrong prices again, most of them in rules round 2 had just written: the piece count
still multiplying on a regex ("retip all 4", "broken in 2 pieces"); width wrong both ways ("wide white gold band"
downgraded, "5mm amethyst" upgraded); 6 → 14 passing the misread guard; a re-read undoing hand corrections; a failed
read leaving the old ticket; an older answer overwriting a newer sentence; the rulings not re-run when the metal is
changed after the read; and no held-out data behind the score. Record: `docs/goals/smart-intake-reviews/r2-sweep.md`.
Triage: T1–T21 in the Backlog, two items under Declined. The owner answered O4 again mid-round ("All wg gets rhodium").

**The lesson of this round, written down because it will recur:** three times a narrow regex was added to read
something the sentence "plainly says", and three times the next review broke it with ordinary shop shorthand. Round 3
stops adding cases and changes the shape: a regex may CONFIRM the model (piece count), or read only an explicit form
and otherwise stay silent (fallback sizes), or ask what a number is ABOUT instead of listing what it is not (width).

**Fixed.** T1–T15 (see Backlog). New in code: `withPieceCount` requires agreement; `statesWideShank` rewritten;
`MAX_SIZES_MOVED` 5 and the karat-as-size check; `normalizeMetalType`; `noteNames` behind `said`; `ticketChecks`
on the Work step; the form hook keeps the jeweler's hand across a re-read, ignores stale answers, and clears the
earlier read when the AI fails; `explicitRingSizes`; `TUNED_UNTIL` and the fresh score; `INTAKE_MODEL`. The prompt
moved to `smartIntakePrompt.js` (the rules file had passed the 400-line limit).

**Score** (69 tickets in the tuning set, 2 skipped; model mode, gemini-2.5-flash, temperature 0):

| | End of round 2 | End of round 3 |
|---|---|---|
| vs the rulings — same tasks and quantities | 64 / 69 | **66 / 69** |
| vs what he saved | 45 / 69 | **45 / 69** |
| Sizes · metal · sizing stock | 69 · 69 · 69 | 69 · 69 · 69 |
| Fresh tickets (saved after 2026-11-09) | — | none yet |
| Rules mode over the logged answers, vs the rulings | 61 / 69 | **60 / 69** |

Tickets that flipped. Model mode: two became right (the chain shortened to a bracelet; the silver ring set with three
stones); none that was right is now wrong. Rules mode over the LOGGED answers: one that was right is now wrong, on
purpose — "size from 8.75 to 7.25, Rhodium plating, 2 rings". The logged answer predates `pieceCount`, so only the
sentence counts the rings, and one voice no longer multiplies (T1). In model mode the model says 2 as well and the
ticket is right. Recorded with `--update`.

**Still wrong in model mode (3):** a reset stone with no size said (H3) · silver bangles "hard solder" → Break in
chain (H2; the D1 proposal fixes it) · white gold earrings "set with stones over 1 carat, 2 times" → no task (D1).

**Local gate.** `npm test`: 279 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: not run (H5). The Work step changed again and was again **not opened in a
browser**; it is rendered and clicked in `NewRepairFlowIntakeNotes.test.jsx`, and the hook's test file now has 21 cases.

**Waiting on the owner.** O5 (a pair of earrings: one piece or two — asked twice, explained with his two tickets), D1
(the aiMeta rewrite: prepared, dry-run only, 65/69 against 64/69 when measured — inside the noise).

### Round 2 — 2026-11-09 — `claude/smart-intake-r2`

**Round 1's sweep** found, demonstrated: the piece count misreading prongs and sizes as pieces; sizing never checked
against the sizes; width only going down; warnings computed and never shown; a second Analyze leaving stale lines;
stock not following a size edit; a confident wrong ticket when the AI is down; any material matching as sizing stock;
and a replay whose headline flattered itself. Full record: `docs/goals/smart-intake-reviews/r1-sweep.md`. Triage: S1–S17
in the Backlog, four items under Declined, O4 sharpened.

**Fixed.** S1–S11 (see Backlog), E1, E3, E4, E5. In code: `withCheckedSizes`, `withSizingTaskForSizes` (direction),
`withShankWidth` (both ways), `withPieceCount` (sizing = one per piece; different work per piece is not multiplied),
`withFormMetal`, `sizingStockFor` (one formula, server and form), `said` and `ruled` on the answer; the form hook
rewritten (`useSmartIntake.js`: a re-read replaces, the fallback reads metal and sizes only, only sizing stock matches
as sizing stock) with its first test file; `sizingStockCheck` on the Work step; "(assumed)" chips; "added by rule" on
lines. Model temperature 0. One prompt line added: no work named → no tasks.

**Prepared, waiting on the owner (D1).** `scripts/intake/aimeta-proposal.json` rewrites the aiMeta of 11 tasks in shop
shorthand. `node scripts/intake/apply-aimeta.mjs --env <file>` prints the before/after and writes nothing; it will not
write without `--apply --owner-said-yes`. Scored with `npm run intake:replay -- --proposal`: **65/69 against 64/69
live — inside the run-to-run noise (±2).** It fixed the silver bangles, the three-stone set and the earrings, and
two other tickets flipped the other way. So the honest claim is "no measured loss, and the text stops contradicting
the rulings", not "it scores higher". Not applied.

**Score.** The fixtures changed this round (six "no work was said" tickets are now scored as "suggest nothing"; one
went to skip), so the denominators moved: 63 → 69 scored, 8 → 2 skipped.

| | End of round 1 (63 tickets) | End of round 2 (69 tickets) |
|---|---|---|
| Model mode, vs the rulings — same tasks and quantities | 58 / 63 | **64 / 69** |
| Model mode, vs what he saved | not measured | **45 / 69** |
| Rules mode over the logged answers, vs the rulings | 55 / 63 | **61 / 69** |
| Sizes · metal · sizing stock (model mode) | 63 · 63 · 63 | 69 · 69 · 69 |

Whether any ticket that was right at the end of round 1 is wrong now could not be checked ticket by ticket: round 1
recorded only counts. From this round on score.json holds the passing tickets and the ratchet is per ticket. Model mode ran four times, plus one `--proposal` run; 64–66 across them.

**Still wrong in model mode (5):** a reset stone with no size said (H3) · silver bangles "hard solder" (H2, fixed by
the D1 proposal) · chain shortened to a bracelet: an extra Break in chain ×2 · white gold earrings "set with stones
over 1 carat, 2 times": no task (D1) · silver ring "set with three stones": no task (D1).

**Local gate.** `npm test`: 278 files pass; the same 3 production files cannot load `mongodb-memory-server` here.
`npm run lint`: clean. `npm run views`: not run (H5) — **this round changed two screens** (the Piece and Work steps
of the new-repair flow) and they were not looked at in a browser: signed-in screens need `E2E_PREVIEW_PASSWORD`,
which this session does not have. The hook and the helpers are tested; the JSX is covered by lint and the build only.

**Waiting on the owner.** O4 (rhodium: always or usually — the biggest gap), O5 (earrings), D1 (the aiMeta rewrite).

### Round 1 — 2026-11-09 — `claude/smart-intake-r1`

**Built.** The replay (A1): `scripts/intake/export-logs.mjs` (read-only export), fixtures under
`test/fixtures/smart-intake/` (79 saved typed intakes = 71 tickets, 77 photos, the 32-task catalog, hand-written
`marks.json`), `test/smart-intake/replay.test.js` (rules mode, in `npm test`, a ratchet on `score.json`),
`replay.model.test.js` (model mode, aborts on any API error) and `npm run intake:replay [-- --model] [-- --update]`.
The catalog guard (A3): `test/smart-intake/catalog.test.js`. All pure logic moved to
`src/services/ai/smartIntakeRules.js` behind one entry point, `decideIntake`, used by the route and the replay.

**Fixed.** B0 piece count (model's `pieceCount` or the sentence, whichever is larger; tasks, stock and rhodium per
piece) · B0b solder together = rings − 1 · B1 platinum counterpart must be the same job (`jobOf`) · B2 no regex date
fallback after an AI answer · B3 stock always computed, model hints ignored, none with the customer's gold · B4 one
ring-size parser (`parseRingSize`) · B5 `statesWideShank` reads the description and ignores stones and wear · B6 cap
raised to 6, with a warning · B7 duplicate lines merged, server and form · B8 "size 7 half shank" left alone · unknown
task ids dropped · the raw model answer is now logged (`output.raw`) so later replays are exact · "size up 2 sizes"
with no sizes said (`sizeChange`) now sizes and adds stock. Also: three inline styles hoisted in the customs
Images tab, which had pushed the inline-sx ratchet over its baseline on main.

**Score** (63 tickets scored, 8 marked unknowable; headline = same tasks and quantities):

| | Before this round | After |
|---|---|---|
| What the form was told at the time (old prompt, 15-task prefilter, no rulings) | **39 / 63** | — |
| Rules mode: the logged model answers through today's rulings | — | **55 / 63** |
| Model mode: today's prompt → gemini-2.5-flash → today's rulings | — | **58 / 63** (everything right: 58) |

Model mode ran three times this round (53 → 58 after one prompt change: the title is the authority, not the
customer-voice `whenToUse`). Sizes 63/63, metal 63/63, stock 63/63 in the recorded run. Photos: 5 of 61 descriptions
that name a metal colour contradict the ticket (text regex; G1 not started).

**Still wrong in model mode (5):** "Sterling silver clean polish" (no task — run-to-run variance, H4) · reset stone
with no size (H3) · silver bangles hard solder (H2) · chain shortened to a bracelet: an extra Break in chain ×2
· earrings: rhodium ×2 (O5).

**Local gate.** `npm test`: 277 files pass; 3 production files cannot load `mongodb-memory-server` in this worktree
(fail the same on main here). `npm run lint`: clean. `npm run views`: not run — it needs a production build (H5); no
screen changed this round.

**Waiting on the owner.** O4, O5. Prepared-and-waiting production writes: none yet (D1, C1 not started).
