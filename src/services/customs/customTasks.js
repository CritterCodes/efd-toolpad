/**
 * Task suggestions for the custom quote builder — autocomplete sourced from BOTH
 * the shared bench/repair task catalog (`tasks`, with computed labor cost) and
 * historical custom labor tasks (distinct `quote.laborTasks` across customOrders).
 * Repair-catalog entries win on dedupe (they carry cost + hours).
 */
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import { TasksService } from '@/app/api/tasks/service';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getTaskSuggestions(search = '', limit = 40, context = null) {
  const dbi = await db.connect();
  const term = String(search || '').trim();
  const rx = term ? { $regex: escapeRegex(term), $options: 'i' } : null;

  // Repair / bench task catalog — via TasksService so labor cost is computed by
  // the pricing engine on read (NOT the stale stored pricing.laborCost). When a
  // `context` is given (e.g. 'custom') the catalog is scoped to tasks tagged with
  // that context, so the quote builder only offers custom-relevant tasks — repair
  // tasks opt in via their `contexts` tag. No context = the full active catalog.
  let repair = [];
  try {
    const result = await TasksService.getTasks({ isActive: true, ...(context ? { context } : {}), ...(term ? { search: term } : {}), limit });
    repair = (result?.data || [])
      .filter((t) => t.title)
      .map((t) => ({
        label: t.title,
        cost: Number(t.pricing?.laborCost) || 0,
        hours: Number(t.pricing?.totalLaborHours ?? t.laborHours) || 0,
        category: t.category || null,
        source: 'repair',
      }));
  } catch { /* catalog unavailable */ }

  // Historical custom labor tasks.
  let custom = [];
  try {
    const agg = await dbi.collection(Constants.CUSTOM_ORDERS_COLLECTION).aggregate([
      { $unwind: { path: '$quote.laborTasks', preserveNullAndEmptyArrays: false } },
      ...(rx ? [{ $match: { 'quote.laborTasks.description': rx } }] : []),
      { $group: { _id: '$quote.laborTasks.description', cost: { $last: '$quote.laborTasks.cost' } } },
      { $limit: limit },
    ]).toArray();
    custom = agg.filter((c) => c._id).map((c) => ({ label: c._id, cost: Number(c.cost) || 0, hours: 0, source: 'custom' }));
  } catch { /* no custom history yet */ }

  // Dedupe by lowercased label; repair catalog (richer) wins.
  const seen = new Set();
  const out = [];
  for (const s of [...repair, ...custom]) {
    const key = s.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.slice(0, limit);
}

/**
 * Resolve a custom-context catalog task (by exact title) into a quote labor LINE.
 * Cost = the task's engine-computed laborCost (its `minimumLaborPrice` floor); falls
 * back to `fallbackCost` if the task is missing/zero (e.g. the seed hasn't run). The
 * line is marked `discipline:'cad'` + `noWorkOrder` so it folds into the quote's labor
 * COG but is NOT re-spawned as a bench work order at casting (CAD/GLB/QC have their own
 * flows). `autoKey` lets the auto-add dedupe itself on re-assign / re-create.
 */
export async function getCustomTaskLine(title, { autoKey = null, fallbackCost = 0 } = {}) {
  let cost = 0; let hours = 0;
  try {
    const result = await TasksService.getTasks({ isActive: true, context: 'custom', search: title, limit: 10 });
    const match = (result?.data || []).find((t) => String(t.title).toLowerCase() === String(title).toLowerCase());
    if (match) {
      cost = Number(match.pricing?.laborCost) || 0;
      hours = Number(match.pricing?.totalLaborHours ?? match.laborHours) || 0;
    }
  } catch { /* fall back below */ }
  const resolved = cost > 0 ? cost : (Number(fallbackCost) || 0);
  return { description: title, quantity: 1, cost: resolved, hours, discipline: 'cad', source: 'auto', autoKey, noWorkOrder: true };
}

/** Merge an auto labor line into a laborTasks array, replacing any prior line with the
 *  same `autoKey` (idempotent on re-assign / re-create). */
export function mergeAutoLaborLine(laborTasks = [], line) {
  const kept = (laborTasks || []).filter((t) => !(line.autoKey && t.autoKey === line.autoKey));
  return [...kept, line];
}
