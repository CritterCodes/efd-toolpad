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

export async function getTaskSuggestions(search = '', limit = 40) {
  const dbi = await db.connect();
  const term = String(search || '').trim();
  const rx = term ? { $regex: escapeRegex(term), $options: 'i' } : null;

  // Repair / bench task catalog — via TasksService so labor cost is computed by
  // the pricing engine on read (NOT the stale stored pricing.laborCost).
  let repair = [];
  try {
    const result = await TasksService.getTasks({ isActive: true, ...(term ? { search: term } : {}), limit });
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
