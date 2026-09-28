import { describe, it, expect } from 'vitest';
import { canSkipIntakeClient, intakeClientSettled } from './intakeClientRule';

/**
 * THE BUG THIS FILE EXISTS FOR (owner, 2026-09-28): "when you click 'Another for this store' it loads
 * the store in, but you lose the ability to have no client."
 *
 * The first version asked whether the TICKET was wholesale. For an admin arriving from that button the
 * intake is in wholesale mode, so it read them as a wholesaler and hid the option — on the one path
 * whose entire purpose is taking in another ticket for that store.
 */
describe('who may take a ticket in without a client', () => {
  it('lets an admin skip it on a wholesale ticket', () => {
    expect(canSkipIntakeClient({ viewerIsWholesaler: false, ticketIsWholesale: true })).toBe(true);
  });

  it('still lets them when the store came preset — the regression', () => {
    // "Another for <store>" puts the intake in wholesale mode. The viewer is still an admin.
    expect(canSkipIntakeClient({ viewerIsWholesaler: false, ticketIsWholesale: true })).toBe(true);
  });

  it('does not let a wholesaler skip their own client', () => {
    expect(canSkipIntakeClient({ viewerIsWholesaler: true, ticketIsWholesale: true })).toBe(false);
  });

  it('does not apply to a retail ticket — a walk-in has a name', () => {
    expect(canSkipIntakeClient({ viewerIsWholesaler: false, ticketIsWholesale: false })).toBe(false);
  });

  it('defaults closed', () => {
    expect(canSkipIntakeClient()).toBe(false);
  });
});

describe('when the client question counts as answered', () => {
  const admin = { viewerIsWholesaler: false, ticketIsWholesale: true };

  it('a named client answers it for anyone', () => {
    expect(intakeClientSettled({ ...admin, clientName: 'Dylan Caldwell' })).toBe(true);
    expect(intakeClientSettled({ viewerIsWholesaler: true, ticketIsWholesale: true, clientName: 'Dylan' })).toBe(true);
  });

  it('so does an admin deliberately skipping it', () => {
    expect(intakeClientSettled({ ...admin, clientNotProvided: true })).toBe(true);
  });

  it('but a blank one does not', () => {
    expect(intakeClientSettled({ ...admin, clientName: '   ' })).toBe(false);
    expect(intakeClientSettled(admin)).toBe(false);
  });

  it('and a wholesaler cannot answer it by skipping', () => {
    expect(intakeClientSettled({ viewerIsWholesaler: true, ticketIsWholesale: true, clientNotProvided: true })).toBe(false);
  });
});
