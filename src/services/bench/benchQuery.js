/**
 * Unified bench query (S4b) — the work-order-driven My Bench.
 *
 * Reads `workOrders` directly (all sources: repairs, production pieces, sale-service,
 * cad) instead of the repairs collection, discipline-gated per the caller's
 * artisanTypes. This is the read-switch deferred from S0; pieces are the second
 * bench source that makes it necessary.
 *
 * Lives alongside the existing /api/repairs/my-bench (which still serves the legacy
 * repair-only bench UI) — no regression. The frontend switches to this in the UI phase.
 */
import { db } from '@/lib/database';
import { getActiveBenchRawStatuses } from '@/services/repairWorkflow';
import { disciplinesForArtisanTypes, DISCIPLINE } from '@/services/workOrders/disciplines';
import { projectWorkOrder } from '@/services/workOrders/workOrderWorkflow';
import { customOrderLabel } from '@/constants/customRequest.constants';

// Roles that see every discipline (matches lib/apiAuth.isAdmin). Inlined so this
// service stays decoupled from the auth module (next-auth) and unit-testable.
const ADMIN_ROLES = ['admin', 'dev'];
function sessionIsAdmin(session) {
  return ADMIN_ROLES.includes(session?.user?.role);
}

/**
 * Disciplines the caller may see. Admin → null (all lanes). Otherwise their
 * artisanType-derived lanes, falling back to bench_jewelry when artisanTypes is
 * unpopulated (so existing untagged bench workers are NOT locked out — the gap
 * found in S0). Hard lane isolation kicks in once artisanTypes are populated.
 */
export function resolveBenchDisciplines(session) {
  if (sessionIsAdmin(session)) return null;
  const disciplines = disciplinesForArtisanTypes(session?.user?.artisanTypes || []);
  return disciplines.length ? disciplines : [DISCIPLINE.BENCH_JEWELRY];
}

export async function getBenchWorkOrders({ session } = {}) {
  const dbInstance = await db.connect();
  const disciplines = resolveBenchDisciplines(session);

  const query = { status: { $in: getActiveBenchRawStatuses() } };
  if (disciplines) query.discipline = { $in: disciplines };

  const workOrders = await dbInstance.collection('workOrders')
    .find(query, { projection: { _id: 0 } })
    .sort({ isRush: -1, promiseDate: 1, createdAt: 1 })
    .toArray();

  if (workOrders.length === 0) return [];

  // Enrich each WO with a light source summary for display.
  const repairIDs = workOrders.filter((w) => w.sourceType === 'repair').map((w) => w.sourceID);
  const pieceIDs = workOrders.filter((w) => w.sourceType === 'production_piece').map((w) => w.sourceID);

  const [repairs, pieces] = await Promise.all([
    repairIDs.length
      ? dbInstance.collection('repairs').find(
          { repairID: { $in: repairIDs } },
          { projection: { _id: 0, repairID: 1, clientName: 1, businessName: 1, description: 1, status: 1, totalCost: 1, picture: 1 } }
        ).toArray()
      : [],
    pieceIDs.length
      ? dbInstance.collection('pieces').find(
          { pieceID: { $in: pieceIDs } },
          { projection: { _id: 0, pieceID: 1, designID: 1, status: 1, totalCOGS: 1, sku: 1, customOrderID: 1 } }
        ).toArray()
      : [],
  ]);

  const repairMap = new Map(repairs.map((r) => [r.repairID, r]));
  const pieceMap = new Map(pieces.map((p) => [p.pieceID, p]));

  // For custom-linked pieces, pull the custom order so bench cards are recognizable
  // (customer + jewelry type) and link back to the custom, not a bare piece ID.
  const customOrderIDs = [...new Set(pieces.map((p) => p.customOrderID).filter(Boolean))];
  const customOrders = customOrderIDs.length
    ? await dbInstance.collection('customOrders').find(
        { customID: { $in: customOrderIDs } },
        { projection: { _id: 0, customID: 1, customerName: 1, jewelryType: 1, metalType: 1, goldColor: 1, title: 1 } }
      ).toArray()
    : [];
  const customMap = new Map(customOrders.map((o) => [o.customID, o]));

  const designIDs = [...new Set(pieces.map((p) => p.designID).filter(Boolean))];
  const designs = designIDs.length
    ? await dbInstance.collection('designs').find(
        { designID: { $in: designIDs } },
        { projection: { _id: 0, designID: 1, name: 1 } }
      ).toArray()
    : [];
  const designMap = new Map(designs.map((d) => [d.designID, d]));

  return workOrders.map((wo) => {
    let source = null;
    if (wo.sourceType === 'repair') {
      source = { kind: 'repair', ...(repairMap.get(wo.sourceID) || {}) };
    } else if (wo.sourceType === 'production_piece') {
      const piece = pieceMap.get(wo.sourceID) || {};
      const customOrder = piece.customOrderID ? customMap.get(piece.customOrderID) : null;
      source = {
        kind: 'piece',
        ...piece,
        designName: piece.designID ? (designMap.get(piece.designID)?.name ?? null) : null,
        // Custom context for recognizable cards + a link back to the custom order.
        custom: customOrder
          ? { customID: customOrder.customID, customerName: customOrder.customerName, label: customOrderLabel(customOrder) }
          : null,
      };
    }
    // Attach the derived, source-agnostic bench queue (mine/unclaimed/
    // communications/waiting_parts/qc) so the unified bench can tab + gate
    // actions exactly like the repairs My Bench. Queue is derived, never stored.
    return projectWorkOrder({ ...wo, source });
  });
}
