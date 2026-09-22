/**
 * Normalize DICTATED smart-intake text into the written forms the extractors already match.
 *
 * Speech recognition says "14 karat white gold, size seven and a half down to six" where a
 * jeweler types "14k wg sz 7.5 to 6". The extractors (smartIntakeExtractors.js) key on the
 * written forms — `\b14k\b`, `7.5` — so spoken karats and fraction sizes would silently miss.
 * This runs on the text right before analysis (typed or spoken; harmless on typed text) and
 * leaves everything else exactly as said.
 *
 * Deliberately narrow: only known gold karats become "Nk" (so "1 carat diamond" is never turned
 * into "1k"), and only ring-size-shaped numbers get their fraction words folded in.
 */

const KARAT_WORDS = {
  ten: '10', fourteen: '14', eighteen: '18', 'twenty two': '22', 'twenty-two': '22', 'twenty four': '24', 'twenty-four': '24',
};
const KARATS = '(10|14|18|22|24)';
const KARAT_UNIT = '(?:kt|k|karats?|carats?)';

export function normalizeSpokenIntake(input = '') {
  let text = String(input || '');
  if (!text.trim()) return text;

  // "fourteen karat" → "14 karat" (only the karat words, only before a karat unit).
  for (const [word, digits] of Object.entries(KARAT_WORDS)) {
    text = text.replace(new RegExp(`\\b${word}\\s+${KARAT_UNIT}\\b`, 'gi'), `${digits} karat`);
  }
  // "14 karat" / "14 carat" / "14 kt" / "14 K" → "14k".
  text = text.replace(new RegExp(`\\b${KARATS}\\s*${KARAT_UNIT}\\b`, 'gi'), '$1k');

  // Ring-size fractions: "7 and a half" / "7 1/2" / "7½" → "7.5", quarters likewise.
  const size = '(\\d{1,2})';
  const joiner = '\\s*(?:and\\s*)?(?:a\\s*)?';
  // (`(?!\\w)` rather than `\\b`: the fraction glyphs are not word characters, so `\\b` never
  // sits after "8¾".)
  text = text
    .replace(new RegExp(`\\b${size}${joiner}(?:half|1/2|½)(?!\\w)`, 'gi'), '$1.5')
    .replace(new RegExp(`\\b${size}${joiner}(?:three[\\s-]*quarters?|3/4|¾)(?!\\w)`, 'gi'), '$1.75')
    .replace(new RegExp(`\\b${size}${joiner}(?:(?:a\\s*)?quarter|1/4|¼)(?!\\w)`, 'gi'), '$1.25');
  // A bare "and a half" right after "size": "size seven and a half" arrives as "size 7 and a half" from
  // most recognizers, already handled above. "half size" ("down a half size") stays as said.

  return text;
}
