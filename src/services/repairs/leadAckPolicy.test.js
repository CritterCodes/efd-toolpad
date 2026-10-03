import { describe, it, expect } from 'vitest';
import { shouldSendLeadAck } from './leadAckPolicy';

/**
 * ONE EMAIL PER TICKET IS RIGHT FOR A WALK-IN AND WRONG FOR EVERYBODY ELSE.
 *
 * Production numbers behind each case:
 *   - Marlen Jewelers carries **21** of these acknowledgements, and one account entered **21 repairs in
 *     a single day** (2026-08-25). They had never arrived, only because the address was missing. Fixing
 *     that (#290) would have turned a silent failure into a mailbox full.
 *   - The admin account carries **6**, for work typed at the counter — being told you received what you
 *     just wrote up.
 *   - Retail is the case this exists for: 24 acks across customer accounts, and most walk-ins have no
 *     account at all.
 *
 * The gate is the recipient's ROLE. `repair.isWholesale` looked like the obvious signal and is not:
 * only Marlen's 21 repairs carry it. Rocky's Corner (21), The Smith (48), Cooper's Coin and Pawn (17)
 * and Diamonds Plus (11) have it on none of theirs, so a flag-based gate would have spammed four stores
 * while looking like it worked.
 */
describe('who gets "We received your repair request"', () => {
  it('sends to a retail customer with an account — the case it exists for', () => {
    expect(shouldSendLeadAck({ recipientRole: 'customer', recipientID: 'user-1', createdByID: 'admin-1' })).toBe(true);
  });

  it('sends to a walk-in with only an address and no account', () => {
    expect(shouldSendLeadAck({ recipientEmail: 'walkin@example.com', createdByID: 'admin-1' })).toBe(true);
  });

  it('does NOT send to a store — they get one per ticket and they have the portal', () => {
    expect(shouldSendLeadAck({ recipientRole: 'wholesaler', recipientID: 'user-c9f82772', createdByID: 'admin-1' })).toBe(false);
  });

  it('does not send to the shop about its own counter intake', () => {
    for (const role of ['admin', 'superadmin', 'dev', 'artisan', 'senior-artisan', 'staff']) {
      expect(shouldSendLeadAck({ recipientRole: role, recipientID: 'u', createdByID: 'admin-1' }), role).toBe(false);
    }
  });

  it('does not tell you that you received what you just typed in', () => {
    // Same person on both sides, whatever the role.
    expect(shouldSendLeadAck({ recipientRole: 'customer', recipientID: 'user-9', createdByID: 'user-9' })).toBe(false);
  });

  it('sends nothing when there is nobody to send it to', () => {
    expect(shouldSendLeadAck({})).toBe(false);
    expect(shouldSendLeadAck({ recipientEmail: '' })).toBe(false);
  });

  it('falls through to sending when the role could not be determined', () => {
    // A failed lookup must not silently mute a real customer's acknowledgement; unknown behaves as it
    // did before this gate existed.
    expect(shouldSendLeadAck({ recipientRole: null, recipientID: 'user-1', createdByID: 'admin-1' })).toBe(true);
  });

  it('does not depend on repair.isWholesale, which four of five stores do not set', () => {
    // The shape of the trap: a store whose repairs carry no flag is still a store.
    expect(shouldSendLeadAck({ recipientRole: 'wholesaler', recipientID: 'rockys', createdByID: 'admin-1' })).toBe(false);
  });
});
