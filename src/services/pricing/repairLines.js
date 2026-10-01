/**
 * Price every line on a repair, and its totals, with THE engine (./engine.js). Intake (both screens),
 * the server's save and the shop's estimate call this one function — so a repair is priced the same way
 * wherever it is priced.
 *
 * A line's price is DERIVED, never carried: the intake form keeps what the person chose (the task, the
 * material, the quantity) and this function says what it costs, every time the form changes. That is
 * what makes "a metal change re-prices the ticket" and "a quantity change moves the volume tier" true by
 * construction, instead of being remembered by every handler that touches a line.
 *
 * Lines and how each is priced:
 *   tasks[]            catalog task      → priceTask (the catalog's recipe when the task is found there)
 *                      isCustomLabor     → priceCustomLabor (hours); a typed price is the person's
 *                                          override (priceOverridden) and is kept
 *   materials[]        isStullerItem     → pricePart (the part's Stuller cost)
 *                      catalog material  → priceMaterial (the catalog's material when found there)
 *   customLineItems[]  typed by a person — its price IS the input, nothing to calculate
 *
 * A line that can't be priced gets `price: null` and a `pricingError` saying why, and is listed in
 * `unpriced`. It adds nothing to the subtotal and the form must not submit while any exist — "If it can't
 * be calculated, it doesn't show" (owner, 2026-09-30).
 *
 * TICKET PRICES ARE A RECORD. A line loaded from a saved ticket carries `ticketPrice: true` and keeps the
 * price it was written with ("do not wipe the repair tickets. This is preventative, not changing the
 * past" — owner, 2026-09-30) until someone changes that line, the metal, or who the ticket is for.
 */
import {
  priceTask, priceMaterial, pricePart, priceCustomLabor, priceRepairTotals,
  storeResalePrice, cannotPriceMessage, laborHoursFor,
} from './engine';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const qtyOf = (line) => Math.max(Math.floor(Number(line?.quantity) || 1), 1);

const findById = (list, line) => {
  const id = line?._id ?? line?.taskId ?? line?.materialId;
  if (id == null || !Array.isArray(list)) return null;
  return list.find((item) => String(item?._id) === String(id)) || null;
};

/** A line's metal: the ticket's metal, as intake holds it. */
const ticketMetal = (form) => (form?.metalType ? { metalType: form.metalType, karat: form.karat, goldColor: form.goldColor } : null);

function priced(line, { paid, retail, list = paid, tier = null, extra = {} }, ctx) {
  return {
    ...line,
    ...extra,
    price: paid,
    listUnitPrice: list,
    // What the customer is charged at retail — or, on a store's ticket, what the store charges ITS
    // customer (its own markup on what it pays us). Null when the store's markup didn't load.
    retailPrice: ctx.isWholesale ? storeResalePrice(paid, ctx.storeMarkup) : retail,
    quantityTier: tier,
    pricingError: null,
  };
}

function unpricedLine(line, message) {
  return { ...line, price: null, listUnitPrice: null, retailPrice: null, quantityTier: null, pricingError: message };
}

function priceTaskLine(line, form, ctx) {
  const { settings, isWholesale } = ctx;
  const quantity = qtyOf(line);

  if (line?.isCustomLabor === true) {
    const r = priceCustomLabor({ laborHours: line.laborHours, settings, quantity });
    if (!r.ok) {
      if (line.priceOverridden && Number(line.price) >= 0) return priced(line, { paid: round2(line.price), retail: round2(line.price) }, ctx);
      return unpricedLine(line, 'Enter the hours for this labor.');
    }
    const calculated = isWholesale ? r.wholesale.unit : r.retail.unit;
    const paid = line.priceOverridden ? round2(line.price) : calculated;
    return priced(line, {
      paid,
      retail: line.priceOverridden ? paid : r.retail.unit,
      list: calculated,
      extra: { pricing: breakdown(r), laborHours: Number(line.laborHours) || 0 },
    }, ctx);
  }

  const task = findById(ctx.tasks, line) || line;
  const r = priceTask({ task, settings, materials: ctx.materials, tools: ctx.tools, metal: ticketMetal(form), quantity });
  if (!r.ok) return unpricedLine(line, cannotPriceMessage(r));
  const side = isWholesale ? r.wholesale : r.retail;
  return priced(line, {
    paid: side.unit,
    retail: r.retail.unit,
    list: side.listUnit,
    tier: side.tier,
    // Labor credit at QC and the promise-date estimate read these off the line.
    extra: { pricing: breakdown(r), laborHours: round2(laborHoursFor(task)) },
  }, ctx);
}

function priceMaterialLine(line, form, ctx) {
  const { settings, isWholesale } = ctx;
  // A part typed in by hand on the bench ("Spring bar, $12") is a charge a person entered — like a
  // custom charge, its price IS the input. Nothing to calculate.
  if (line?.category === 'manual_material' && !line?.isStullerItem) {
    const typed = Math.max(round2(line.price), 0);
    return priced(line, { paid: typed, retail: typed }, ctx);
  }
  if (line?.isStullerItem) {
    const r = pricePart({ cost: line.stullerPrice ?? line.unitCost ?? line.stullerData?.originalPrice, settings });
    if (!r.ok) return unpricedLine(line, "Can't price this part — it has no Stuller cost.");
    return priced(line, { paid: isWholesale ? r.wholesale.unit : r.retail.unit, retail: r.retail.unit, extra: { pricing: materialBreakdown(r) } }, ctx);
  }
  const material = findById(ctx.materials, line) || line;
  const r = priceMaterial({ material, settings, metal: ticketMetal(form) });
  if (!r.ok) return unpricedLine(line, cannotPriceMessage(r));
  return priced(line, { paid: isWholesale ? r.wholesale.unit : r.retail.unit, retail: r.retail.unit, extra: { pricing: materialBreakdown(r) } }, ctx);
}

