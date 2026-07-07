import { redirect } from 'next/navigation';

/**
 * 0008 C-4 (Track B, owner-signed) — the standalone Awaiting-Approval queue is retired. Per §3.3 / D2
 * it is now a SAVED STATUS FILTER on the one catalog: the unified `dashboard/products` list exposes
 * `status:'pending-approval'` with per-row approve/reject/publish actions (built in C-2). Redirect the
 * old page to that filtered view so bookmarks don't 404.
 *
 * Reversible: the prior page + its 5 section components + the `useAwaitingApproval` hook stay in git
 * history (D9 — code left dormant, deleted in a later cleanup once logs show zero hits).
 */
export default function AwaitingApprovalRedirect() {
  redirect('/dashboard/products?status=pending-approval');
}
