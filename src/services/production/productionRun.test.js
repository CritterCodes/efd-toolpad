import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import {
  mintRun, scrapPiece, cancelRun,
  reserveGemEditions, releaseGemEditions,
  gemClaimsForVariant, aggregateGemClaims,
} from '@/services/production/productionRun';
import { EditionCapacityError } from '@/services/production/editionCapacity';

// ── Pure-logic tests (no DB) ───────────────────────────────────────────────

describe('gem-claim derivation (pure)', () => {
  it('gemClaimsForVariant keeps only rows with a gemDesignId and defaults qty to 1', () => {
    const variant = { gemstones: [
      { gemDesignId: 'gemA', gemVariantId: 'gA-v1', gemColor: 'AAA', qty: 2 },
      { gemDesignId: 'gemB' },                          // qty defaults to 1
      { stullerSku: 'STULLER-1' },                      // not a linked gem — dropped
      { gemDesignId: '' },                              // empty — dropped
    ] };
    expect(gemClaimsForVariant(variant)).toEqual([
      { gemDesignId: 'gemA', gemVariantId: 'gA-v1', gemColor: 'AAA', qty: 2 },
      { gemDesignId: 'gemB', gemVariantId: null, gemColor: null, qty: 1 },
    ]);
  });

  it('gemClaimsForVariant handles a variant with no gemstones', () => {
    expect(gemClaimsForVariant({})).toEqual([]);
  });

  it('aggregateGemClaims sums qty per gemDesignId across pieces', () => {
    const perPiece = [
      [{ gemDesignId: 'gemA', qty: 2 }, { gemDesignId: 'gemB', qty: 1 }],
      [{ gemDesignId: 'gemA', qty: 2 }],
    ];
    expect(aggregateGemClaims(perPiece)).toEqual([
      { gemDesignId: 'gemA', qty: 4 },
      { gemDesignId: 'gemB', qty: 1 },
    ]);
  });
});

// ── Integration tests (real replica set — transactions) ─────────────────────