// A material line's cost, per unit — for the screens' cost breakdown. Not a price.
const materialBreakdown = (r) => ({
  baseMaterialsCost: r.unitCost,
  baseCost: r.unitCost,
  retailPrice: r.retail.unit,
  wholesalePrice: r.wholesale.unit,
});

function breakdown(r) {
  return {
    laborCost: r.laborCost,
    totalLaborHours: r.laborHours,
    baseMaterialsCost: r.materialsCost,
    toolDepreciationCost: r.toolCost,
    baseCost: r.baseCost,
    retailPrice: r.retail.listUnit,
    wholesalePrice: r.wholesale.listUnit,
  };
}

const keepTicketPrice = (line) => line?.ticketPrice === true && line.price != null;

/**
 * Price a repair.
 *
 * @param {object} form  { tasks, materials, customLineItems, metalType, karat, goldColor, isWholesale,
 *                         isRush, includeDelivery, includeTax, compRepair, includedWithSale }
 * @param {object} ctx   { settings (resolved), tasks, materials, tools, storeMarkup }
 * @returns {{ tasks, materials, customLineItems, totals, unpriced }}
 */
export function priceRepairLines(form = {}, ctx = {}) {
  const lineCtx = { ...ctx, isWholesale: form.isWholesale === true };
  const tasks = (form.tasks || []).map((line) => (keepTicketPrice(line) ? line : priceTaskLine(line, form, lineCtx)));
  const materials = (form.materials || []).map((line) => (keepTicketPrice(line) ? line : priceMaterialLine(line, form, lineCtx)));
  const customLineItems = (form.customLineItems || []).map((line) => ({
    ...line,
    price: Math.max(round2(line.price), 0),
    retailPrice: lineCtx.isWholesale ? storeResalePrice(Math.max(round2(line.price), 0), ctx.storeMarkup) : Math.max(round2(line.price), 0),
  }));

  const unpriced = [
    ...tasks.filter((l) => l.price == null).map((l) => ({ type: 'tasks', id: l.id, title: l.title || l.displayName || 'A task', message: l.pricingError })),
    ...materials.filter((l) => l.price == null).map((l) => ({ type: 'materials', id: l.id, title: l.displayName || l.name || 'A material', message: l.pricingError })),
  ];

  const lineSum = (lines) => lines.reduce((sum, l) => sum + (l.price == null ? 0 : Number(l.price) * qtyOf(l)), 0);
  const subtotal = round2(lineSum(tasks) + lineSum(materials) + lineSum(customLineItems));
  const totals = priceRepairTotals({
    subtotal,
    settings: ctx.settings,
    isWholesale: lineCtx.isWholesale,
    isRush: form.isRush === true,
    includeDelivery: form.includeDelivery === true,
    includeTax: form.includeTax === true,
    comped: form.compRepair === true || form.includedWithSale === true,
  });

  return { tasks, materials, customLineItems, totals, unpriced };
}

/** Mark every line of a saved ticket as carrying its ticket price (edit mode loads it this way). */
export function asTicketLines(lines = []) {
  return (lines || []).map((line) => (line && line.price != null ? { ...line, ticketPrice: true } : line));
}

/** Clear the ticket-price mark — the line will be priced live from now on. */
export const releaseTicketPrice = (line) => {
  if (!line?.ticketPrice) return line;
  const { ticketPrice, ...rest } = line;
  return rest;
};

/**
 * A stored repair's metal, as the engine reads it. Create stores `metalType` as "gold - 14k" (the
 * route folds the karat in); the form sends "gold" + "14k". Both mean the same metal.
 */
export function repairMetal(repair = {}) {
  let metalType = String(repair?.metalType || '').trim();
  let karat = String(repair?.karat || '').trim();
  const folded = /^(.*?)\s+-\s+(\S+)$/.exec(metalType);
  if (folded) {
    metalType = folded[1];
    if (!karat) karat = folded[2];
  }
  return { metalType: metalType.toLowerCase(), karat, goldColor: repair?.goldColor || '' };
}

/**
 * Server side of "ticket prices are a record": a line that arrives marked `ticketPrice` keeps its price
 * ONLY if it is the same line, at the same price and quantity, as the saved ticket — and the ticket's
 * metal and billing haven't changed. Anything else is priced live. So a browser can't mark a line
 * `ticketPrice` to slip its own number through: only the number already on the ticket survives.
 */
export function honorTicketLines(lines = [], savedLines = [], { sameContext = false } = {}) {
  const savedList = savedLines || [];
  const saved = new Map(savedList.filter((l) => l?.id != null).map((l) => [String(l.id), l]));
  return (lines || []).map((line, index) => {
    if (!line?.ticketPrice) return line;
    // By id; an older ticket's lines may have none, and then it is the line in the same place.
    const was = line.id != null ? saved.get(String(line.id)) : (savedList[index]?.id == null ? savedList[index] : undefined);
    const unchanged = sameContext && was
      && Number(was.price) === Number(line.price)
      && Math.max(Number(was.quantity) || 1, 1) === Math.max(Number(line.quantity) || 1, 1);
    return unchanged ? line : releaseTicketPrice(line);
  });
}
