import { describe, it, expect, vi, beforeEach } from 'vitest';
import { propagateGemstoneStatus, reserveLinkedGemstones, sellOrderGemstones } from '@/services/production/gemstoneLifecycle';

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

// ── reserveLinkedGemstones — called by finalizePaidInvoice ─────────────────────

function makeDbForReserve({ parentPiece = null, gemPiece = null } = {}) {
  const findOne = vi.fn().mockResolvedValue(parentPiece);
  const findOneAndUpdate = vi.fn().mockResolvedValue(gemPiece);
  const col = { findOne, findOneAndUpdate };
  const database = { collection: vi.fn().mockReturnValue(col) };
  return { database, findOne, findOneAndUpdate };
}

describe('reserveLinkedGemstones — finalizePaidInvoice wiring', () => {
  it('reserves the gemstone piece when a product line has a backing piece with gemstoneId', async () => {
    const parentPiece = { pieceID: 'p-jewelry', productID: 'prod-ring', gemstoneId: 'prod-gem-123' };
    const gemPiece = { pieceID: 'p-gem', productID: 'prod-gem-123', status: 'reserved' };
    const { database, findOne, findOneAndUpdate } = makeDbForReserve({ parentPiece, gemPiece });

    const invoice = {
      lineItems: [
        { type: 'product', productID: 'prod-ring', lineTotal: 500 },
      ],
    };

    await reserveLinkedGemstones(invoice, database);

    expect(findOne).toHaveBeenCalledWith(
      { productID: 'prod-ring' },
      expect.any(Object),
    );
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'prod-gem-123' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'reserved' }) }),
      expect.any(Object),
    );
  });

  it('is a no-op for product lines whose backing piece has no gemstoneId', async () => {
    const parentPiece = { pieceID: 'p-jewelry', productID: 'prod-ring', gemstoneId: null };
    const { database, findOneAndUpdate } = makeDbForReserve({ parentPiece });

    const invoice = { lineItems: [{ type: 'product', productID: 'prod-ring' }] };
    await reserveLinkedGemstones(invoice, database);

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op when no backing piece exists for a product line', async () => {
    const { database, findOneAndUpdate } = makeDbForReserve({ parentPiece: null });

    const invoice = { lineItems: [{ type: 'product', productID: 'prod-unknown' }] };
    await reserveLinkedGemstones(invoice, database);

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('skips non-product line types', async () => {
    const { database, findOne } = makeDbForReserve({ parentPiece: null });

    const invoice = { lineItems: [{ type: 'repair', productID: 'prod-r1' }] };
    await reserveLinkedGemstones(invoice, database);

    expect(findOne).not.toHaveBeenCalled();
  });

  it('processes multiple product lines independently', async () => {
    const piece1 = { pieceID: 'p1', productID: 'prod-1', gemstoneId: 'gem-a' };
    const piece2 = { pieceID: 'p2', productID: 'prod-2', gemstoneId: null };
    const findOne = vi.fn()
      .mockResolvedValueOnce(piece1)
      .mockResolvedValueOnce(piece2);
    const findOneAndUpdate = vi.fn().mockResolvedValue({});
    const col = { findOne, findOneAndUpdate };
    const database = { collection: vi.fn().mockReturnValue(col) };

    const invoice = {
      lineItems: [
        { type: 'product', productID: 'prod-1' },
        { type: 'product', productID: 'prod-2' },
      ],
    };

    await reserveLinkedGemstones(invoice, database);

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'gem-a' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'reserved' }) }),
      expect.any(Object),
    );
  });
});

// ── sellOrderGemstones — called by custom-order delivered transition ────────────

function makeDbForSell(pieces = []) {
  const toArray = vi.fn().mockResolvedValue(pieces);
  const find = vi.fn().mockReturnValue({ toArray });
  const findOneAndUpdate = vi.fn().mockResolvedValue({});
  const col = { find, findOneAndUpdate };
  const database = { collection: vi.fn().mockReturnValue(col) };
  return { database, find, findOneAndUpdate };
}

describe('sellOrderGemstones — custom-order delivered wiring', () => {
  it('marks the gemstone piece as sold for each order piece with a gemstoneId', async () => {
    const pieces = [
      { pieceID: 'p-ring', customOrderID: 'co-1', gemstoneId: 'prod-gem-456' },
    ];
    const { database, find, findOneAndUpdate } = makeDbForSell(pieces);

    await sellOrderGemstones('co-1', database);

    expect(find).toHaveBeenCalledWith({ customOrderID: 'co-1' }, expect.any(Object));
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'prod-gem-456' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sold' }) }),
      expect.any(Object),
    );
  });

  it('is a no-op when no order pieces have a gemstoneId', async () => {
    const pieces = [{ pieceID: 'p-ring', customOrderID: 'co-2', gemstoneId: null }];
    const { database, findOneAndUpdate } = makeDbForSell(pieces);

    await sellOrderGemstones('co-2', database);

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op when the order has no pieces', async () => {
    const { database, findOneAndUpdate } = makeDbForSell([]);

    await sellOrderGemstones('co-empty', database);

    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('sells gemstone pieces for all qualifying order pieces', async () => {
    const pieces = [
      { pieceID: 'p1', customOrderID: 'co-3', gemstoneId: 'gem-a' },
      { pieceID: 'p2', customOrderID: 'co-3', gemstoneId: null },
      { pieceID: 'p3', customOrderID: 'co-3', gemstoneId: 'gem-b' },
    ];
    const { database, findOneAndUpdate } = makeDbForSell(pieces);

    await sellOrderGemstones('co-3', database);

    expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'gem-a' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sold' }) }),
      expect.any(Object),
    );
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { productID: 'gem-b' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sold' }) }),
      expect.any(Object),
    );
  });
});
