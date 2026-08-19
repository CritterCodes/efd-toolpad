/**
 * Custom-order quote math (C4 + structured-parity) — single COG-bucket model over
 * the legacy custom-ticket quote SHAPE (centerstone / mounting / accent stones /
 * additional materials / labor tasks / shipping lines + casting + designer/GLB/QC
 * fees). Everything folds into ONE COG bucket, then × cogMarkup (admin settings)
 * × rush. Artists are paid base fees; the marked-up amount is the customer price.
 *
 *   cog        = materials + labor + shipping + casting + designer + GLB + QC fees
 *
 * NOT everything is marked up. Three lines PASS THROUGH at cost, each for its own reason:
 *
 *   centre stone  — a bought-in good; the trade prices significant stones near cost (~1.3×), so it
 *                   carries its OWN markup rather than mounting keystone
 *   shipping      — a courier's invoice. Logistics, not craft; EFD added nothing to it
 *   design fee    — the CAD designer's own per-job fee. EFD collects it and hands it over; taking a
 *                   cut of an artisan's design work is the one thing it does not do
 *
 * Casting IS marked up: it is a production step in making the piece (alloy, file prep, vendor
 * management, and EFD eats a bad cast), like the mounting metal. Not to be confused with the at-cost
 * rule for billing an ARTISAN to cast their own piece — that is EFD declining to rent infrastructure.
 *
 *   quoteTotal = (marked-up work × rush) + (stone × stoneMarkup) + shipping + designFee
 *
 * NOTE (T2): new orders model CAD QC + GLB as LABOR LINES (quote.laborTasks), not the
 * `glbFee`/`qcReviewFee` fields — so those fields are 0 for new orders and counted via
 * `laborTotal`. The glbFee/qcReviewFee terms below remain ONLY for back-compat with
 * pre-T2 orders (which carry the fields and no QC/GLB labor lines) — no double count.
 * The designer fee stays a field (`designFee`, per-designer). Legacy flat fields
 * (materialCosts[]/laborCost/shippingCost) are still summed so pre-existing orders keep
 * computing. Pure (settings passed in) — unit-testable.
 */
const DEFAULT_COG_MARKUP = 2.5;
const DEFAULT_RUSH = 1.5;

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
const n = (v) => Number(v) || 0;
/** cost × quantity for line-item arrays (qty defaults to 1). */
function lineSum(arr) {
  return (arr || []).reduce((s, x) => s + n(x.cost) * Math.max(n(x.quantity) || 1, 1), 0);
}

/**
 * Marked-up REVENUE for a line array, honouring an optional per-line `markup`.
 *
 * Any material line can be a bought-in good that didn't earn keystone — one expensive melee, a $900
 * clasp — not just the centre stone. Rather than guess which (a size threshold would need a number
 * nobody can state, and would silently reprice a line that crossed it), each row carries an optional
 * override. Blank/0/junk ⇒ the default markup, so a quote with no overrides is priced exactly as
 * before.
 */
function lineRevenue(arr, defaultMarkup) {
  return (arr || []).reduce((s, x) => {
    const cost = n(x.cost) * Math.max(n(x.quantity) || 1, 1);
    const markup = n(x.markup) > 0 ? n(x.markup) : defaultMarkup;
    return s + cost * markup;
  }, 0);
}
/** Legacy generic material line: explicit cost, else qty × unitPrice. */
function legacyLine(m) {
  if (m.cost != null && m.cost !== '') return n(m.cost);
  return Math.max(n(m.quantity) || 1, 0) * n(m.unitPrice);
}

/** Same bounds the settings route already enforces on `financial.cogMarkup`. */
export const MARKUP_MIN = 1;
export const MARKUP_MAX = 10;

/**
 * Reject markup values that can only be typos. THROWS with a field-named message.
 *
 * Per-line markups made a decimal-point slip cheap: typing `0.13` instead of `1.3` on a $4,000 stone
 * quotes it at $520, and since nothing else in the quote moves, the order publishes $1,980 BELOW cost
 * with no error anywhere. The margin row is the only thing that would have shown it, and a quote
 * containing a pass-through stone already sits low, so it doesn't stand out.
 *
 * Bounds, not a schema: below 1 is selling under cost, above 10 is a stray digit (`25` for `2.5`).
 * Deliberate below-cost pricing — a loss leader, goodwill on a remake — should be a discount line, not
 * a markup under 1, precisely so it's visible as a decision rather than looking like arithmetic.
 *
 * 0/blank/absent is NOT an error: that's "no override", and every fallback below treats it that way.
 */
