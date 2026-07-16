import { describe, it, expect, vi, beforeEach } from 'vitest';
import { propagateGemstoneStatus } from '@/services/production/gemstoneLifecycle';

function makeDb(gemPiece = null) {
  const findOneAndUpdate = vi.fn().mockResolvedValue(gemPiece);
  return {
    collection: vi.fn().mockReturnValue({ findOneAndUpdate }),
    _findOneAndUpdate: findOneAndUpdate,
  };
}

describe('propagateGemstoneStatus', () => {
  it('updates the gemstone piece to reserved when the parent piece is reserved', async () => {
    const gemPiece = { pieceID: 'gem-pc1', productID: 'gem-prod-1', status: 'reserved' };
    const db = makeDb(gemPiece);
    const parent = { pieceID: 'p1', gemstoneId: 'gem-prod-1', status: 'reserved' };

    const result = await propagateGemstoneStatus(parent, db);

    expect(db._findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'gem-prod-1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'reserved' }) }),
      expect.any(Object),
    );
    expect(result).toEqual(gemPiece);
  });

  it('updates the gemstone piece to sold when the parent piece is sold', async () => {
    const gemPiece = { pieceID: 'gem-pc2', productID: 'gem-prod-2', status: 'sold' };
    const db = makeDb(gemPiece);
    const parent = { pieceID: 'p2', gemstoneId: 'gem-prod-2', status: 'sold' };

    const result = await propagateGemstoneStatus(parent, db);

    expect(db._findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'gem-prod-2' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sold' }) }),
      expect.any(Object),
    );
    expect(result).toEqual(gemPiece);
  });

  it('is a no-op when the parent piece has no gemstoneId', async () => {
    const db = makeDb(null);
    const parent = { pieceID: 'p3', gemstoneId: null, status: 'reserved' };

    const result = await propagateGemstoneStatus(parent, db);

    expect(db.collection).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('is a no-op for non-propagated statuses (available, completed, etc.)', async () => {
    const db = makeDb(null);
    const parent = { pieceID: 'p4', gemstoneId: 'gem-prod-3', status: 'available' };

    const result = await propagateGemstoneStatus(parent, db);

    expect(db.collection).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when no backing gemstone piece exists', async () => {
    const db = makeDb(null);
    const parent = { pieceID: 'p5', gemstoneId: 'gem-prod-4', status: 'sold' };

    const result = await propagateGemstoneStatus(parent, db);

    expect(db._findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'gem-prod-4' },
      expect.any(Object),
      expect.any(Object),
    );
    expect(result).toBeNull();
  });
});
