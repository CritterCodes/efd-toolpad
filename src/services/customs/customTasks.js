/**
 * Task suggestions for the custom quote builder — autocomplete sourced from BOTH
 * the shared bench/repair task catalog (`tasks`, with computed labor cost) and
 * historical custom labor tasks (distinct `quote.laborTasks` across customOrders).
 * Repair-catalog entries win on dedupe (they carry cost + hours).
 */
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import { TasksService } from '@/app/api/tasks/service';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The shop's hourly wage (settings.pricing.wage) — the rate hours are derived from. */
async function shopWage() {
  try {
    const s = await SettingsManagerService.getSettings();
    const wage = Number(s?.pricing?.wage);
    return wage > 0 ? wage : 50;
  } catch {
    return 50;
  }
}

/**
 * A labor line must carry HOURS, not just a price: hours are what the bench work order
 * plans and what the artisan is paid for. Flat-priced catalog tasks (QC review, GLB) store
 * a cost with no hours, so the line arrived with hours 0 and either the quoter retyped
 * them from memory or the payout planned at zero. When hours are missing, derive them
 * from the cost at the shop wage — an estimate, but an editable one that starts sane.
 */
function deriveHours(cost, hours, wage) {
  const h = Number(hours) || 0;
  if (h > 0) return h;
  const c = Number(cost) || 0;
  if (!(c > 0) || !(wage > 0)) return 0;
  return Math.round((c / wage) * 100) / 100;
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
      {
        $group: {
          _id: '$quote.laborTasks.description',
          cost: { $last: '$quote.laborTasks.cost' },
          // CARRY THE HOURS FORWARD. This was hardcoded to 0, so picking a task you had already
          // priced on a previous order re-filled the cost and silently blanked the hours — and hours
          // are what the bench jeweler is PAID for, so the quote builder had to retype them from
          // memory every time or the artisan's payout came out at zero.
          hours: { $last: '$quote.laborTasks.hours' },
          discipline: { $last: '$quote.laborTasks.discipline' },
        },
      },
      { $limit: limit },
    ]).toArray();
    custom = agg.filter((c) => c._id).map((c) => ({
      label: c._id,
      cost: Number(c.cost) || 0,
      hours: Number(c.hours) || 0,
      category: c.discipline || null,
      source: 'custom',
    }));
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
  // Flat-priced tasks (cost, no hours) get hours derived at the shop wage — see deriveHours.
  const wage = await shopWage();
  return out.slice(0, limit).map((s) => ({ ...s, hours: deriveHours(s.cost, s.hours, wage) }));
}

/**
 * Resolve a custom-context catalog task (by exact title) into a quote labor LINE.
 * Cost = the task's engine-computed laborCost (its `minimumLaborPrice` floor); falls
 * back to `fallbackCost` if the task is missing/zero (e.g. the seed hasn't run). Hours
 * are the catalog's, else derived from cost at the shop wage (see deriveHours).
 *
 * By default the line is `discipline:'cad'` + `noWorkOrder` so it folds into the
 * quote's labor COG but is NOT re-spawned as a bench work order at casting (CAD/GLB/QC
 * have their own flows). Real bench work auto-added to a quote — casting cleanup —
 * overrides `discipline`/`noWorkOrder` so it DOES become a bench work order.
 * `autoKey` lets the auto-add dedupe itself on re-assign / re-create.
 */
export async function getCustomTaskLine(title, {
  autoKey = null, fallbackCost = 0, discipline = 'cad', noWorkOrder = true,
  // Peer-artisan fees (GLB, CAD QC review) pass through at cost — no markup, no rush —
  // same principle as the design fee: EFD takes no cut of another artisan's craft.
  passThrough = false,
} = {}) {
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
  const wage = await shopWage();
  return {
    description: title, quantity: 1, cost: resolved,
    hours: deriveHours(resolved, hours, wage),
    discipline, source: 'auto', autoKey, noWorkOrder,
    // markup: 1 rides along for the editor's display; the engine keys off the flag itself.
    ...(passThrough ? { passThrough: true, markup: 1 } : {}),
  };
}

/** Merge an auto labor line into a laborTasks array, replacing any prior line with the
 *  same `autoKey` (idempotent on re-assign / re-create). */
export function mergeAutoLaborLine(laborTasks = [], line) {
  const kept = (laborTasks || []).filter((t) => !(line.autoKey && t.autoKey === line.autoKey));
  return [...kept, line];
}
