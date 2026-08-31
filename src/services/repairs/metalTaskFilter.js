/**
 * Metal-aware task alignment for smart intake.
 *
 * Platinum work is laser welded and has its OWN tasks (`metals: ['platinum']`);
 * the standard tasks carry gold-solder recipes. The AI matcher works from text,
 * so "size down this platinum band" can plausibly match the generic gold task —
 * a prompt hint is not a guarantee. This is the deterministic guard applied
 * AFTER matching, wherever inferred tasks meet a known metal (guard the sink):
 *
 *   1. a metal-restricted task never survives for the wrong metal (a platinum
 *      task never lands on a gold job, and never lands when the metal is unknown)
 *   2. when the detected metal has dedicated tasks, a generic match is SWAPPED
 *      for its metal-specific counterpart when one exists (matched by title
 *      word overlap, so "Half-Shank — up to 3mm" finds
 *      "Half-Shank — Platinum, up to 3mm" and not the 3-5mm one)
 *
 * Pure and shared so the form and any future server-side matcher use one rule.
 */

const norm = (s) => String(s || '').toLowerCase();

/** Does this task's metal restriction admit the detected metal? Unrestricted → yes. */
export function taskAllowsMetal(task, metalType) {
  const metals = Array.isArray(task?.metals) ? task.metals.filter(Boolean) : [];
  if (metals.length === 0) return true;
  const detected = norm(metalType);
  // Unknown metal: never auto-select a restricted task — the restriction exists
  // because the recipe is wrong for everything else.
  if (!detected) return false;
  return metals.some((m) => detected.startsWith(norm(m)) || norm(m).startsWith(detected));
}

const titleWords = (title) => new Set(
  norm(title)
    .replace(/\(([^)]*)\)/g, ' $1 ')
    .split(/[^a-z0-9.]+/)
    .filter((w) => w && w.length > 1),
);

/**
 * Best title-word-overlap match from a candidate list, or null. Ties and zero
 * overlap return null rather than guessing — size qualifiers ("up to 3mm" vs
 * "3 to 5mm") are what break the ties correctly.
 */
function bestTitleMatch(task, candidates = []) {
  const base = titleWords(task?.title);
  let best = null;
  let bestScore = 0;
  let tied = false;
  for (const candidate of candidates) {
    const words = titleWords(candidate.title);
    let score = 0;
    for (const w of base) if (words.has(w)) score += 1;
    if (score > bestScore) { best = candidate; bestScore = score; tied = false; }
    else if (score === bestScore && score > 0) tied = true;
  }
  return bestScore > 0 && !tied ? best : null;
}

/** The metal-specific counterpart of a generic task, or null. */
export function metalCounterpartFor(task, metalType, availableTasks = []) {
  if (!norm(metalType)) return null;
  const candidates = (availableTasks || []).filter((t) =>
    Array.isArray(t?.metals) && t.metals.length > 0 && taskAllowsMetal(t, metalType));
  return bestTitleMatch(task, candidates);
}

/**
 * Align a matched-task list to the detected metal. Returns a new array:
 * restricted tasks for other metals are dropped, generic tasks are swapped for
 * their counterpart when the metal has one, duplicates collapse.
 */
export function alignTasksToMetal(tasks = [], metalType = '', availableTasks = []) {
  const out = [];
  const seen = new Set();
  // Generic tasks, for landing a wrong-metal restricted match on its sibling
  // (a platinum match on a gold job usually means the generic task was the intent).
  const generics = (availableTasks || []).filter((t) => !(Array.isArray(t?.metals) && t.metals.length));

  for (const task of tasks) {
    let resolved = task;
    if (!taskAllowsMetal(task, metalType)) {
      const bestGeneric = bestTitleMatch(task, generics);
      if (!bestGeneric) continue; // wrong recipe for the metal and no sibling — drop
      resolved = bestGeneric;
    } else if (!(Array.isArray(task?.metals) && task.metals.length)) {
      const counterpart = metalCounterpartFor(task, metalType, availableTasks);
      if (counterpart) resolved = counterpart;
    }
    const key = String(resolved._id || resolved.title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }
  return out;
}
