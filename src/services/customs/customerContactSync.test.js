import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));

vi.mock('@/lib/database', () => ({ db: { connect } }));
vi.mock('@/lib/constants', () => ({
  default: { CUSTOM_ORDERS_COLLECTION: 'customOrders' },
}));

import { customerContactFromUser, syncLinkedCustomOrderContact } from './customerContactSync';

describe('custom-order client contact synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes the canonical user contact fields', () => {
    expect(customerContactFromUser({
      firstName: ' Randa ',
      lastName: 'Winstead ',
      email: ' randawinstead@gmail.com ',
      phoneNumber: ' 479-719-4447 ',
    })).toEqual({
      customerName: 'Randa Winstead',
      customerEmail: 'randawinstead@gmail.com',
      customerPhone: '479-719-4447',
    });
  });

  it('updates linked orders and only unsent internal invoice drafts', async () => {
    const orders = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ customID: 'CO-randa' }]),
      }),
      updateMany: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    };
    const invoices = {
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    connect.mockResolvedValue({
      collection: vi.fn((name) => (name === 'customOrders' ? orders : invoices)),
    });

    await expect(syncLinkedCustomOrderContact({
      userID: 'user-8e8f2790',
      firstName: 'Randa',
      lastName: 'Winstead',
      email: 'randawinstead@gmail.com',
      phoneNumber: '479-719-4447',
    })).resolves.toEqual({ matchedOrders: 1, updatedOrders: 1, updatedInvoiceDrafts: 1 });

    expect(orders.updateMany).toHaveBeenCalledWith(
      { clientID: 'user-8e8f2790' },
      { $set: expect.objectContaining({
        customerName: 'Randa Winstead',
        customerEmail: 'randawinstead@gmail.com',
        customerPhone: '479-719-4447',
      }) },
    );
    expect(invoices.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        customID: { $in: ['CO-randa'] },
        status: 'pending_payment',
        $or: expect.arrayContaining([{ stripeInvoiceID: { $exists: false } }]),
      }),
      { $set: expect.objectContaining({ customerEmail: 'randawinstead@gmail.com' }) },
    );
  });
});
