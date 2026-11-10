/**
 * What the jeweler's NOTE itself says — the shank's width, how many pieces, whether the pieces get different work.
 * Read from the sentence only, never from the photo's description. Split out of smartIntakeRules.js (which re-exports
 * everything here) when that file passed the line limit; the rulings that USE these answers stay there.
 *
 * The rule for anything added here (docs/goals/SMART_INTAKE.md, round 3): a regex may CONFIRM the model, read only an
 * explicit form, or ask what a number is ABOUT. It never decides a price on its own.
 */
import { MAX_PIECES } from './smartIntakeLimits';

const str = (v) => String(v ?? '').trim();

/* ----------------------------------------------------------- what was said */

const SHANK = '(?:band|shank|ring)';
// Words that may sit between "wide" and the band: its metal, karat, colour, wearer.
const BAND_FILLER = '(?:(?:\\d{2}k(?:t)?[ywr]?g?|\\d{2}[\\s-]?karat|white|yellow|rose|gold|silver|sterling|platinum|plat|wg|yg|rg|ss|pt|mens|men\'s|gents|ladies|wedding|plain)\\s+){0,4}';
/**
 * Did the JEWELER say the shank is wide?
 *  - A width over 3mm that is ABOUT the band: the band/shank/ring is the next word ("5 mm band", "4 millimeter wide
 *    shank", "5x2 shank") or was just named ("band is 5mm", "men's band, 3.5 mm"). Any other millimetre measurement is
 *    a stone, a chain or a finding — "tighten 5mm amethyst" is not a wide shank. Asking what the number IS about,
 *    rather than listing every stone it might be, is what stops the next gem name from over-charging (reviews,
 *    2026-11-09: a list of stones missed amethyst, garnet, topaz…).
 *  - Or the word for it next to the band, with its metal in between: "wide band", "wide 14k white gold band", "heavy
 *    mens band", "cigar band", "the shank is thick".
 *
 * Read from the sentence only. The item description is usually written by the photo model, and a "thick band" it saw
 * in a picture is not the jeweler specifying a width (owner, 2026-11-09: "Default ring mm is always 3x2 unless
 * specified 3-5"; and the descriptions are "trash").
 */
const MM_WORDS = { four: 4, five: 5, six: 6, seven: 7, eight: 8 };
// Words that may follow a measurement without being the thing measured: "6mm, size 9", "5mm and polish".
const CONTINUES = /^(?:and|size|sized|sizing|resize|sz|needs|to|half|comfort|with|so|for|please|up|down|then|also|customer|wants|rush)$/;
// A band that is someone else's, or denied: "wears it with a wide band", "not a wide band", "her other wide band".
const NOT_THIS_BAND = /\b(?:with|not|other|another|matching|next to|beside|against)\s+(?:an?\s+|her\s+|his\s+|the\s+)?$/;
/**
 * What the note says about the shank's width: 'wide', 'unclear', or '' (nothing).
 *
 * Three answers, because both wrong answers cost money and every review found a new sentence for one of them. The
 * rule since round 5 (2026-11-09): the code only OVERRIDES the model's pick when the note is plain. Anything else that
 * so much as mentions a width is 'unclear' — the model's pick stays and the jeweler is asked.
 *  - 'wide'    plainly this band: the band is the next word after the measurement ("5 mm band", "4x2 shank"), the
 *              band or shank was just named ("band is 5mm", "ring is 5mm wide"), or "wide band" with only its metal
 *              in between — and it is not someone else's band ("wears it with a wide band").
 *  - ''        no width mentioned at all — or a measurement that is plainly something else's: the next word is the
 *              thing measured ("6.5mm moissanite", "5mm cz", "7mm round"). Then the default stands: 3x2.
 *  - 'unclear' everything in between: a measurement over 3mm on its own ("comfort fit 6mm"), one with the band a few
 *              words on ("5mm flat band"), "wide" anywhere else ("wide comfort fit band", "half shank, wide", "center
 *              stone is 5mm wide", "not a wide band").
 */
