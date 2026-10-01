/**
 * The shop's online repair estimate, priced by THE engine — efd-shop asks admin for it
 * (POST /api/pricing/estimate) instead of running its own copy of the pricing code. That copy was the
 * old engine with its own fallbacks, a $5 rounding (owner, 2026-09-30: "stop rounding") and a
 * `platinum_null` metal key that matched no stock.
 *
 * Pure. The route loads the context and the tasks.
 */
import { priceTask, metalKey } from './engine';

const SIZING_STOCK = /sizing stock/i;

/**
 * A sizing task taken up N sizes: labor once, one more portion of sizing stock per extra size — the
 * stored task already includes the first. Tasks with no sizing stock are returned untouched. (Moved
 * from the shop, where it fed its vendored engine.)
 */
export function withSizeCount(task, sizeCount) {
  const n = Number(sizeCount);
  if (!Number.isFinite(n) || n <= 1 || !Array.isArray(task?.materials)) return task;
  let scaled = false;
  const materials = task.materials.map((m) => {
    if (!SIZING_STOCK.test(String(m?.name || m?.displayName || m?.materialName || ''))) return m;
    scaled = true;
    return { ...m, quantity: (Number(m.quantity) || 1) * n };
  });
  return scaled ? { ...task, materials } : task;
}

/**
 * Retail for each task in each metal still in play. `metals` are the customer's metal as intake
 * describes it ({ metalType, karat, goldColor }) — or empty for "not sure", which means every metal the
 * catalog stocks. A metal a task can't be priced in is left out of `prices` (never $0).
 *
 * @returns {{ id, title, category, prices: { [metalKey]: number } }[]}
 */
export function estimateTasks({ tasks = [], ctx, metals = [], sizeCount = 1 }) {
  const keys = (Array.isArray(metals) && metals.length ? metals.map(metalKey) : ctx.metals).filter(Boolean);
  return tasks.map((task) => {
    const scaled = withSizeCount(task, sizeCount);
    const prices = {};
    const flat = priceTask({ task: scaled, settings: ctx.settings, materials: ctx.materials, tools: ctx.tools, metal: null });
    for (const key of keys) {
      const r = flat.ok ? flat : priceTask({ task: scaled, settings: ctx.settings, materials: ctx.materials, tools: ctx.tools, metal: key });
      if (r.ok) prices[key] = r.retail.listUnit;
    }
    return { id: String(task._id), title: task.title || task.displayName || task.name || '', category: task.category || '', prices };
  });
}
