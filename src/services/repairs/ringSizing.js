/**
 * Is this ticket actually sizing a ring, and what are its sizes?
 *
 * Owner, 2026-10-01 (OPEN-QUESTIONS Q12): *"sometimes we have rings and we have nothing to do with sizing the ring.
 * It always makes us type in a ring size of what it is and what it's going to, but that's really only the case if
 * we're sizing a ring up or down. It doesn't hurt to have what size it is on file but it's just an extra step on
 * intake. If we're not touching anything revolving around sizing then I don't really care what size it is."*
 *
 * So the sizes are REQUIRED only when a line on the ticket sizes the ring up or down. They stay available on every
 * ring, because a size on file is useful — just not demanded.
 *
 * Detection is by the line's own title, the way the pricing engine spots sizing stock by material name
 * (services/pricing/estimate.js). Two tasks consume sizing stock WITHOUT resizing the ring — "Half-Shank" (a shank
 * repair) and "Sizing Beads" (makes a ring fit tighter, with no from→to) — so the material is the wrong signal and
 * "sizing" on its own is too loose. ringSizing.test.js pins every task title in the catalog as of 2026-10-01.
 */

/** A line that takes the ring up or down a size. `size up` / `size down` / `resize` / `re-size`, in any case. */
const SIZING_TITLE = /\b(?:size\s*(?:up|down)|re-?size|re-?sizing)\b/i;

const titleOf = (task) => String(task?.title || task?.displayName || task?.name || '');

/** Does this line size the ring up or down? Pure. */
export function isRingSizingTask(task) {
  return SIZING_TITLE.test(titleOf(task));
}

/** Does anything on this ticket size the ring? Pure. */
export function ticketSizesRing(tasks = []) {
  return (Array.isArray(tasks) ? tasks : []).some(isRingSizingTask);
}

/**
 * A ring size as a number, or null when it is unknown. Pure.
 *
 * `Number('')` is 0 and `Number.isFinite(0)` is true, so a blank size used to read as size 0 — which made a blank
 * current size with a desired 8 look like an eight-size jump and suggest seven half-sizes of sizing stock (Q12).
 * Unknown is null, never 0.
 */
export function ringSizeNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
