# Round 4 sweep — 2026-11-09

Three fresh reviewers, each given only its brief, against the code as merged in #348. Every finding, condensed.
**D** = demonstrated by the reviewer, **S** = suspected. Plus Codex's findings on #348. (The reviewers were interrupted
by a usage limit partway and resumed from where they stopped.)

## Server and model

Could not break: piece-count multiplication, sizing stock arithmetic, karat-as-size, moves over 5 sizes, unknown ids,
truncated JSON, catalog renames (every rename produced a true warning). The stored real answers show the model picks
the 3–5mm size-up for every multi-size move (6 of 6).

- **D (A)** A wide band said in unlisted words is downgraded under a false reason: "14k yg 5mm flat band size 9 to
  11", "wide comfort fit band", "wide flat band", "wide men’s band" (curly apostrophe), "wide eternity band", "half
  shank, wide" → the up-to-3mm task, "no wide shank was stated". Under-charge.
- **D (B)** A width that belongs to something else upgrades: "engagement ring size 6 to 7, she wears it with a wide
  band", "center stone is 5mm wide", "not a wide band" → the 3–5mm task, "a wide shank was stated". Over-charge.
- **D (C)** "plat 5mm band size 7 to 9" → the platinum size-up (the catalog has no wide platinum one). The width is
  detected and dropped, no warning.
- **D (D)** "14k yg ring size to a 7": the model guesses Size Down with the current size blank; it goes through with
  no warning. The form's direction check only fires once both sizes are entered.
- **D (E)** Named work that got no line is not said. Real: "14-karat white gold earrings set with stones over 1 carat,
  2 times" → empty ticket, only the piece-count warning. "Sterling silver bangles hard solder" → Break in chain.
