/**
 * Drop collaborator management (ARTISAN_DROPS_AND_COLLABORATION — artisan-owned drops, 2026-07-22).
 * The owning artisan (or staff) curates the collaborator list; collaborators can see the drop and
 * add THEIR designs. Releasing stays with EFD (unaffected here). Pure list math — the route persists.
 */

/**
 * Apply an add/remove to a drop's collaborator list. PURE.
 * - dedupes and drops falsy ids
 * - never adds the owner as their own collaborator
 * - add is idempotent; remove is a no-op if absent
 */
export function applyCollaboratorChange(collaborators = [], { add = null, remove = null, ownerId = null } = {}) {
  let next = [...new Set((collaborators || []).filter(Boolean))];
  if (add && add !== ownerId && !next.includes(add)) next.push(add);
  if (remove) next = next.filter((c) => c !== remove);
  return next;
}
