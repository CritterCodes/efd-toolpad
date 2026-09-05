/**
 * The wholesaler's Shipments view: PACKAGES as first-class objects. Billing
 * shows tracking per invoice and Completed shows it per repair, but a box that
 * carries three invoices is ONE thing in the real world — this groups both
 * directions by tracking number so the portal matches the loading dock.
 *
 *   inbound   repairs the wholesaler shipped to EFD (inboundShipment),
 *             in transit until receiving checks them in
 *   outbound  invoices EFD shipped back (outboundShipment) — the same grouping
 *             the printed transfer list uses
 */

const norm = (v) => String(v || '').trim();

/** Group owner-scoped repairs + invoices into packages, newest first. PURE. */
export function buildShipments({ repairs = [], invoices = [] } = {}) {
  const packages = new Map();

  for (const repair of repairs) {
    const ship = repair.inboundShipment;
    if (!norm(ship?.trackingNumber)) continue;
    const key = `in:${ship.trackingNumber}`;
    if (!packages.has(key)) {
      packages.set(key, {
        direction: 'inbound',
        trackingNumber: ship.trackingNumber,
        carrier: ship.carrier || null,
        shippedAt: ship.shippedAt || null,
        repairs: [],
        invoices: [],
      });
    }
    packages.get(key).repairs.push({
      repairID: repair.repairID,
      description: repair.description || '',
      status: repair.status,
      receivedAt: repair.receivedAt || null,
    });
  }

  for (const invoice of invoices) {
    const ship = invoice.outboundShipment;
    // A package is identified by its tracking number — except a HAND DELIVERY, which has
    // none: those group by their scheduled date (one delivery run = one package).
    const isDelivery = ship?.method === 'delivery';
    const scheduledKey = ship?.scheduledFor ? new Date(ship.scheduledFor).toISOString().slice(0, 10) : '';
    if (!norm(ship?.trackingNumber) && !(isDelivery && scheduledKey)) continue;
    const key = isDelivery ? `out:delivery:${scheduledKey}` : `out:${ship.trackingNumber}`;
    if (!packages.has(key)) {
      packages.set(key, {
        direction: 'outbound',
        method: isDelivery ? 'delivery' : 'ship',
        trackingNumber: ship.trackingNumber || null,
        carrier: ship.carrier || null,
        scheduledFor: isDelivery ? ship.scheduledFor || null : null,
        deliveredAt: ship.deliveredAt || null,
        shippedAt: ship.shippedAt || null,
        repairs: [],
        invoices: [],
      });
    }
    // deliveredAt lands after the package row was first stamped; keep the latest truth.
    if (ship.deliveredAt && !packages.get(key).deliveredAt) packages.get(key).deliveredAt = ship.deliveredAt;
    packages.get(key).invoices.push({
      invoiceID: invoice.invoiceID,
      total: invoice.total,
      paymentStatus: invoice.paymentStatus,
      repairCount: (invoice.repairIDs || []).length,
      repairs: (invoice.repairSnapshots || []).map((r) => ({ repairID: r.repairID, description: r.description || '' })),
    });
  }

  const out = [...packages.values()].map((pkg) => {
    if (pkg.direction === 'inbound') {
      // In transit until EVERY repair in the box has been checked in.
      const pending = pkg.repairs.filter((r) => !r.receivedAt && r.status === 'SHIPPED TO SHOP').length;
      return { ...pkg, state: pending > 0 ? 'in_transit' : 'received' };
    }
    if (pkg.method === 'delivery') {
      return { ...pkg, state: pkg.deliveredAt ? 'delivered' : 'scheduled' };
    }
    return { ...pkg, state: 'shipped' };
  });

  out.sort((a, b) => new Date(b.shippedAt || 0) - new Date(a.shippedAt || 0));
  return out;
}
