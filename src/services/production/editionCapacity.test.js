import { describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { claimMadeToOrder, checkoutMadeToOrder, startProduction, cancelBeforeProduction, EditionCapacityError } from '@/services/production/editionCapacity';

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
});
