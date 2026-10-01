import { describe, it, expect } from 'vitest';
import { castingRefusal, shipmentRefusal } from './productionAccess';

const artisan = (userID = 'u-art') => ({ user: { userID, role: 'artisan', artisanTypes: ['Jeweler'] } });
const admin = { user: { userID: 'u-admin', role: 'admin' } };
const customer = { user: { userID: 'u-cust', role: 'client' } };

const DESIGNS = {
  'd-mine': { designID: 'd-mine', primaryArtisanId: 'u-art', category: 'jewelry' },
  'd-theirs': { designID: 'd-theirs', primaryArtisanId: 'u-other', category: 'jewelry' },
};
const PIECES = {
  'p-mine': { pieceID: 'p-mine', designID: 'd-mine' },
  'p-theirs': { pieceID: 'p-theirs', designID: 'd-theirs' },
};
const BATCHES = { 'cb-mine': { batchId: 'cb-mine', ownerId: 'u-art' }, 'cb-theirs': { batchId: 'cb-theirs', ownerId: 'u-other' } };
const loaders = {
  loadDesign: async (id) => DESIGNS[id] || null,
  loadPiece: async (id) => PIECES[id] || null,
  loadBatch: async (id) => BATCHES[id] || null,
};

describe('castingRefusal', () => {
  it('staff cast for anyone', async () => {
    expect(await castingRefusal(admin, { designID: 'd-theirs', pieceIDs: ['p-theirs'] }, loaders)).toBeNull();
  });
  it('an artisan casts pieces of their own design', async () => {
    expect(await castingRefusal(artisan(), { designID: 'd-mine', pieceIDs: ['p-mine'] }, loaders)).toBeNull();
  });
  it("refuses someone else's design, and any non-artisan account", async () => {
    expect((await castingRefusal(artisan(), { designID: 'd-theirs', pieceIDs: ['p-theirs'] }, loaders)).status).toBe(403);
    expect((await castingRefusal(customer, { designID: 'd-mine', pieceIDs: ['p-mine'] }, loaders)).status).toBe(403);
  });
  it("refuses another design's piece smuggled into your batch", async () => {
    const r = await castingRefusal(artisan(), { designID: 'd-mine', pieceIDs: ['p-mine', 'p-theirs'] }, loaders);
    expect(r.status).toBe(400);
  });
  it('refuses a missing design or no pieces', async () => {
    expect((await castingRefusal(artisan(), { designID: 'd-none', pieceIDs: ['p-mine'] }, loaders)).status).toBe(404);
    expect((await castingRefusal(artisan(), { designID: 'd-mine', pieceIDs: [] }, loaders)).status).toBe(400);
  });
});

describe('shipmentRefusal', () => {
  it('staff ship anything', async () => {
    expect(await shipmentRefusal(admin, { pieceIDs: ['p-theirs'], castingBatchId: 'cb-theirs' }, loaders)).toBeNull();
  });
  it('an artisan ships their own pieces and casting batch', async () => {
    expect(await shipmentRefusal(artisan(), { pieceIDs: ['p-mine'], castingBatchId: 'cb-mine' }, loaders)).toBeNull();
  });
  it("refuses someone else's piece or casting batch", async () => {
    expect((await shipmentRefusal(artisan(), { pieceIDs: ['p-theirs'] }, loaders)).status).toBe(403);
    expect((await shipmentRefusal(artisan(), { pieceIDs: ['p-mine'], castingBatchId: 'cb-theirs' }, loaders)).status).toBe(403);
    expect((await shipmentRefusal(customer, { pieceIDs: ['p-mine'] }, loaders)).status).toBe(403);
  });
});
