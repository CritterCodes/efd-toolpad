import { describe, expect, it } from 'vitest';
import { canShipTransition, isClearToShip } from '@/services/production/shipping';

// Insurance is a pass-through of the carrier's ACTUAL charge (entered per shipment at cost), not a
// computed rate — so there's no pure insurance function to test here; createShipment stores the
// entered `insuranceAmount` verbatim (covered by the DB/route layer).

describe('canShipTransition (pure)', () => {
  it('pending → shipped → delivered', () => {
    expect(canShipTransition('pending', 'shipped')).toBe(true);
    expect(canShipTransition('shipped', 'delivered')).toBe(true);
    expect(canShipTransition('pending', 'cancelled')).toBe(true);
  });
  it('forbids skips and terminal moves', () => {
    expect(canShipTransition('pending', 'delivered')).toBe(false);
    expect(canShipTransition('delivered', 'shipped')).toBe(false);
    expect(canShipTransition('cancelled', 'shipped')).toBe(false);
  });
});

describe('isClearToShip (pure — nothing-ships-unpaid gate)', () => {
  it('blocked when the linked casting batch is gated + unpaid', () => {
    expect(isClearToShip({ castingBatch: { shippingGated: true, charge: { paid: false } } })).toBe(false);
  });
  it('clear once the casting charge is paid', () => {
    expect(isClearToShip({ castingBatch: { shippingGated: false, charge: { paid: true } } })).toBe(true);
  });
  it('clear when there is no casting gate', () => {
    expect(isClearToShip({})).toBe(true);
    expect(isClearToShip({ castingBatch: null })).toBe(true);
  });
  // THE FLAG IS NOT THE FACT. `shippingGated` is mutable bookkeeping; an unpaid charge AMOUNT is the
  // actual debt. These cover the cases where the two disagree — the gate must follow the money.
  it('blocked by an OUTSTANDING charge even if the gate flag was cleared', () => {
    expect(isClearToShip({ castingBatch: { shippingGated: false, charge: { amount: 150, paid: false } } })).toBe(false);
  });
  it('blocked on a legacy received batch that carries a charge but no invoice behind it', () => {
    expect(isClearToShip({ castingBatch: { status: 'received', shippingGated: true, charge: { amount: 90, paid: false, invoiceID: null } } })).toBe(false);
  });
  it('a CANCELLED batch is never clear to ship — nothing is coming', () => {
    expect(isClearToShip({ castingBatch: { status: 'cancelled', shippingGated: false, charge: { amount: 150, paid: true } } })).toBe(false);
  });
  it('clear on a paid, accepted batch', () => {
    expect(isClearToShip({ castingBatch: { status: 'accepted', shippingGated: false, charge: { amount: 150, paid: true } } })).toBe(true);
  });
});
