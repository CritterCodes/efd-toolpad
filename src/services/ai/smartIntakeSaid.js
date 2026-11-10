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
/**
 * What the note says about the shank's width: 'wide', 'unclear', or '' (nothing).
 *
 * Round 4 (2026-11-09) made this three answers instead of two, because both wrong answers cost money and each review
 * found a new sentence for one of them:
 *  - 'wide'    the measurement is plainly the band's: the band is the next word ("5 mm band", "4x2 shank"), or it says
 *              wide ("6mm wide", "5mm in width"), or the band or shank was just named ("band is 5mm", "shank 4x2").
 *  - ''        no measurement over 3mm — or it is plainly something else's: the next word is the thing measured
 *              ("6.5mm moissanite", "5mm cz", "7mm round", "4mm stone"). Then the default stands: 3x2.
 *  - 'unclear' a measurement over 3mm standing on its own ("comfort fit 6mm, size 9 to 10.5", "mens ring 6mm"). The
 *              rules do not swap the task either way; the model's pick stays and the jeweler is asked to check.
 */
export const shankWidthSaid = (inputText = '') => {
  const text = str(inputText).toLowerCase()
    .replace(/\b(four|five|six|seven|eight)(?=\s*(?:mm\b|millimet|mil\b))/g, (w) => String(MM_WORDS[w]));
  const measure = /(?<![\d.])(\d+(?:\.\d+)?)\s*(x\s*\d+(?:\.\d+)?)?\s*(mm\b|millimet(?:er|re)s?\b|mil\b)?/g;
  let unclear = false;
  for (const m of text.matchAll(measure)) {
    const hasUnit = Boolean(m[3]);
    if (!hasUnit && !m[2]) continue; // a bare number is not a measurement
    const width = Number(m[1]);
    if (!(width > 3 && width <= 12)) continue;
    const after = text.slice(m.index + m[0].length);
    const before = text.slice(Math.max(0, m.index - 28), m.index);
    if (new RegExp(String.raw`^\s*(?:wide\s+|width\s+)?${BAND_FILLER}${SHANK}\b`).test(after)) return 'wide';
    if (hasUnit && /^\s*(?:in\s+)?(?:wide|width|thick)\b/.test(after)) return 'wide';
    // The next word is what was measured: a stone, a jump ring, a chain.
    const next = after.match(/^\s*([a-z]+)/);
    if (next && !CONTINUES.test(next[1])) continue;
    const named = before.match(/\b(band|shank|ring)s?\b(?:\s+(?:is|at|of|about|measures))?[\s,:-]*$/);
    if (named && named[1] !== 'ring') return 'wide';
    // "4x2" with no unit and no band beside it is not about the shank.
    if (hasUnit) unclear = true;
  }
  const worded = new RegExp(String.raw`\b(?:wide|thick|chunky)\s+${BAND_FILLER}${SHANK}\b(?!\s+wear)`).test(text)
    || new RegExp(String.raw`\bheavy\s+${BAND_FILLER}(?:band|shank)\b`).test(text)
    || /\bcigar band\b/.test(text)
    || new RegExp(String.raw`\b${SHANK}\s+is\s+(?:\w+\s+)?(?:wide|thick|chunky|heavy)\b`).test(text);
  if (worded) return 'wide';
  return unclear ? 'unclear' : '';
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
export const describesDifferentWorkPerPiece = (inputText = '') => (
  /\bthe other\b|\bone of (?:them|the)\b|\bone (?:ring|band|needs|gets|up|down|only)\b|\b(?:on|for) (?:1|one)\b|\b(?:first|second|1st|2nd) (?:ring|band|one)\b|\beach\b.*\bdifferent\b|\bonly (?:sizing|the|one)\b|\b(?:engagement|wedding) (?:ring|band)\b(?!s)/.test(str(inputText).toLowerCase())
);
/**
 * "retip 4 prongs on each": the count said may be per piece. It is NOT multiplied here — the model sometimes answers
 * with the total already (8), and doubling that is worse than asking. The warning asks instead.
 */
export const saysEach = (inputText = '') => /\b(?:each|apiece|per (?:ring|band|piece))\b/.test(str(inputText).toLowerCase());
