/**
 * Custom-order → production bench linkage (S7d). Spawns a Design + Piece (with routed
 * work orders) from a custom order and links them back. Reuses the S4 engine, so the
 * custom's fabrication work hits the unified bench, pays the artisan/owner via payroll
 * (owner draw), and accrues COGS → the order's margin. THIS is "customs on the bench".
 */
export { addProductionToCustomOrder, ensureCustomPiece, spawnCustomWorkOrder } from './production/setup';
export { addCastingCost, awardClientMgmtBonus } from './production/billing';
export { generateWorkOrdersFromQuote, planQuoteLaborHours, applyQuoteHoursToWorkOrders, reconcileQuoteToWorkOrders, syncQuoteToWorkOrders, getCustomWorkOrders } from './production/quoteSync';