- **D (F)** A flat task with a count: "check and tighten 5 stones" answered ×5 passes through, no warning (the model
  answer is the reviewer's assumption).
- **S** Model retirement (a second hard-coded copy at `generate-ai-meta/route.js:6`). Live aiMeta is chatbot text and
  the generator writes more. "pt" as points ("set 3 pt diamond") read as platinum overrides the form. Duplicate lines
  add with no warning. Rhodium on all white gold against 6 of 12 saved without. ~94s retry loop, no `maxDuration`.
  "retip all 4 to 6 prongs" trips the "all N to" rule.
- Right: the model only chooses ids; a wrong count never multiplies silently; roles fail closed with a named warning;
  the photo cannot set metal or width; provider text never reaches the user; the replay separates tuned from fresh.
- Change: (1) stop swapping wide → narrow on a note with wide/thick/heavy or a measurement over 3mm anywhere — keep
  the pick and say "check the width"; only swap narrow → wide when the measurement sits next to band/shank; (2) an
  "uncovered work" warning, always when zero tasks come back; (3) warn when a sizing task is present and the move is
  unknown; (4) a per-unit flag, or warn on a count over 1 on a flat task; (5) apply the aiMeta proposal after the
  owner's yes, fix the generator prompt; (6) warn when a wide platinum shank has no task. Not worth doing: more width
  vocabulary, the prefilter, server-side catalog validation, request limits, retry tuning.

## From the model's answer to the saved ticket

Could not reach a wrong price unnoticed through: AI failure, quantities, wrong sizing direction, wrong-metal task,
missing rhodium, stock quantity while a size-up line exists, store users, the photo path.

- **D (1)** Sizing stock stays on a ticket that no longer sizes up, with no check: read 6 → 8, flip to 8 → 6, tap
  "Switch it" → Size Down + stock ×1, no check. Deleting the size-up line by hand: the same. `sizingStockCheck`
  returns null when there is no size-up line. Over-charge.
- **D (2)** Several rings with different sizes are charged from one size pair: "size up 2 rings, one 6 to 8 and one 5
  to 9", pieceCount 2 → Size up ×2, stock ×2 (needs 4), under "2 pieces: each … counted 2 times". Under-charge.
- **D (3)** A karat nobody said gets a tick: "gold ring size 6 to 8", model answers 14k → chip "✓ 14k". `said.karat`
  is computed and not used for the chip.
- **D (4)** "Added Size up" is said when it was not: he deleted the size-up line, re-reads "6 to 9" → no sizing line
  (never put back), sizes 6 → 9, no stock, no check, and the warning says it was added. Under-charge.
- **D (5)** A re-read undoes hand-edited sizes: corrected to 6 → 7 on Review, the mic re-reads → back to 6 → 8, and
  the stock check now steers to the wrong fix.
- **D (made-up materials)** (6) White gold can get yellow gold stock when stock is named by colour. (7) Changing the
  metal on Review leaves the old metal's stock.
- **S** A line deleted while a read is in flight comes back. The classic form's checks sit far from Save and it has no
  "(assumed)" or per-line chips. Read warnings stay after hand edits contradict them. Title-based roles.
- Right: one pricing engine and a server re-price; stock computed by one shared function; agreement for the piece
  count; only the latest read lands; AI-down is honest; checks offer a fix and never change the ticket silently.
- Change: (1) stock with no size-up line, or sizes not going up → a "Remove it" check; (2) sizes moving with no
  sizing line → a check; drop "Added X" when the hook filtered X out; (3) "(assumed)" from `said.metal`/`said.karat`;
  (4) do not overwrite hand-edited sizes on a re-read; (5) more than one size pair → do not multiply, warn;
  (6) remove `gold` from colour aliases for stock, only if the live list names colours. Not worth doing: blocking the
  save on checks, polishing the classic form (retire it), the in-flight race, a role field.

## Evidence, measurement and upkeep

"No case of a wrong price or silently lost ticket data within this lens" — the system measuring itself badly, and
silent loss of evidence.

- Proven: the headline is a fit (21 of the 66 rest on hand marks; 45/69 as saved); 79 attempts, 71 tickets, 5.5
  weeks, 4 from stores, 0 platinum, 21 of 32 tasks; zero fresh tickets; `--update` bypasses every assertion with no
  reason recorded; the replay does not send what production sends (no form metal, catalog order) and the log stores
  neither the task list, the form metal nor a prompt hash; client-side steps (platinum swap, hand-removal filter,
  stock mapping) are outside both measures; the "logged" run is weak; AI failures write no log row; unsaved reads
  are excluded; the outcome holds no materials; the four top stat cards are still per attempt; the trend cannot
  detect a change at ~40 tickets a month (16/41 against 14/30 is inside the noise) and 18 of 29 "changed" are tasks
  he only added; the proposal quotes the fixtures; the prompt tells the model aiMeta is customer talk, which becomes
  false if the proposal is applied; 4 of 32 marks sit on superseded attempts.
- **S** CI may not run the ratchet at all; Gemini will change under the alias; marks then refreshes will stop.
- The apply script: nothing unsafe found. Weak: the typed yes flag, non-atomic writes, a hard-coded production
  database name, restore overwrites later edits.
- Change: (1) hold the proposal until ~30 fresh tickets; (2) log the prompt hash, the response's model version, the
  form metal, the task ids offered, and a row for every failure; (3) `--update` requires a reason; (4) the replay
  sends what production sends, plus 3–4 synthetic platinum and store notes; (5) split the trend into "AI line removed
  or quantity changed" against "he only added"; (6) fail on a mark that points at a superseded attempt; (7) a
  10-minute monthly routine. Not worth doing: a bigger dashboard, significance tests, automatic marks, photo scoring,
  tuning further on these 69 tickets.

## Codex on #348

- **D** Stock left off for a deleted size-up was then taken for a hand deletion and never added again. Fixed before
  merge.
- **D** With both sizing directions on the ticket, the wrong-way line skipped the metal check. Fixed before merge.
