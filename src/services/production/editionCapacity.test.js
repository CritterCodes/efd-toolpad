import { describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import {
  claimMadeToOrder,
  checkoutMadeToOrder,
  startProduction,
  startManualProduction,
  beginPieceProduction,
  beginManualPieceProduction,
  cancelBeforeProduction,
  EditionCapacityError,
} from '@/services/production/editionCapacity';

function databaseWithEdition(limit = 2) {
  const state = { design: { designID: 'd1', dropId: 'drop', variants: [{ variantId: 'v1', active: true }], edition: { type: 'limited', limit, allocated: 0, committed: 0, nextNumber: 1 } }, pieces: [] };
  let lock = Promise.resolve();
  const designs = {
    findOneAndUpdate(filter, update, options) {
      const operation = lock.then(() => {
        const d = state.design;
        const capacityOkay = d.edition.allocated + d.edition.committed < d.edition.limit;
        const starting = filter['edition.committed'];
        if ((filter.$or && !capacityOkay) || (starting && d.edition.committed < starting.$gte)) return null;
        const before = structuredClone(d);
        for (const [path, value] of Object.entries(update.$inc || {})) d.edition[path.split('.')[1]] += value;
        return options.returnDocument === 'before' ? before : structuredClone(d);
      });
      lock = operation.catch(() => {});
      return operation;
    },
    updateOne(filter, update) { state.design.edition.committed += update.$inc['edition.committed']; return { modifiedCount: 1 }; },
  };
  const pieces = {
    async insertOne(piece) { state.pieces.push(structuredClone(piece)); },
    async findOne(filter) { return state.pieces.find((piece) => piece.pieceID === filter.pieceID && piece.status === filter.status) || null; },
    async findOneAndUpdate(filter, update, options) {
      const piece = state.pieces.find((item) => item.pieceID === filter.pieceID && item.status === filter.status && (filter.editionNumber === undefined || item.editionNumber === filter.editionNumber));
      if (!piece) return null;
      const before = structuredClone(piece); Object.assign(piece, update.$set);
      return options.returnDocument === 'before' ? before : structuredClone(piece);
    },
  };
  return { state, database: { collection: (name) => (name === 'designs' ? designs : pieces) } };
}

describe('transactional edition capacity', () => {
  it('never lets concurrent paid checkout transactions exceed allocated + committed limit in MongoDB', async () => {
    const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const client = new MongoClient(replicaSet.getUri());
    await client.connect();
    const database = client.db('edition-capacity-test');
    await database.collection('designs').insertOne({ designID: 'd1', variants: [{ variantId: 'v1', active: true }], edition: { type: 'limited', limit: 2, allocated: 0, committed: 0, nextNumber: 1 } });
    const attempts = await Promise.allSettled(Array.from({ length: 12 }, (_, orderId) => checkoutMadeToOrder({ client, database, designID: 'd1', variantId: 'v1', orderId: String(orderId) })));
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(attempts.filter((result) => result.reason instanceof EditionCapacityError)).toHaveLength(10);
    const design = await database.collection('designs').findOne({ designID: 'd1' });
    expect(design.edition.allocated + design.edition.committed).toBe(2);
    expect(await database.collection('pieces').countDocuments()).toBe(2);
    await client.close();
    await replicaSet.stop();
  }, 120000);

  it('production start converts committed to allocated and assigns a never-reused number', async () => {
    const { state, database } = databaseWithEdition(1);
    const piece = await claimMadeToOrder({ database, designID: 'd1', variantId: 'v1', resolvedConfiguration: { ringSize: '7.25' } });
    const started = await startProduction({ database, pieceID: piece.pieceID });
    expect(started.editionNumber).toBe(1);
    expect(state.design.edition).toMatchObject({ committed: 0, allocated: 1, nextNumber: 2 });
    await expect(cancelBeforeProduction({ database, pieceID: piece.pieceID })).rejects.toBeInstanceOf(EditionCapacityError);
  });

  it('cancellation before start releases committed capacity', async () => {
    const { state, database } = databaseWithEdition(1);
    const piece = await claimMadeToOrder({ database, designID: 'd1', variantId: 'v1' });
    await cancelBeforeProduction({ database, pieceID: piece.pieceID });
    expect(state.design.edition.committed).toBe(0);
    await expect(claimMadeToOrder({ database, designID: 'd1', variantId: 'v1' })).resolves.toBeTruthy();
  });

  it('startManualProduction allocates directly without a committed slot', async () => {
    const { state, database } = databaseWithEdition(1);
    state.pieces.push({ pieceID: 'p-m1', designID: 'd1', variantId: 'v1', resolvedConfiguration: {}, orderId: null, status: 'planned' });
    const started = await startManualProduction({ database, pieceID: 'p-m1' });
    expect(started.editionNumber).toBe(1);
    expect(state.design.edition).toMatchObject({ committed: 0, allocated: 1, nextNumber: 2 });
  });

  it('startManualProduction rejects when edition cap is already full', async () => {
    const { state, database } = databaseWithEdition(1);
    state.design.edition.allocated = 1;
    state.pieces.push({ pieceID: 'p-m2', designID: 'd1', variantId: 'v1', resolvedConfiguration: {}, orderId: null, status: 'planned' });
    await expect(startManualProduction({ database, pieceID: 'p-m2' })).rejects.toBeInstanceOf(EditionCapacityError);
    expect(state.design.edition.allocated).toBe(1);
  });

  it('startManualProduction rejects on a piece that is not in planned status', async () => {
    const { state, database } = databaseWithEdition(2);
    state.pieces.push({ pieceID: 'p-m3', designID: 'd1', variantId: 'v1', resolvedConfiguration: {}, orderId: null, status: 'casting_ordered' });
    await expect(startManualProduction({ database, pieceID: 'p-m3' })).rejects.toBeInstanceOf(EditionCapacityError);
  });

  it('concurrent manual starts at cap=1 allocate exactly one edition number (real MongoDB)', async () => {
    const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const client = new MongoClient(replicaSet.getUri());
    await client.connect();
    const database = client.db('manual-prod-test');
    await database.collection('designs').insertOne({
      designID: 'd1', variants: [{ variantId: 'v1', active: true }],
      edition: { type: 'limited', limit: 1, allocated: 0, committed: 0, nextNumber: 1 },
    });
    const plannedPieces = Array.from({ length: 5 }, (_, i) => ({
      pieceID: `p-c${i}`, designID: 'd1', variantId: 'v1', resolvedConfiguration: {},
      orderId: null, status: 'planned', createdAt: new Date(), updatedAt: new Date(),
    }));
    await database.collection('pieces').insertMany(plannedPieces);

    // Simulates the production-start route calling beginManualPieceProduction for each piece
    const attempts = await Promise.allSettled(
      plannedPieces.map((p) => beginManualPieceProduction({ client, database, pieceID: p.pieceID })),
    );
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((r) => r.reason instanceof EditionCapacityError)).toHaveLength(4);
    const design = await database.collection('designs').findOne({ designID: 'd1' });
    expect(design.edition.allocated).toBe(1);
    expect(design.edition.nextNumber).toBe(2);
    const started = await database.collection('pieces').findOne({ status: 'casting_ordered' });
    expect(started.editionNumber).toBe(1);
    await client.close();
    await replicaSet.stop();
  }, 120000);

  it('retrying beginPieceProduction on an already-started piece throws without double-allocating (real MongoDB)', async () => {
    const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const client = new MongoClient(replicaSet.getUri());
    await client.connect();
    const database = client.db('retry-prod-test');
    await database.collection('designs').insertOne({
      designID: 'd1', variants: [{ variantId: 'v1', active: true }],
      edition: { type: 'limited', limit: 2, allocated: 0, committed: 1, nextNumber: 1 },
    });
    await database.collection('pieces').insertOne({
      pieceID: 'p-retry', designID: 'd1', variantId: 'v1', resolvedConfiguration: {},
      orderId: 'order-1', status: 'planned', editionNumber: null, createdAt: new Date(), updatedAt: new Date(),
    });

    // First start succeeds
    const first = await beginPieceProduction({ client, database, pieceID: 'p-retry' });
    expect(first.editionNumber).toBe(1);

    // Retry throws without touching the design counters
    await expect(beginPieceProduction({ client, database, pieceID: 'p-retry' })).rejects.toBeInstanceOf(EditionCapacityError);
    const design = await database.collection('designs').findOne({ designID: 'd1' });
    expect(design.edition.allocated).toBe(1);
    expect(design.edition.committed).toBe(0);
    expect(design.edition.nextNumber).toBe(2);
    await client.close();
    await replicaSet.stop();
  }, 120000);
});
