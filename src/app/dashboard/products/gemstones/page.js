import { redirect } from 'next/navigation';

/**
 * 0008 C-4 (Track B, owner-signed) — the gemstones LIST is retired; superseded by the unified
 * `dashboard/products` catalog (§3.3). Redirect (carry the type per §3.3 spelling) so old bookmarks
 * don't 404. Reversible: the prior list + its section components stay in git history (D9 — dormant code).
 *
 * The `[id]` gemstone EDITOR is DEFERRED, not retired (D8): the unified M4-T1 editor is currently a
 * minimal price + run-size dialog, NOT a full-fidelity equivalent of the typed gemstone editor
 * (species/carat/certification/pricing). Redirecting it now would regress editing. Retire once the
 * polymorphic editor is a confirmed equivalent (owner UX rework, thread #214). See the C-4 report note.
 */
export default function GemstonesListRedirect() {
  redirect('/dashboard/products?type=gemstone');
}