export const shankWidthSaid = (inputText = '') => {
  const text = str(inputText).toLowerCase().replace(/[‘’]/g, "'")
    .replace(/\b(four|five|six|seven|eight)(?=\s*(?:mm\b|millimet|mil\b))/g, (w) => String(MM_WORDS[w]));
  const justNamed = (before) => before.match(/\b(band|shank|ring)s?\b(?:\s+(?:is|at|of|about|measures))?[\s,:-]*$/);
  const measure = /(?<![\d.])(\d+(?:\.\d+)?)\s*(x\s*\d+(?:\.\d+)?)?\s*(mm\b|millimet(?:er|re)s?\b|mil\b)?/g;
  let wide = false;
  let unclear = false;
  for (const m of text.matchAll(measure)) {
    const hasUnit = Boolean(m[3]);
    if (!hasUnit && !m[2]) continue; // a bare number is not a measurement
    const width = Number(m[1]);
    if (!(width > 3 && width <= 12)) continue;
    const after = text.slice(m.index + m[0].length);
    const before = text.slice(Math.max(0, m.index - 28), m.index);
    if (new RegExp(String.raw`^\s*(?:wide\s+|width\s+)?${BAND_FILLER}${SHANK}\b`).test(after)) { wide = true; continue; }
    if (hasUnit && /^\s*(?:in\s+)?(?:wide|width|thick)\b/.test(after)) {
      // "ring is 5mm wide" is the ring; "center stone is 5mm wide" is not.
      if (justNamed(before)) wide = true; else unclear = true;
      continue;
    }
    // The band a few words on: "5mm flat band", "6mm comfort fit band". Probably the band — not plainly.
    if (/^\s*(?:[a-z'-]+\s+){1,3}(?:band|shank)\b/.test(after)) { if (hasUnit) unclear = true; continue; }
    // The next word is what was measured: a stone, a jump ring, a chain.
    const next = after.match(/^\s*([a-z]+)/);
    if (next && !CONTINUES.test(next[1])) continue;
    const named = justNamed(before);
    if (named && named[1] !== 'ring') { wide = true; continue; }
    // "4x2" with no unit and no band beside it is not about the shank.
    if (hasUnit) unclear = true;
  }
  const worded = new RegExp(String.raw`\b(?:(?:wide|thick|chunky)\s+${BAND_FILLER}${SHANK}\b(?!\s+wear)|heavy\s+${BAND_FILLER}(?:band|shank)\b)`, 'g');
  for (const m of text.matchAll(worded)) {
    if (NOT_THIS_BAND.test(text.slice(Math.max(0, m.index - 16), m.index))) unclear = true; else wide = true;
  }
  if (/\bcigar band\b/.test(text) || new RegExp(String.raw`\b${SHANK}\s+is\s+(?:\w+\s+)?(?:wide|thick|chunky|heavy)\b`).test(text)) wide = true;
  if (wide) return 'wide';
  // "wide" said anywhere else is a width mentioned, and not plainly this shank's.
  return unclear || /\b(?:wide|thick|chunky)\b/.test(text) ? 'unclear' : '';
};
/** Did the JEWELER say, plainly, that the shank is wide? Read from the sentence only — never the photo's description. */
export const statesWideShank = (inputText = '') => shankWidthSaid(inputText) === 'wide';

const NUMBER_WORDS = { two: 2, both: 2, three: 3, four: 4, five: 5, six: 6 };
const COUNT = '(\\d{1,2}|two|both|three|four|five|six)';
// Plural only: a count of pieces is "2 rings". "7 ring needs to be 6" is a size-7 ring. And only the things that
// ARE pieces: "pieces" and "items" are not — "bracelet broken in 2 pieces" is one bracelet (review, 2026-11-09).
const PIECES = '(?:rings|bands|chains|bracelets|pendants|necklaces)';
const DESCRIBES = '(?:white|yellow|rose|gold|silver|sterling|platinum|plat|wg|yg|rg|wedding|engagement|matching|stacking|plain|mens|ladies|ss|pt|\\d{2}kt?[ywr]?g?|\\d{2}[\\s-]?karat)';
/**
 * How many pieces the sentence says are ON THIS JOB: "2 rings", "two white gold rings", "both rings", "all 3 rings".
 * 1 when it does not say. It is only ever used to CONFIRM the model's own count (see withPieceCount) — a regex has
 * been wrong about this in every review so far, each time multiplying a ticket.
 *
 * Narrow on purpose:
 *  - the number is a whole number of its own — the "5" in "size 7.5 ring" is half a size;
 *  - only words that DESCRIBE the piece sit between it and a PLURAL piece noun — "retip 4 prongs on a ring" is four
 *    prongs, "5 diamond band" is a band with five diamonds, "two jump rings" are jump rings;
 *  - not pieces that are merely mentioned: "customer has 3 rings", "wears it with 2 bands", "her other 2 rings",
 *    "1 of 2 rings", "size 6 and 7 rings";
 *  - "all N" only when a piece noun follows: "retip all 4" is four prongs.
 */
export const statedPieceCount = (inputText = '') => {
  const text = str(inputText).toLowerCase();
  const found = [];
  for (const m of text.matchAll(new RegExp(String.raw`(?<![\d.])(?:all\s+)?${COUNT}\s+(?:${DESCRIBES}\s+){0,4}${PIECES}\b`, 'g'))) {
    const before = text.slice(Math.max(0, m.index - 14), m.index);
    // A size, a part of a set, or pieces that are only mentioned.
    if (!m[0].startsWith('all') && /\b(?:size|sz|to|a|of|and|or|with|has|have|other|another|her|his|their|my)\s*$/.test(before)) continue;
    found.push(NUMBER_WORDS[m[1]] || Number(m[1]));
  }
  const n = Math.max(1, ...found.filter((x) => Number.isFinite(x)));
  return n <= MAX_PIECES ? n : 1;
};

/** Does the note give the pieces DIFFERENT work ("size one down, retip the other")? Then no one count fits every line. */
/** How many "X to Y" size pairs the note holds. Two rings going "6 to 8" and "5 to 9" are not one job times two. */
export const sizePairsSaid = (inputText = '') => new Set(
  [...str(inputText).toLowerCase().matchAll(/(?<![\d.])(\d{1,2}(?:\.\d+)?)\s*(?:to|->|→)\s*(?:an?\s+)?(?:size\s+)?(\d{1,2}(?:\.\d+)?)(?![\d.]|\s*(?:mm|prongs?|stones?))/g)]
    .map((m) => `${m[1]}>${m[2]}`),
).size;

export const describesDifferentWorkPerPiece = (inputText = '') => sizePairsSaid(inputText) > 1 || (
  /\bthe other\b|\bone of (?:them|the)\b|\bone (?:ring|band|needs|gets|up|down|only)\b|\b(?:on|for) (?:1|one)\b|\b(?:first|second|1st|2nd) (?:ring|band|one)\b|\beach\b.*\bdifferent\b|\bonly (?:sizing|the|one)\b|\b(?:engagement|wedding) (?:ring|band)\b(?!s)/.test(str(inputText).toLowerCase())
);
/**
 * "retip 4 prongs on each": the count said may be per piece. It is NOT multiplied here — the model sometimes answers
 * with the total already (8), and doubling that is worse than asking. The warning asks instead.
 */
export const saysEach = (inputText = '') => /\b(?:each|apiece|per (?:ring|band|piece))\b/.test(str(inputText).toLowerCase());

/* -------------------------------------------------- the metal and the karat */

/** Karats named in the note: "14k", "14 kt", "18 karat". A ring size equal to one of them is probably that karat. */
export const karatsSaid = (inputText = '') => [...str(inputText).toLowerCase().matchAll(/\b(10|14|18|22|24)\s*-?\s*(?:k|kt|karat|carat)(?:[ywr]g?)?\b/g)].map((m) => Number(m[1]));
/** Does the number appear in the note as anything OTHER than the karat? "size 14" does; "14k" alone does not. */
export const saidAsSize = (inputText, n) => new RegExp(String.raw`(?<![\d.])${n}(?!\s*-?\s*(?:k|kt|karat|carat)(?:[ywr]g?)?\b)(?![\d.])`).test(str(inputText).toLowerCase());

/** Which metal facts the jeweler's NOTE itself names. */
export const noteNames = (inputText = '') => {
  const text = str(inputText).toLowerCase();
  return {
    // "14ky", "10kw", "14kwg": the karat with its colour stuck on is the shop's commonest shorthand (review, 2026-11-09).
    metal: /\b(?:gold|silver|sterling|platinum|plat|costume|yg|wg|rg|ss|pt)\b|\b\d{2}\s*-?\s*(?:k|kt|karat)(?:[ywr]g?)?\b|\b(?:925|950)\b/.test(text),
    karat: /\b\d{2}\s*-?\s*(?:k|kt|karat)(?:[ywr]g?)?\b|\b(?:925|950|999|900)\b/.test(text),
    color: /\b(?:yellow|white|rose|pink|yg|wg|rg)\b|\b\d{2}\s*-?\s*kt?[ywr]g?\b/.test(text),
  };
};
