import { describe, expect, it } from 'vitest';
import { insuranceForDeclaredValue, canShipTransition, isClearToShip, DECLARED_VALUE_INSURANCE_RATE } from '@/services/production/shipping';

describe('insuranceForDeclaredValue (pure)', () => {
  it('applies the declared-value rate', () => {
    expect(DECLARED_VALUE_INSURANCE_RATE).toBe(0.01);
    expect(insuranceForDeclaredValue(1000)).toBe(10);
    expect(insuranceForDeclaredValue(2500, 0.02)).toBe(50);
  });
  it('zero/garbage safe', () => {
    expect(insuranceForDeclaredValue(0)).toBe(0);
    expect(insuranceForDeclaredValue(null)).toBe(0);
  });
});

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
  it('an in-house batch (gated false) is clear', () => {
    expect(isClearToShip({ castingBatch: { shippingGated: false, charge: { paid: true } } })).toBe(true);
  });
});
