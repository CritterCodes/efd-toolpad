/**
 * Things said out loud about a finished ticket rather than left for the jeweler to notice. None of them changes a
 * line: each is a sentence asking him to look. Split from smartIntakeRules.js for the line limit.
 *
 * Every check here CONFIRMS the model against the note, the only use a regex is trusted with
 * (docs/goals/SMART_INTAKE.md, round 3): the note either backs the model's pick or the pick is questioned.
 */
const str = (v) => String(v ?? '').trim();
const titleOf = (t) => str(t?.title).toLowerCase();

// A task priced for the whole piece, whatever the count: "Check & Tighten < 20 stones", "Straighten Prongs — up to 20 stones".
export const isFlatTask = (t) => /(?:<|up to|over|less than)\s*\d+\s*stones/.test(titleOf(t));
// A task that comes in stone-weight tiers: "Set Stone less than0.49ct", "Set Stone 0.5ct to 0.99ct", "Set Stone 1ct or larger".
export const isWeightTier = (t) => /\d\s*ct\b/.test(titleOf(t));
/** Does the note give a stone's weight? "1/2 carat", ".75ct", "three 1-point stones", "20 pointer". */
export const saysStoneWeight = (inputText = '') => /\bcarats?\b|\d\s*-?\s*(?:ct|cts|pt|pts|points?|pointers?)\b/.test(str(inputText).toLowerCase());

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** Does the note say this number, as a figure or a word? "retip 4 prongs", "four prongs", "a pair" (2), "both" (2). */
export const saysCount = (inputText = '', n = 0) => {
  // Numbers that are plainly something else are taken out first: a karat ("14k"), a ring-size move ("6 to 8",
  // "size 7"), a head ("6 prong head"), a millimetre. Any matching digit used to satisfy the check — "retip prongs on
  // 6 prong head" answered ×6 passed (review, 2026-11-10).
  const text = str(inputText).toLowerCase()
    .replace(/\b\d{2}\s*-?\s*(?:k|kt|karat)(?:[ywr]g?)?\b/g, ' ')
    .replace(/(?<![\d.])\d{1,2}(?:\.\d+)?\s*(?:to|->|→)\s*(?:an?\s+)?(?:size\s+)?\d{1,2}(?:\.\d+)?(?![\d.])/g, ' ')
    .replace(/\b(?:size|sz)\s+\d{1,2}(?:\.\d+)?/g, ' ')
    .replace(/(?<![\d.])\d+\s*-?\s*prong\s+(?:head|setting|mount\w*|basket|tiffany)\b/g, ' ')
    .replace(/(?<![\d.])\d+(?:\.\d+)?\s*(?:mm|millimet\w*|ct|carat|inch(?:es)?|in\b|")/g, ' ');
  if (new RegExp(`(?<![\\d.])${n}(?![\\d.])`).test(text)) return true;
  if (COUNT_WORDS[n] && new RegExp(`\\b${COUNT_WORDS[n]}\\b`).test(text)) return true;
  return n === 2 && /\b(?:both|pair|twice|double)\b/.test(text);
};

/**
 * The sentences for a decided ticket. `lines` are { task, quantity, sizing }; `pieces` is the agreed piece count.
 *  - nothing matched: an empty ticket after a note that named work looked the same as a note with no work;
 *  - a count on a task priced for the whole piece ("check and tighten 5 stones" ×5);
 *  - a stone-weight tier picked when the note gives no weight — "remove and reset stone" came back as the under-half-
 *    carat tier, silently; he saved the next one up (real ticket; reviews, 2026-11-10);
 *  - a count over 1 that the note does not say — "retip prongs on 6 prong head" is not six prongs, and a task the
 *    model named twice arrives as ×2.
 */
export function ticketNotes(lines = [], { pieces = 1, inputText = '', hasCatalog = true } = {}) {
  if (!lines.length) {
    return [hasCatalog ? 'No work was matched from this note. Add the work by hand.' : 'The task list did not load, so no work could be matched. Add the work by hand.'];
  }
  const out = [];
  for (const { task, quantity, sizing } of lines) {
    if (!task) continue;
    if (isFlatTask(task) && quantity > pieces) {
      out.push(`"${task.title}" is priced for the whole piece, and ${quantity} were suggested. Check the quantity.`);
    } else if (!sizing && quantity > 1 && quantity !== pieces && !saysCount(inputText, quantity)) {
      out.push(`"${task.title}" came back as ${quantity}, and the note does not say ${quantity}. Check the count.`);
    }
    if (isWeightTier(task) && !saysStoneWeight(inputText)) {
      out.push(`"${task.title}" was chosen, and the note gives no stone weight. Check the size of the stone.`);
    }
  }
  return out;
}

/**
 * Does the note say NOT to plate? His instruction on this ticket beats the standing rule (owner, 2026-11-09: "All wg
 * gets rhodium"). Said several ways at the counter (review, 2026-11-10).
 */
export const saysNoRhodium = (inputText = '') => {
  const text = str(inputText).toLowerCase();
  return /\b(?:no|without|skip|don'?t|do not|doesn'?t want|does not want|not)\s+(?:want\s+)?(?:the\s+|any\s+)?(?:rhodium|re-?plat(?:e|ing))\b/.test(text)
    || /\brhodium\s+(?:plating\s+)?(?:is\s+)?not\s+(?:needed|wanted|required)\b/.test(text)
    || /\bdo(?:es)?\s*n(?:o|')t\s+want\s+(?:the\s+|any\s+|it\s+)?(?:rhodium|plated)\b/.test(text);
};