export function assertMarkupsSane(quote = {}) {
  const check = (label, raw) => {
    if (raw === undefined || raw === null || raw === '' || Number(raw) === 0) return; // unset
    const v = Number(raw);
    if (!Number.isFinite(v)) throw new Error(`${label} must be a number (got "${raw}").`);
    if (v < MARKUP_MIN || v > MARKUP_MAX) {
      throw new Error(
        `${label} of ${v} is outside the allowed ${MARKUP_MIN}–${MARKUP_MAX}× range. `
        + `A markup below ${MARKUP_MIN} would price the job under cost — check for a misplaced decimal point.`,
      );
    }
  };

  check('COG markup', quote.cogMarkup);
  check('Centre-stone markup', quote.centerstoneMarkup);
  // Per-line overrides are the ones a typo is most likely to hide in — there can be a dozen rows and
  // no single line is big enough to make the total look obviously wrong.
  for (const [field, rows] of [['Accent stone', quote.accentStones], ['Material', quote.additionalMaterials], ['Labor task', quote.laborTasks]]) {
    (rows || []).forEach((row, i) => check(`${field} #${i + 1} markup${row?.item || row?.description ? ` (${row.item || row.description})` : ''}`, row?.markup));
  }
}

export function computeQuote(quote = {}, settings = {}) {
  // The CENTER STONE is separated out because it does not carry mounting keystone. A natural diamond
  // bought at cost cannot take the 2.5× that the ring around it takes — the trade prices significant
  // stones far nearer cost (~1.3×), and applying the full markup either loses the sale or overcharges.
  // Everything else in the quote still folds into the single COG bucket.
  const centerstoneCost = n(quote.centerstone?.cost);
  const otherMaterialsTotal =
    n(quote.mounting?.cost)
    + lineSum(quote.accentStones) + lineSum(quote.additionalMaterials)
    + (quote.materialCosts || []).reduce((s, m) => s + legacyLine(m), 0); // legacy fallback
  const materialsTotal = centerstoneCost + otherMaterialsTotal;
  const laborTotal = lineSum(quote.laborTasks) + n(quote.laborCost);       // + legacy flat
  const shippingTotal = lineSum(quote.shippingCosts) + n(quote.shippingCost);
  const castingTotal = n(quote.castingCost);
  const designTotal = n(quote.designFee);
  const glbTotal = n(quote.glbFee);
  const qcTotal = n(quote.qcReviewFee);

  // `cog` remains the FULL cost of the job (centre stone included) — it is the cost basis every margin
  // figure and the margin-floor guardrail are measured against, so its meaning must not change.
  const cogExCenterstone = otherMaterialsTotal + laborTotal + shippingTotal + castingTotal + designTotal + glbTotal + qcTotal;
  const cog = cogExCenterstone + centerstoneCost;

  // Per-quote markup OVERRIDE wins over the admin-settings default (0/unset → use the
  // settings default, then the hard default). Lets the quote builder set a markup per job.
  const cogMarkup = n(quote.cogMarkup) > 0 ? n(quote.cogMarkup) : (n(settings.cogMarkup) > 0 ? n(settings.cogMarkup) : DEFAULT_COG_MARKUP);
  // Falls back to cogMarkup, NOT to a stone-specific default. That keeps every quote written before
  // this existed priced exactly as it was — the split only changes a number once someone sets it.
  const centerstoneMarkup = n(quote.centerstoneMarkup) > 0
    ? n(quote.centerstoneMarkup)
    : (n(settings.centerstoneMarkup) > 0 ? n(settings.centerstoneMarkup) : cogMarkup);
  let rushMultiplier = 1;
  if (quote.isRush) rushMultiplier = n(quote.rushMultiplier) > 1 ? n(quote.rushMultiplier) : (n(settings.rushMultiplier) > 1 ? n(settings.rushMultiplier) : DEFAULT_RUSH);
  else if (n(quote.rushMultiplier) > 1) rushMultiplier = n(quote.rushMultiplier); // legacy flat rush

  // REVENUE, line by line. Everything except the centre stone is marked up and then rushed; material
  // lines may each override the markup (see lineRevenue). With no overrides this is identically
  // `cogExCenterstone × cogMarkup`, so a quote written before per-line markups existed is unchanged.
  // Split by PAYMENT GATE (rules §12: stone → mounting → production), because the
  // shop's pay-over-time ladder needs each gate's real revenue — with per-line
  // markups, deriving it from a blended multiplier is wrong for any quote using
  // overrides. Their sum is rushableRevenue, so the total is unchanged.
  const mountingRevenue =
    n(quote.mounting?.cost) * cogMarkup
    + lineRevenue(quote.accentStones, cogMarkup)
    + lineRevenue(quote.additionalMaterials, cogMarkup)
    + (quote.materialCosts || []).reduce((s, m) => s + legacyLine(m), 0) * cogMarkup;
  const productionRevenue =
    // Labor lines honour a per-line markup too. Outsourced work billed through the quote — an
    // engraver charging $550 — is a vendor's invoice, not EFD bench time; forcing the blanket 2.5×
    // on it either overcharges the customer or forces the quoter to fake the cost. Markup 1 passes
    // it through at cost; anything between 1 and the default prices partial value-add. Blank/0 ⇒
    // the default markup, so existing quotes are priced exactly as before.
    lineRevenue(quote.laborTasks, cogMarkup) + n(quote.laborCost) * cogMarkup
    // Casting IS marked up — it is a production step in making the piece (alloy choice, file prep,
    // vendor management, and EFD eats a bad cast), exactly like the mounting metal. Not to be confused
    // with the at-cost rule for billing an ARTISAN for casting their own piece: that is EFD declining to
    // rent out infrastructure, and it does not apply to a customer buying a finished ring.
    + (castingTotal + glbTotal + qcTotal) * cogMarkup;
  const rushableRevenue = mountingRevenue + productionRevenue;

  // RUSH DOES NOT TOUCH THE CENTRE STONE (owner, 2026-08-11). A rush premium prices EFD's capacity —
  // reordering the bench queue, overtime, bumping other clients. A bought-in stone costs the same
  // whether it's set tomorrow or in three weeks, so rushing it buys the customer nothing.
  //
  // The magnitude is what settles it: on a $4,000 stone in a $1,000 ring at 1.5× rush, $2,600 of the
  // $3,850 uplift came from the stone — two thirds of the rush fee charged on the one line that took no
  // extra work, and more than the entire marked-up mounting. It's the same reasoning that keeps the
  // stone out of keystone: EFD didn't add that value.
  //
  // Real rush costs on a stone (paying up to source fast, air freight) belong where they land — a
  // higher stone cost, or the shipping bucket — not in a blanket 50%.
  //
  // A per-line markup override does NOT exempt that line from rush. An override says "price this
  // differently"; it doesn't say why, and it can as easily be a premium or a discount as a
  // pass-through. Inferring rush treatment from a markup number would be a silent second effect. The
  // centre stone is exempt because it is a single, always-pass-through item by definition.
  // SHIPPING IS A PASS-THROUGH — no markup, no rush (owner, 2026-08-12: "it just doesn't feel right").
  //
  // It is a courier's invoice, not value EFD added. Keystone pays for design, bench skill and risk; a
  // shipping label carries none of those, so marking it 2.5× charges the customer $175 to move a $70
  // package. Rush does not touch it either, for the same reason it does not touch the centre stone:
  // rush prices EFD's capacity, and a faster courier is a HIGHER SHIPPING COST, not a multiplier on the
  // old one. If expedited freight costs more, that belongs in the shipping line itself.
  //
  // It stays in `cog` (it genuinely is a cost) so margin figures remain honest — it simply earns nothing.
  // THE DESIGN FEE ALSO PASSES THROUGH (owner, 2026-08-12). It is the CAD designer's own per-job fee,
  // snapshotted from their profile — EFD collects it and hands it over. Marking it up would be taking a
  // cut of an artisan's design work, which is the one thing EFD explicitly does not do: it earns on
  // facilitated infrastructure and consignment, never rent on someone else's craft. The paid QC review
  // is separate and IS marked up, because that is EFD's own review process.
  const quoteTotal = (rushableRevenue * rushMultiplier)
    + (centerstoneCost * centerstoneMarkup)
    + shippingTotal
    + designTotal;

  // Sales tax sits ON TOP of the marked-up price (it's a pass-through liability, not
  // revenue/margin). Rate comes from admin settings (settings.taxRate, a fraction);
  // `quote.taxExempt` zeroes it (e.g. a resale/wholesale custom), and an explicit
  // `quote.taxRate` overrides the settings default. quoteTotal stays PRE-tax so margin
  // math is unaffected; `total` is the tax-inclusive grand total the customer is billed.
  const taxRate = quote.taxExempt ? 0 : (n(quote.taxRate) > 0 ? n(quote.taxRate) : n(settings.taxRate));
  const taxAmount = quoteTotal * taxRate;
  const total = quoteTotal + taxAmount;

  return {
    materialsTotal: round(materialsTotal),
    // Broken out so the quote UI can show the two markups side by side, and so the snapshot on the
    // order records WHICH markup the centre stone was actually charged at.
    centerstoneCost: round(centerstoneCost),
    otherMaterialsTotal: round(otherMaterialsTotal),
    cogExCenterstone: round(cogExCenterstone),
    // The cost of the work EFD actually marked up — everything except the pass-throughs. The margin
    // floor is measured against THIS, so a $70 shipping line at zero margin cannot read as a loss on
    // EFD's labour. `passThroughTotal` is what earns nothing by design.
    workCog: round(cogExCenterstone - shippingTotal - designTotal),
    passThroughTotal: round(centerstoneCost + shippingTotal + designTotal),
    laborTotal: round(laborTotal),
    shippingTotal: round(shippingTotal),
    castingTotal: round(castingTotal),
    designTotal: round(designTotal),
    glbTotal: round(glbTotal),
    qcTotal: round(qcTotal),
    cog: round(cog),
    cogMarkup,
    centerstoneMarkup,
    // The BLENDED markup actually achieved — pre-tax price ÷ full cost, rush included. Once markups
    // vary per line, showing a single "× 2.5" in a summary is a lie; this is the number that explains
    // the quote to a customer six weeks later. Falls back to cogMarkup on a zero-cost quote.
    effectiveMarkup: cog > 0 ? Math.round((quoteTotal / cog) * 1000) / 1000 : cogMarkup,
    rushMultiplier,
    quoteTotal: round(quoteTotal),
    taxRate,
    taxAmount: round(taxAmount),
    total: round(total),
    // The pay-over-time GATES LADDER, with each gate's authoritative revenue
    // (rules §12; design fee rides gate 1, shipping gate 3, tax at the lock).
    // The shop (efd-shop lib/customPayments.js) prefers this stamped shape over
    // its own blended-multiplier derivation, which per-line markups made wrong.
    // Production absorbs rounding so the gates sum EXACTLY to quoteTotal; a
    // zero-amount rung is omitted (a quote with no stone has no stone gate).
    gates: (() => {
      const gStone = round(centerstoneCost * centerstoneMarkup + designTotal);
      const gMounting = round(mountingRevenue * rushMultiplier);
      const gProduction = round(quoteTotal - (centerstoneCost * centerstoneMarkup + designTotal) - (mountingRevenue * rushMultiplier));
      return [
        { n: 1, name: 'Stone', covers: 'Centre stone + design fee', amount: gStone },
        { n: 2, name: 'Mounting', covers: 'Mounting + accent stones', amount: gMounting },
        { n: 3, name: 'Production', covers: 'Labour, casting, 3D + QC, shipping', amount: gProduction },
        { n: 4, name: 'Balance', covers: 'Sales tax — added when the price locks', amount: round(taxAmount) },
      ].filter((g) => g.amount > 0);
    })(),
    projectedMargin: round(quoteTotal - cog),
  };
}

/** Margin = quoteTotal − Σ piece COGS (the real cost incl. bench labor). */
export function computeMargin(quoteTotal, pieceCOGSList = []) {
  const cogs = (pieceCOGSList || []).reduce((sum, c) => sum + (Number(c) || 0), 0);
  const total = Number(quoteTotal) || 0;
  const margin = total - cogs;
  const marginPct = total > 0 ? Math.round((margin / total) * 1000) / 10 : 0;
  return { quoteTotal: round(total), cogs: round(cogs), margin: round(margin), marginPct };
}
