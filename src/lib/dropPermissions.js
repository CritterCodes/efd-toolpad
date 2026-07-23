import { isStaff, canCreateDesignCategory } from '@/lib/designPermissions';

/**
 * Drop permissions — artisan-owned drops (owner, 2026-07-22): an artisan can create and CONTROL
 * their own drop (name, curation, collaborators), with collaborative artisans who can see it and
 * add THEIR designs to it. **Releasing stays with EFD** — artisans keep a drop in `draft`;
 * scheduling/releasing/archiving is staff-only.
 *
 * Ownership rides the existing drop fields (`ownerType: 'artisan'` + `ownerId`); collaborators is
 * a userID array on the drop. Pure session math, like designPermissions.
 */

export { isStaff };

/** Any design-authoring artisan may open their own drop (same gate as authoring designs). */
export function canCreateDrop(session) {
  // canCreateDesignCategory(non-gemstone) = the jewelry/design-authoring crew; gem cutters also
  // qualify via the gemstone gate — a cutter can run a drop of their cut stones.
  return isStaff(session) || canCreateDesignCategory(session, null) || canCreateDesignCategory(session, 'gemstone');
}

const sessionIds = (session) => [session?.user?.userID, session?.user?.email].filter(Boolean);

/** True when the artisan OWNS the drop (ownerType artisan + ownerId is them). */
export function ownsDrop(session, drop) {
  return drop?.ownerType === 'artisan' && sessionIds(session).includes(drop?.ownerId);
}

/** True when the artisan is a collaborator on the drop. */
export function collaboratesOnDrop(session, drop) {
  const ids = sessionIds(session);
  return Array.isArray(drop?.collaborators) && drop.collaborators.some((c) => ids.includes(c));
}

/** Control of the drop (edit meta/curation/collaborators): staff, or the owning artisan. */
export function canManageDrop(session, drop) {
  if (isStaff(session)) return true;
  return session?.user?.role === 'artisan' && ownsDrop(session, drop);
}

/** Visibility: managers + collaborators (collaborators add their designs; they don't run the drop). */
export function canViewDrop(session, drop) {
  return canManageDrop(session, drop) || (session?.user?.role === 'artisan' && collaboratesOnDrop(session, drop));
}

/** Mongo filter scoping a drop list to what the session may see. */
export function dropListFilter(session) {
  if (isStaff(session)) return {};
  const ids = sessionIds(session);
  const id = ids[0] || '__none__';
  return { $or: [{ ownerType: 'artisan', ownerId: { $in: ids.length ? ids : [id] } }, { collaborators: { $in: ids.length ? ids : [id] } }] };
}

/**
 * Restrict an artisan's drop patch to what they control. Releasing is EFD's: status may only be
 * 'draft'; releaseAt/releasedAt and ownership are untouchable. Returns { ok, error } — reject
 * loudly rather than silently stripping, so the UI can explain.
 */
export function validateArtisanDropPatch(body = {}, existing = {}) {
  if (body.status !== undefined && body.status !== 'draft' && body.status !== existing.status) {
    return { ok: false, error: 'Only EFD staff can schedule, release, or archive a drop.' };
  }
  for (const k of ['releaseAt', 'releasedAt']) {
    if (body[k] !== undefined && body[k] !== (existing[k] ?? null)) {
      return { ok: false, error: 'Only EFD staff can set release timing.' };
    }
  }
  if ((body.ownerType !== undefined && body.ownerType !== existing.ownerType)
    || (body.ownerId !== undefined && body.ownerId !== existing.ownerId)) {
    return { ok: false, error: 'Only EFD staff can reassign drop ownership.' };
  }
  return { ok: true };
}
