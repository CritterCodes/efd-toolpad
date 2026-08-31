import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { TasksService } from '@/app/api/tasks/service';
import { calculateTaskCost } from '@/services/pricing/task.pricing';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * The metal contexts a task can be priced for, in display order. Derived from the
 * materials catalog rather than hardcoded: a context is offered only when some
 * metal-dependent material actually carries a Stuller variant for it, because
 * that is exactly the condition under which the pricing engine can price it.
 */
const CONTEXT_ORDER = [
  'sterling_silver_925',
  'yellow_gold_10k', 'white_gold_10k', 'rose_gold_10k',
  'yellow_gold_14k', 'white_gold_14k', 'rose_gold_14k',
  'yellow_gold_18k', 'white_gold_18k', 'rose_gold_18k',
  'platinum_950',
];
const variantKey = (p) => `${p.metalType}_${p.karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

function availableContexts(materials) {
  const seen = new Set();
  for (const m of materials) {
    if (!m.isMetalDependent || !Array.isArray(m.stullerProducts)) continue;
    for (const p of m.stullerProducts) seen.add(variantKey(p));
  }
  return CONTEXT_ORDER.filter((k) => seen.has(k));
}

/**
 * GET /api/wholesale/price-sheet — the live wholesale service price list.
 *
 * PRICED THROUGH THE INTAKE ENGINE, PER METAL. The first version read the stored
 * `pricing.wholesalePrice`, which is computed WITHOUT a metal context — the
 * base-metal number. A half-shank consumes sizing stock that costs ~$5 in silver
 * and ~$145 in 14k gold, so the sheet quoted gold work at silver-ish prices
 * (owner caught it on sight). Every row now runs `calculateTaskCost` — the same
 * function the repair intake form charges with — once per metal context; a task
 * whose price doesn't move across metals collapses to one flat number, and a
 * metal the engine can't price (no material variant) is omitted rather than
 * shown as $0: quote on request beats a wrong number.
 *
 * THE PROJECTION IS STILL THE POINT. Only name, category, price, and labor hours
 * cross to a partner — labor cost, base cost, margins, and recipes stay home.
 */
export async function GET() {
  const { errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const [result, deps] = await Promise.all([
      TasksService.getTasks({ isActive: true, limit: 1000 }),
      TasksService.loadPricingDependencies(),
    ]);
    if (!result.success) {
      return NextResponse.json({ error: 'Could not load the price list.' }, { status: 500 });
    }
    const { adminSettings, materials } = deps;
    const contexts = availableContexts(materials);

    const rows = [];
    for (const task of result.data || []) {
      let base = null;
      try {
        base = calculateTaskCost(task, adminSettings, [], materials, null);
      } catch { /* a task the engine can't price is not purchasable — skip below */ }
      const flat = round2(base?.wholesalePrice);

      // Price the task for each metal the catalog can support. A context where a
      // required material has no variant comes back flagged (unmatchedMaterials)
      // and is omitted — never rendered as $0.
      const byMetal = {};
      for (const contextKey of contexts) {
        try {
          const priced = calculateTaskCost(task, adminSettings, [], materials, contextKey);
          if ((priced.unmatchedMaterials || []).length > 0) continue;
          const w = round2(priced.wholesalePrice);
          if (w > 0) byMetal[contextKey] = w;
        } catch { /* unpriceable in this metal — omit the chip */ }
      }

      // Metal-independent tasks price identically everywhere — one flat number.
      const distinct = new Set(Object.values(byMetal));
      const isFlat = distinct.size <= 1 && (distinct.size === 0 || [...distinct][0] === flat);

      if (!(flat > 0) && distinct.size === 0) continue; // nothing priceable

      rows.push({
        title: task.title,
        category: task.category || 'General',
        sku: task.sku || task.shortCode || null,
        laborHours: Number(task.laborHours) || null,
        ...(isFlat
          ? { wholesalePrice: flat > 0 ? flat : [...distinct][0] }
          : { byMetal }),
      });
    }

    rows.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      rows,
    });
  } catch (error) {
    console.error('GET /api/wholesale/price-sheet error:', error);
    return NextResponse.json({ error: 'Could not load the price list.' }, { status: 500 });
  }
}
