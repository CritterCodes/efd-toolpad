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
3. **Ship.** PR → checks green → merge → confirm the Vercel production deploy completed. Never push to `main`.
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
- **Model mode (needs `GEMINI_API_KEY` with credit in `.env.local`):** today's prompt → Gemini → rules → compare. An API
  error ABORTS the run; it is never scored as an empty answer. **On 2026-11-09 the key on the owner's machine answered
  402, credits depleted** — if it still does, run rules mode, say so in the Round log, and ask the owner once.

**Sizing tickets are not ground truth.** Owner, 2026-11-09: he gave customers breaks on some size-ups, rounding
down instead of up. A saved ticket shows what he charged that day, not what the rule is. So for every fixture where
the ring is sized UP: the expected sizing quantity and sizing stock come from the owner's rule (O1), never from the
saved ticket; until O1 is answered those two fields are excluded from the score for those tickets, and the replay
prints them as "sizing: waiting on O1". Never tune a rule or the prompt to match a discounted ticket. The same goes
for any other field the owner later says he discounted — mark the fixture, don't learn from it.

Baseline before any of today's fixes, from the production log (2026-10-02 → 11-06): 77 saved typed intakes = 70
tickets; tasks+quantities matched on 44 of 77 logs; 40 of 70 tickets saved exactly as suggested.

## Backlog (round 1 starts here)

From three independent reviews on 2026-11-09. Already fixed and merged that day (#336, #337): whole catalog sent to the
model; promise-date false miss; rhodium on white gold, per piece; yellow default for a blank colour only; sizing stock
in whole sizes; a sizing task whenever two sizes are given; 3x2 unless a wide shank is stated.

**A — measurement first (nothing else is trustworthy without it)**

- **A1.** Build `npm run intake:replay` as described above. Commit sanitized fixtures (`input.text`, `input.description`,
  `output`, `outcome`, `createdAt`, and the task catalog as the model saw it) under `test/fixtures/smart-intake/`, plus
  a read-only `scripts/intake/export-logs.mjs` that refreshes them. Hand-mark the ~13 tickets whose final work was
  never said in the sentence ("14 Kar" → Laser Weld) as `unknowable` and exclude them from the headline.
- **A2.** Fix the miss counter (`src/services/ai/smartIntakeLog.js`, Admin → Smart intake log): count per ticket, not
  per log; split typed from photo; include materials; log AI failures and invalid JSON (today they return before the
  log write); store the task ids offered, a prompt hash and the model version; add a date range (the page loads the
  newest 200 and there are already 194).
- **A3.** A test that every title-keyed rule resolves to exactly one task in the committed catalog fixture.

**B — wrong price, nobody notices**

- **B1.** Platinum size-up becomes a Half-Shank: `src/services/repairs/metalTaskFilter.js` picks the platinum
  counterpart by title-word overlap. Swap only within the same job family, or store a counterpart id. Confirm against
  the live catalog first — the reviewer used titles from tests.
- **B2.** A fraction becomes a promise date: "set 1/2 ct diamond" → January 2 (`newRepairFormHelpers.js`, the regex
  date fallback used when the model returns none). Seen twice in the production log. Remove it from the AI path; in
  the rule path require "due/by/ready" and reject past dates.
- **B3.** Sizing stock is taken from the model's number when it sends one (`useSmartIntake.js`). Always compute it
  from the two sizes; drop material hints other than `sizing_material`.
- **B4.** Fractional and worded sizes: "7 1/2" and "size 7" are misread by `parseFloat` in the server rules; share one
  size parser between server and form.
- **B5.** `statesWideShank`: "6mm stone" and "heavy wear" read as a wide shank; "4 millimeter band" does not; the
  description field is never checked.
- **B6.** A fourth job is dropped silently (cap of 3 server-side, 2 in the fallback). Raise the cap to about 6 and
  say when something was cut.
- **B7.** Duplicate lines when a generic and a platinum task are both matched; duplicate task ids kept.
- **B8.** The dictation normaliser also rewrites typed text: "size 7 half shank" → "size 7.5 shank".

**C — rules that break on a catalog edit**

- **C1.** Replace title regexes (rhodium, size up/down, width band, narrow sibling) with fields on the task — a role
  and a width band — set in Admin → Tasks. Until then, A3 guards them. Needs a production write to set the fields:
  prepare it, dry-run it, and wait for the owner's yes.
- **C2.** The model name is hard-coded in four files and `build-task` is on an older model. One constant.
- **C3.** Use Gemini `responseSchema` with enums; remove the prompt's contradictions ("extract only what is explicit"
  vs three defaults; "up to 3 tasks" vs "cover every job"; `matchedTasks` vs `matchedTaskIds`) and the task names that
  do not exist in the catalog ("Ring Sizing with Stones", "Chain Repair").

**D — the AI metadata**

- **D1.** `aiMeta` is written in customer voice for a chatbot; the reader is a jeweler's shorthand (0 of 106 real
  inputs contain "my"). Rewrite, in shop shorthand and from the real inputs, for: Laser Weld (used on chains and
  bracelets, described as a crack near a stone), Size up (1 size) (says never for more than one size; all 5 real
  uses were), Clean and Polish (says not with other work; 7 of 10 were), Set Stone (says single stone; the shop uses
  quantity), the two jump-ring tasks (identical metadata), Glue Pearl (none). Change the generator prompt to match.
  Production write — prepare, dry-run, wait.
- **D2.** Require `aiMeta` on a task before it is offered to the model, or show a warning in Admin → Tasks.

**E — the form**

- **E1.** Re-analysing a corrected sentence keeps the old metal, tasks and stock with no message. Make it replace what
  the previous analysis set and keep what was added by hand.
- **E2.** A ticket can be saved without seeing its tasks: the green chips skip Work, Review shows "3 · $185.00", and the
  chips are built from form state so a default reads as "picked up from that sentence". List the lines on Review; mark
  defaults as defaults.
- **E3.** Return `warnings` from the server ("rhodium added: white gold rule", "unknown task id dropped") and show them.
- **E4.** When the AI is down the regex fallback fills in a weaker ticket. Shrink it to metal and sizes, with "AI
  unavailable — add the work by hand".
- **E5.** No test covers `useSmartIntake.js`, where the model's answer becomes ticket lines. Add one.

**F — hardening, small**

- **F1.** Timeouts: worst case 94s against a 90s function limit; cap the total at 30s, cap `Retry-After`, retry 503.
- **F2.** Cap `inputText` and `tasks` size; send the key in a header.
- **F3.** Photo prompt says "the ring" for every item; a phone photo over ~4.5MB fails with an unguarded JSON parse.
- **F4.** "Today" is UTC, so "tomorrow" is a day off in the US evening.

## Owner questions (do not decide these)

- **O1 — multi-size size-up.** What is the full-price rule? Owner, 2026-11-09: *"1.25 sizes is charged as 2"*, and
  then: *"Some of our data on sizings wasn't true … I gave people breaks on some size ups, rounding down instead of
  up."* So the saved sizing tickets are NOT the truth (see **Sizing tickets are not ground truth** below). Read with
  that in mind, his tickets fit **the size-up task × sizes rounded up** (5→7 saved as task ×2 with stock ×2), not what
  was built on 2026-11-09 (task ×1 plus stock for the extra sizes). **Not yet confirmed.** Until he answers: change
  nothing about sizing quantities or stock.
- **O2 — photo descriptions.** 76 saved, none edited, but 9 of 65 that name a metal colour contradict the ticket. Are
  they read by anyone? Recommendation: decide before spending a round on them.

## Declined

*(findings a round chose not to act on, with the reason)*

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
