import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { TasksService } from '@/app/api/tasks/service';

/**
 * GET /api/wholesale/price-sheet — the live wholesale service price list.
 *
 * The numbers have always existed (`task.pricing.wholesaleCosts` per metal, the
 * computed `wholesalePrice` with the settings floor applied) but were reachable
 * only through staff-gated task APIs, so partners priced blind. This serves a
 * page in THEIR portal instead of a PDF: always current, no stale copies in
 * circulation.
 *
 * THE PROJECTION IS THE POINT. A task document carries the shop's internals —
 * labor cost, base cost, material/process recipes, retail margin structure.
 * Only what a partner needs to buy the service crosses here: name, category,
 * their price (flat or per-metal), and the labor-hours estimate. Nothing else,
 * so adding a field to tasks can't silently leak it onto the sheet.
 */
export async function GET() {
  const { errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const result = await TasksService.getTasks({ isActive: true, limit: 1000 });
    if (!result.success) {
      return NextResponse.json({ error: 'Could not load the price list.' }, { status: 500 });
    }

    const rows = [];
    for (const task of result.data || []) {
      const flat = Number(task.pricing?.wholesalePrice) || 0;
      // Per-metal wholesale prices, where the task varies by metal.
      const byMetal = {};
      for (const [metalKey, p] of Object.entries(task.universalPricing || {})) {
        const w = Number(p?.wholesalePrice) || 0;
        if (w > 0) byMetal[metalKey] = Math.round(w * 100) / 100;
      }
      // A task with no wholesale price anywhere isn't purchasable at trade terms —
      // leaving it off beats printing $0 and inviting a phone call.
      if (!(flat > 0) && Object.keys(byMetal).length === 0) continue;

      rows.push({
        title: task.title,
        category: task.category || 'General',
        sku: task.sku || task.shortCode || null,
        laborHours: Number(task.laborHours) || null,
        wholesalePrice: flat > 0 ? Math.round(flat * 100) / 100 : null,
        ...(Object.keys(byMetal).length ? { byMetal } : {}),
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
