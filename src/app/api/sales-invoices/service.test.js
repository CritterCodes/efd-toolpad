import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne, updateOne, collection, reserveLinkedGemstones } = vi.hoisted(() => {
  const hoistedFindOne = vi.fn();
  const hoistedUpdateOne = vi.fn();
  return {
    findOne: hoistedFindOne,
    updateOne: hoistedUpdateOne,
    collection: vi.fn(() => ({ findOne: hoistedFindOne, updateOne: hoistedUpdateOne })),
    reserveLinkedGemstones: vi.fn(),
  };
});

vi.mock('@/lib/database', () => ({
  db: { connect: vi.fn(async () => ({ collection })) },
}));
vi.mock('@/services/production/gemstoneLifecycle', () => ({ reserveLinkedGemstones }));

import { markProductsSold } from './service';

describe('sales invoice gemstone lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOne.mockResolvedValue({ productId: 'ring-1', references: { gemstoneId: 'gem-1' } });
    updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  });

  it('reserves the linked backing stone after marking the parent product sold', async () => {
    await markProductsSold({
      invoiceID: 'invoice-1',
      clientID: 'client-1',
      clientName: 'Client',
      paidAt: new Date('2026-07-14T12:00:00Z'),
      lineItems: [{ type: 'product', productID: 'ring-1', lineTotal: 800 }],
    });

    expect(findOne).toHaveBeenCalledWith({ productId: 'ring-1' });
    expect(updateOne).toHaveBeenCalledWith(
      { productId: 'ring-1' },
      { $set: expect.objectContaining({ status: 'sold', salesInvoiceID: 'invoice-1' }) },
    );
    expect(reserveLinkedGemstones).toHaveBeenCalledWith([
      expect.objectContaining({ references: { gemstoneId: 'gem-1' } }),
    ]);
  });
});
