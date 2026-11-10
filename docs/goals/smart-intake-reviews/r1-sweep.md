# Round 1 sweep — 2026-11-09

Three fresh reviewers, each given only its brief, against the code as merged in #344. Their reports came back in the
session and were not kept as files, so this is the loop's record of what each found — every finding, condensed, with
**D** = demonstrated by the reviewer, **S** = suspected. Plus one finding from Codex's review of #344.

## Server and model

- **D** A catalog edit switches a ruling off silently. Roles are found by title and a tie returns null: an unrestricted
  "Size Down (Silver)", a second rhodium task, "Solder Together w/ laser". `warnings` and `problems` are produced and
  nothing reads them. `catalog.test.js` checks the committed fixture, not the live catalog.
- **D** Piece count misread multiplies the ticket: "wg retip all 4 prongs size 5 to 7" → Size Up ×4, Rhodium ×4, stock
  ×4; "retip all 14 and polish" → Clean and Polish ×14; "5 diamond band retip" → 5 pieces; "7 ring needs to be 6" → 7;
  "2 rings, size one down, retip 4 prongs on the other" → Size Down ×2.
- **D** (helpers) / **S** (how often the model triggers it) Sizing is never checked against the sizes: Size Down kept for
  5→7; Size Up quantity 2 for "2 sizes" → ×2 plus stock; a karat in a size field (6→18) → stock ×11; a bracelet "7 inch
  to 8 inch" gets a ring Size Up (`isRing` ignored); customer-supplied plus regular size-up → stock depends on line order.
- **D** Shank width only goes down: a stated 5mm band with a narrow pick stays narrow; with no pick the narrow task is
  added; "heavy mens band", "cigar band" are not wide; "4mm princess cut" or a "center is 6.5mm" description keeps a
  wide task.
- **S** Rhodium is decided from the model's colour, not the form's: white chosen on the form, no colour in the note →
  yellow default, no rhodium. **D** 7 of 13 saved white gold tickets had no rhodium; the rule adds it to those, and to
  a watch battery.
- **S** A Gemini outage swaps engines silently: the regex path applies none of the rulings and caps at 2 tasks. The
  model id is hard-coded in three routes.
- **D** aiMeta contradicts the rulings (size-up "never for more than one size"; Size Down "no gemstones"); the
  generator writes for a customer chatbot; Glue Pearl has none; aiMeta is ~13k of the 19.5k prompt characters.
- **D/S** Photo path barely measured: "the ring" for every item; 18 gold items described "silver-toned"; that text
  feeds the parse prompt and the wide-shank check; only 8 of 79 fixtures had a description at parse time.
- Right: model suggests, code decides, one entry point; values fail closed (size null not 0, unknown ids dropped,
  quantities clamped, stock computed); ambiguous roles return null; the raw answer is logged; the whole catalog is sent.
- Change: show `warnings` and role `problems`; fix `statedPieceCount`; sizing guards in `decideIntake`; run `taskRoles`
  when a task is saved in admin; send the form's metal and colour; hand-fix the aiMeta that contradicts rulings; model
  id in an env var. Not worth it: response schemas, the >80 prefilter, retry tuning, "585" karats, more prompt tuning.

## From the model's answer to the saved ticket

- **D** A second Analyze leaves stale lines: tasks only written when there are none, metal only when blank, materials
  merged by larger quantity, but sizes overwrite. "5 to 8" then "5 to 6" → sizes 5→6, stock still ×2.
- **D/S** Sizing stock is computed once: changing a size on Review, or adding Size Up by hand, never adds or removes
  stock, and the save does not re-check it.
- **D** `warnings` and `pieceCount` are never read by the form. Rule-added lines carry the green "✓ from your sentence"
  chip. A mixed multi-piece job ("size one up, clean the other") doubles everything.
- **D** When the AI call fails the fallback writes a confident wrong ticket: two tasks, no quantities, no rhodium;
  "set 1/2 ct diamond" → promise date January 2 (the fallback still uses the date regex); "size up 5 to 7" read as "up
  5 sizes"; "solder 2 rings together" → Laser Weld. The banner is on the Piece step only and clears on a keystroke.
- **D** Defaults shown as confirmed: "14k ring retip 4 prongs" shows "✓ yellow gold" under "Picked up from that sentence".
- **D** (synthetic catalog) / **S** (production) Material matching takes any positive score: with no sizing-stock
  material, "14k Yellow Gold Solder ×2" was added; two sizing stocks and no metal → the first wins; materials not yet
  loaded → no stock and no message.
- **D** Smaller: the rule guesser runs when the model matched nothing, with a green chip; the AI-written photo
  description steers the shank width; quantities over 99 are clamped silently; swapped sizes keep Size Up for 9→6.
- Right: one pricing engine and a re-price on save; wrong-metal cases fail loudly; stock arithmetic is the server's;
  quantity survives the platinum swap; double-triggering Analyze is harmless.
- Change: show warnings and label rule-added lines; make re-analysis replace what smart intake set; derive stock live
  from the form's sizes; cut the fallback to metal and sizes with a banner that persists; require the sizing-material
  category for a stock match; mark defaulted chips "(assumed)".

## Evidence, measurement and upkeep

- **D** The headline scores against rewritten answers: 58/63 with the marks; against what he saved, 42/63 (43/71 with no
  marks at all). 17 of the 20 scored `expect` marks replace what he saved. Marks and rules encode the same same-day rulings.
- **D** "All white gold gets rhodium" contradicts his tickets: rhodium on 6 of 12 white gold tickets with tasks.
- **D** Skips hide wrong suggestions: "Size all 3 to a 6" yields Size Up ×3 + Rhodium ×3 with the direction unknown;
  "add lobster claw" yields the laser jump-ring task.
- **D** The ratchet can pass while quality drops: counts not ticket ids; a fixture refresh forces `--update`, which
  skips every assertion; `promptHash` is never checked in `npm test`; a ticket missing from the model answers falls
  back to the logged answer under the "model" label.
- **D** `ai.raw` is on 0 of 79 fixtures, so "logged" re-rules processed output. Photos have no ratchet.
- **D** The production counter measures edits, not errors; retries count as changed; materials not compared; failures
  not logged; newest 200 only, no dates or versions.
- **D** Coverage is thin: 21 of 32 tasks appear in an expected answer, 10 of them once; no platinum ticket; 4 store intakes.
- **D** aiMeta: 122 of 165 symptoms are customer voice and 1 appears verbatim in the real notes; Size Down "no
  gemstones" vs 11 of 14 with stones; the jump-ring pair identical; four platinum tasks identical.
- **D** A rename fails silently in production (`problems` is read only by tests).
- **S** Marks will stop being written (28 of 71 needed one); future data confirms itself (accepting a rule-added line
  counts as correct); one run at temperature 0.1 was never checked for variance; usage looks like it is falling.
- Right: one `decideIntake` and prompt builder shared by route and replay; rulings in code; marks carry reasons and
  the owner's dated words; model mode aborts on an API error; the log now keeps `raw`; the export is read-only.
- Change: print both numbers (vs rulings, vs saved); ratchet per ticket; fail on a stale prompt hash and drop the
  logged fallback; rewrite aiMeta for the ~8 volume tasks; fix the production counter; ask the owner once about
  rhodium; score the skips as "should suggest nothing"; surface `taskRoles().problems` on the form. Not worth it: a
  photo replay with stored images, variance statistics, a bigger dashboard, synthetic platinum tests.

## Codex review of #344

- **D** `statedPieceCount`: "size 7.5 ring down to 6" → five pieces; "retip 4 prongs on a ring" → four. Fixed in #345.