describe('production run transactional core (real MongoDB)', () => {
  let replicaSet; let client; let database;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = new MongoClient(replicaSet.getUri());
    await client.connect();
    database = client.db('production-run-test');
  }, 120000);

  afterAll(async () => {
    await client?.close();
    await replicaSet?.stop();
  });

  async function seedDesign(designID, { type = 'limited', limit = 10, variants } = {}) {
    await database.collection('designs').insertOne({
      designID,
      variants: variants || [{ variantId: 'v1', active: true, gemstones: [] }],
      edition: { type, limit, allocated: 0, committed: 0, nextNumber: 1 },
    });
  }
  const readDesign = (designID) => database.collection('designs').findOne({ designID });

  it('AC1/AC2 mints Σqty pieces with sequential edition numbers and advances the design counters', async () => {
    await seedDesign('d-mint', { limit: 10, variants: [
      { variantId: 'v1', active: true, gemstones: [] },
      { variantId: 'v2', active: true, gemstones: [] },
    ] });
    const { run, pieces } = await mintRun({
      client, database, designID: 'd-mint', createdBy: 'artisan-1', solo: true,
      items: [{ variantId: 'v1', qty: 2 }, { variantId: 'v2', qty: 3 }],
    });
    expect(pieces).toHaveLength(5);
    expect(pieces.map((p) => p.editionNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(pieces.every((p) => p.status === 'casting_ordered')).toBe(true);
    expect(run.pieceIDs).toHaveLength(5);
    expect(run.status).toBe('casting');
    const design = await readDesign('d-mint');
    expect(design.edition).toMatchObject({ allocated: 5, committed: 0, nextNumber: 6 });
    const stored = await database.collection('runs').findOne({ runId: run.runId });
    expect(stored.pieceIDs).toHaveLength(5);
  });

  it('AC1 is all-or-nothing: minting past the cap throws and writes NOTHING', async () => {
    await seedDesign('d-over', { limit: 2 });
    const before = await readDesign('d-over');
    await expect(mintRun({
      client, database, designID: 'd-over', createdBy: 'a', items: [{ variantId: 'v1', qty: 3 }],
    })).rejects.toBeInstanceOf(EditionCapacityError);
    const after = await readDesign('d-over');
    expect(after.edition).toEqual(before.edition);          // counters untouched
    expect(await database.collection('pieces').countDocuments({ designID: 'd-over' })).toBe(0);
    expect(await database.collection('runs').countDocuments({ designID: 'd-over' })).toBe(0);
  });

  it('AC3 reserves linked-gem editions in the same tx; an exhausted gem fails the WHOLE run', async () => {
    // A finite gem with only 1 slot left, linked by the jewelry variant.
    await database.collection('designs').insertOne({
      designID: 'gem-scarce', variants: [{ variantId: 'gv', active: true }],
      edition: { type: 'limited', limit: 1, allocated: 0, committed: 0, nextNumber: 1 },
    });
    await seedDesign('jewel-gem', { limit: 10, variants: [
      { variantId: 'v1', active: true, gemstones: [{ gemDesignId: 'gem-scarce', qty: 1 }] },
    ] });
    // Jewelry cap has room (10) but gem cap (1) cannot cover 2 → whole run fails, nothing written.
    await expect(mintRun({
      client, database, designID: 'jewel-gem', createdBy: 'a', items: [{ variantId: 'v1', qty: 2 }],
    })).rejects.toBeInstanceOf(EditionCapacityError);
    expect(await database.collection('pieces').countDocuments({ designID: 'jewel-gem' })).toBe(0);
    const jewel = await readDesign('jewel-gem');
    expect(jewel.edition.allocated).toBe(0);                // jewelry not allocated despite room
    const gem = await readDesign('gem-scarce');
    expect(gem.edition.committed).toBe(0);                  // gem reservation rolled back

    // Now mint exactly 1 → gem reserved (committed, NOT allocated — it isn't cut yet).
    const { pieces } = await mintRun({
      client, database, designID: 'jewel-gem', createdBy: 'a', items: [{ variantId: 'v1', qty: 1 }],
    });
    expect(pieces[0].gemClaims).toEqual([{ gemDesignId: 'gem-scarce', gemVariantId: null, gemColor: null, qty: 1 }]);
    const gemAfter = await readDesign('gem-scarce');
    expect(gemAfter.edition.committed).toBe(1);
    expect(gemAfter.edition.allocated).toBe(0);
  });

  it('AC4 scrap releases the slot + gem, retires the number; replacement gets a FRESH number', async () => {
    await database.collection('designs').insertOne({
      designID: 'gem-x', variants: [{ variantId: 'gv', active: true }],
      edition: { type: 'limited', limit: 5, allocated: 0, committed: 0, nextNumber: 1 },
    });
    await seedDesign('d-scrap', { limit: 3, variants: [
      { variantId: 'v1', active: true, gemstones: [{ gemDesignId: 'gem-x', qty: 1 }] },
    ] });
    const { pieces } = await mintRun({
      client, database, designID: 'd-scrap', createdBy: 'a', items: [{ variantId: 'v1', qty: 3 }],
    });
    expect(await readDesign('d-scrap').then((d) => d.edition)).toMatchObject({ allocated: 3, nextNumber: 4 });
    expect(await readDesign('gem-x').then((d) => d.edition.committed)).toBe(3);

    const victim = pieces.find((p) => p.editionNumber === 2);
    await scrapPiece({ client, database, pieceID: victim.pieceID, reason: 'casting failed' });
    const scrapped = await database.collection('pieces').findOne({ pieceID: victim.pieceID });
    expect(scrapped.status).toBe('scrapped');
    const design = await readDesign('d-scrap');
    expect(design.edition.allocated).toBe(2);               // slot released
    expect(design.edition.nextNumber).toBe(4);              // number NOT reused — retired
    expect(await readDesign('gem-x').then((d) => d.edition.committed)).toBe(2);  // gem released

    // Replacement mint draws nextNumber (4), never the retired #2.
    const { pieces: repl } = await mintRun({
      client, database, designID: 'd-scrap', createdBy: 'a', items: [{ variantId: 'v1', qty: 1 }],
    });
    expect(repl[0].editionNumber).toBe(4);
    expect(await readDesign('d-scrap').then((d) => d.edition)).toMatchObject({ allocated: 3, nextNumber: 5 });
  });

  it('AC4 refuses to scrap a sold piece', async () => {
    await seedDesign('d-sold', { limit: 2 });
    const { pieces } = await mintRun({ client, database, designID: 'd-sold', createdBy: 'a', items: [{ variantId: 'v1', qty: 1 }] });
    await database.collection('pieces').updateOne({ pieceID: pieces[0].pieceID }, { $set: { status: 'sold' } });
    const before = await readDesign('d-sold');
    await expect(scrapPiece({ client, database, pieceID: pieces[0].pieceID })).rejects.toBeInstanceOf(EditionCapacityError);
    expect(await readDesign('d-sold').then((d) => d.edition)).toEqual(before.edition);
  });

  it('AC5 cancelRun cancels non-terminal pieces and leaves a sold one intact', async () => {
    await seedDesign('d-cancel', { limit: 5 });
    const { run, pieces } = await mintRun({ client, database, designID: 'd-cancel', createdBy: 'a', items: [{ variantId: 'v1', qty: 3 }] });
    await database.collection('pieces').updateOne({ pieceID: pieces[0].pieceID }, { $set: { status: 'sold' } });
    const res = await cancelRun({ client, database, runId: run.runId });
    expect(res.status).toBe('cancelled');
    expect(res.cancelled).toHaveLength(2);
    expect(res.skipped).toEqual([pieces[0].pieceID]);
    const design = await readDesign('d-cancel');
    expect(design.edition.allocated).toBe(1);               // only the sold piece keeps its slot
    expect(await database.collection('runs').findOne({ runId: run.runId }).then((r) => r.status)).toBe('cancelled');
  });

  it('AC6 gem reserve/release helpers are usable standalone', async () => {
    await database.collection('designs').insertOne({
      designID: 'gem-solo', variants: [{ variantId: 'gv', active: true }],
      edition: { type: 'limited', limit: 4, allocated: 0, committed: 0, nextNumber: 1 },
    });
    await reserveGemEditions({ database, gemClaims: [{ gemDesignId: 'gem-solo', qty: 3 }] });
    expect(await readDesign('gem-solo').then((d) => d.edition.committed)).toBe(3);
    await expect(reserveGemEditions({ database, gemClaims: [{ gemDesignId: 'gem-solo', qty: 2 }] }))
      .rejects.toBeInstanceOf(EditionCapacityError);
    await releaseGemEditions({ database, gemClaims: [{ gemDesignId: 'gem-solo', qty: 3 }] });
    expect(await readDesign('gem-solo').then((d) => d.edition.committed)).toBe(0);
  });

  it('AC7 concurrent mints never exceed the edition cap', async () => {
    await seedDesign('d-race', { limit: 4 });
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () => mintRun({
        client, database, designID: 'd-race', createdBy: 'a', items: [{ variantId: 'v1', qty: 1 }],
      })),
    );
    const ok = attempts.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(4);
    expect(attempts.filter((r) => r.reason instanceof EditionCapacityError)).toHaveLength(4);
    const design = await readDesign('d-race');
    expect(design.edition.allocated).toBe(4);
    const nums = (await database.collection('pieces').find({ designID: 'd-race' }).toArray()).map((p) => p.editionNumber).sort((a, b) => a - b);
    expect(nums).toEqual([1, 2, 3, 4]);                     // unique, no gaps, no dupes
  });

  it('mints unlimited editions of any quantity', async () => {
    await seedDesign('d-unl', { type: 'unlimited', limit: null });
    const { pieces } = await mintRun({ client, database, designID: 'd-unl', createdBy: 'a', items: [{ variantId: 'v1', qty: 25 }] });
    expect(pieces).toHaveLength(25);
    expect(await readDesign('d-unl').then((d) => d.edition.allocated)).toBe(25);
  });
});
