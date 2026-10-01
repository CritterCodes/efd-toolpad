/**
 * What a scanned ticket can be told to do (owner, 2026-09-30: "we have scan to claim in MyBench, but
 * there's no scan to do anything else … it would also be a lot faster to be able to send something to
 * communications or needs parts").
 *
 * Scanning was only ever wired to CLAIM, so every other move meant finding the job on screen and
 * clicking it — slowest at exactly the moment the piece is in your hand and the scanner is already
 * pointing at it.
 *
 * TWO DISPATCH SHAPES, because the workflow already has two.
 *
 *   per-repair   a real workflow transition with its own route and its own side effects — claiming
 *                assigns the bench, moving to QC stamps who sent it. One call each; one can fail
 *                without taking the batch down.
 *   bulk         a plain status move (PUT /api/repairs/move), which the server already does for a
 *                list in one call and refuses for any status that has a dedicated action.
 *
 * Keeping the map here rather than in the page means the set of things a scan can do is a list you
 * can read, and the dispatch is testable without a scanner or a browser.
 */
import { REPAIR_STATUS } from '@/services/repairWorkflow';

export const SCAN_ACTIONS = Object.freeze([
  { key: 'claim', label: 'Claim', verb: 'Claimed', mode: 'per-repair', path: (id) => `/api/repairs/${encodeURIComponent(id)}/claim` },
  { key: 'qc', label: 'Move to QC', verb: 'Sent to QC', mode: 'per-repair', path: (id) => `/api/repairs/${encodeURIComponent(id)}/move-to-qc` },
  { key: 'parts', label: 'Needs parts', verb: 'Marked needs parts', mode: 'bulk', status: REPAIR_STATUS.NEEDS_PARTS },
  { key: 'comms', label: 'Communications', verb: 'Sent to communications', mode: 'bulk', status: REPAIR_STATUS.COMMUNICATION_REQUIRED },
  { key: 'ready', label: 'Ready for work', verb: 'Moved to ready for work', mode: 'bulk', status: REPAIR_STATUS.READY_FOR_WORK },
  // QC sign-off by scan (owner, 2026-10-01: "I need to be able to scan jobs to approve them at QC"). The same
  // route the Move & QC page uses: credits labor, completes, auto-invoices. Only offered to qualityControl
  // holders, and the route refuses a job that isn't in QC.
  { key: 'approve', label: 'Approve QC', verb: 'Approved', mode: 'per-repair', capability: 'qualityControl', path: (id) => `/api/repairs/${encodeURIComponent(id)}/complete-from-qc` },
]);

/** The actions this person may run: an action with a `capability` needs it (hasNamedCapability). */
export function scanActionsFor(hasCapability = () => false) {
  return SCAN_ACTIONS.filter((a) => !a.capability || hasCapability(a.capability));
}

export function scanActionByKey(key) {
  return SCAN_ACTIONS.find((a) => a.key === key) || null;
}

/**
 * Run one scan action over a queue of repair IDs.
 *
 * Returns { ok, failed } — never throws, because a scanner batch is a physical pile of work and the
 * useful answer is which tickets moved, not an exception that loses the whole queue. Per-repair
 * failures are reported individually; a bulk failure names every ID it covered, since the server
 * applied it as one statement.
 */
export async function runScanAction({ action, repairIDs = [], fetchImpl = fetch } = {}) {
  const ids = [...new Set(repairIDs.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!action || ids.length === 0) return { ok: [], failed: [] };

  const readError = async (res, fallback) => {
    const body = await res.json().catch(() => ({}));
    return body.error || fallback;
  };

  if (action.mode === 'bulk') {
    try {
      const res = await fetchImpl('/api/repairs/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repairIDs: ids, status: action.status }),
      });
      if (!res.ok) {
        const error = await readError(res, 'Could not move these repairs.');
        return { ok: [], failed: ids.map((repairID) => ({ repairID, error })) };
      }
      return { ok: ids, failed: [] };
    } catch (error) {
      return { ok: [], failed: ids.map((repairID) => ({ repairID, error: error?.message || String(error) })) };
    }
  }

  const ok = [];
  const failed = [];
  for (const repairID of ids) {
    try {
      const res = await fetchImpl(action.path(repairID), { method: 'POST' });
      if (res.ok) ok.push(repairID);
      else failed.push({ repairID, error: await readError(res, `Could not ${action.label.toLowerCase()}.`) });
    } catch (error) {
      failed.push({ repairID, error: error?.message || String(error) });
    }
  }
  return { ok, failed };
}

/** Pure: what to tell the person afterwards, in one line. */
export function summarizeScanRun({ action, ok = [], failed = [] }) {
  const verb = action?.verb || 'Updated';
  const parts = [];
  if (ok.length) parts.push(`${verb} ${ok.length} repair${ok.length === 1 ? '' : 's'}.`);
  if (failed.length) parts.push(`${failed.length} failed: ${failed.map((f) => `${f.repairID} — ${f.error}`).join('; ')}`);
  return {
    text: parts.join(' ') || 'Nothing to do.',
    severity: failed.length ? (ok.length ? 'warning' : 'error') : 'success',
  };
}
