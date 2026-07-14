import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateOne = vi.fn();
const updateMany = vi.fn();
vi.mock('@/lib/database', () => ({
  db: { connect: vi.fn(async () => ({ collection: () => ({ updateOne, updateMany }) })) },
}));

import { reserveLinkedGemstones, setGemstonePieceStatus } from './gemstoneLifecycle';

describe('linked gemstone piece lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reserves each linked gemstone backing piece when its parent product sells', async () => {
    await reserveLinkedGemstones([
      { references: { gemstoneId: 'gem-1' } },
      { references: { gemstoneId: 'gem-1' } },
      { references: {} },
    ]);
    expect(updateMany).toHaveBeenCalledWith(
      { productID: { $in: ['gem-1'] }, status: { $ne: 'sold' } },
      { $set: { status: 'reserved', updatedAt: expect.any(Date) } },
    );
  });

  it('marks the linked gemstone backing piece sold on delivery', async () => {
    await setGemstonePieceStatus('gem-1', 'sold');
    expect(updateOne).toHaveBeenCalledWith(
      { productID: 'gem-1' },
      { $set: { status: 'sold', updatedAt: expect.any(Date) } },
    );
  });

  it('does nothing for an unlinked design', async () => {
    await setGemstonePieceStatus(null, 'sold');
    await reserveLinkedGemstones([{ references: {} }]);
    expect(updateOne).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
