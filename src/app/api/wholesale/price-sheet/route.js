import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { TasksModel } from '@/app/api/tasks/model';
import { priceTask, laborHoursFor } from '@/services/pricing/engine';
import { loadPricingContext, metalsForTask } from '@/services/pricing/catalog';
import { tierLabel } from '@/services/pricing/quantityTiers';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * GET /api/wholesale/price-sheet — the live wholesale service price list.
 *
 * EVERY NUMBER IS THE ONE ENGINE'S (services/pricing/engine.js) — the same function the counter, the
 * task list and the shop charge with. This route used to run its own copy of the volume-tier maths
 * (tool share only, so a margin setting below 100% would have been ignored — EFD-DEFECTS P10) and to
 * price a "flat" base with no metal, which for a metal-dependent task charged its materials at $0.
 *
 *   - a task that doesn't depend on metal → one flat `wholesalePrice`
 *   - a task that does, or is restricted to certain metals → `byMetal`, one price per metal it can be
 *     priced in; a metal the engine refuses (no stock) is OMITTED, never shown as $0
 *   - `volumeTiers` → each tier's price (flat rows), or the per-unit deduction when it's the same in
 *     every metal; per-metal tier prices when it isn't
 *   - a task that can't be priced in any metal is left off the sheet
 *
 * THE PROJECTION IS STILL THE POINT. Only name, category, price and labor hours cross to a partner —
 * labor cost, base cost, margins and recipes stay home.
 */
export async function GET() {
  const { errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const [result, ctx] = await Promise.all([
      TasksModel.getTasks({ isActive: true, limit: 1000 }),
      loadPricingContext(),
    ]);
    const { settings, materials, tools, metals } = ctx;
    const tiers = settings.quantityTiers.filter((t) => t.toolPct < 100 || t.marginPct < 100);

    const rows = [];
    for (const task of result.tasks || []) {
      const price = (metal, quantity = 1) => priceTask({ task, settings, materials, tools, metal, quantity });

      const restricted = Array.isArray(task.metals) && task.metals.length > 0;
      const flat = restricted ? null : price(null);
      const byMetal = {};
      for (const key of metalsForTask(task, metals)) {
        const r = price(key);
        if (r.ok) byMetal[key] = r.wholesale.listUnit;
      }

      // One flat number when the task doesn't depend on metal: it prices with no metal, and every metal
      // gives that same number. A metal-restricted task always keeps its metal label.
      const isFlat = Boolean(flat?.ok) && Object.values(byMetal).every((w) => w === flat.wholesale.listUnit);
      if (!isFlat && Object.keys(byMetal).length === 0) continue; // nothing priceable

      const volumeTiers = [];
      for (const tier of tiers) {
        if (isFlat) {
          const r = price(null, tier.minQty);
          const discount = round2(r.wholesale.listUnit - r.wholesale.unit);
          if (discount > 0) volumeTiers.push({ minQty: tier.minQty, label: tierLabel(settings.quantityTiers, tier), unitDiscount: discount, price: r.wholesale.unit });
          continue;
        }
        const perMetal = {};
        const discounts = new Set();
        for (const key of Object.keys(byMetal)) {
          const r = price(key, tier.minQty);
          if (!r.ok) continue;
          perMetal[key] = r.wholesale.unit;
          discounts.add(round2(r.wholesale.listUnit - r.wholesale.unit));
        }
        if (![...discounts].some((d) => d > 0)) continue;
        const label = tierLabel(settings.quantityTiers, tier);
        volumeTiers.push(discounts.size === 1
          ? { minQty: tier.minQty, label, unitDiscount: [...discounts][0] }
          : { minQty: tier.minQty, label, byMetal: perMetal });
      }

      rows.push({
        title: task.title,
        category: task.category || 'General',
        sku: task.sku || task.shortCode || null,
        laborHours: round2(laborHoursFor(task)) || null,
        ...(volumeTiers.length ? { volumeTiers } : {}),
        ...(isFlat ? { wholesalePrice: flat.wholesale.listUnit } : { byMetal }),
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
    // Includes missing pricing settings: the sheet is refused rather than priced from guesses.
    return NextResponse.json({ error: 'Could not load the price list.' }, { status: 500 });
  }
}
