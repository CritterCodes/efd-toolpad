import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

export class EditionCapacityError extends Error {}

const cappedFilter = {
  $expr: {
    $lt: [
      { $add: [{ $ifNull: ['$edition.allocated', 0] }, { $ifNull: ['$edition.committed', 0] }] },
      { $cond: [{ $eq: ['$edition.type', 'one_of_one'] }, 1, '$edition.limit'] },
    ],
  },
};

/**
 * Take one slot out of the edition and return its number, atomically.
 *
 * This is the allocation half of `startManualProduction`, pulled out for callers whose piece is
 * born already made (premade intake) and so never passes through `planned`. It shares
 * `cappedFilter`, which is the invariant that matters: a design can only hand out as many
 * numbers as its edition allows, and a one-of-one allows exactly one.
 *
 * @returns {Promise<number>} the piece's edition number
 * @throws {EditionCapacityError} when the edition is spent
 */
export async function allocateEditionNumber({ database, designID, session = null }) {
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const design = await designs.findOneAndUpdate(
    { designID, $or: [{ 'edition.type': 'unlimited' }, cappedFilter] },
    { $inc: { 'edition.allocated': 1, 'edition.nextNumber': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'before', session },
  );
  if (!design) throw new EditionCapacityError('edition capacity exhausted');
  return design.edition?.nextNumber ?? 1;
}

export async function claimMadeToOrder({ database, designID, variantId, resolvedConfiguration = {}, orderId = null, session = null }) {
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const design = await designs.findOneAndUpdate(
    { designID, 'variants.variantId': variantId, 'variants.active': true, $or: [{ 'edition.type': 'unlimited' }, cappedFilter] },
    { $inc: { 'edition.committed': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after', session },
  );
  if (!design) throw new EditionCapacityError('edition capacity exhausted or variant unavailable');
  const piece = {
    pieceID: randomUUID(), designID, variantId, resolvedConfiguration: structuredClone(resolvedConfiguration),
    orderId, dropId: design.dropId ?? null, gemstoneId: design.gemstoneId ?? null,
    status: 'planned', editionNumber: null, createdAt: new Date(), updatedAt: new Date(),
  };
  await pieces.insertOne(piece, { session });
  return piece;
}

export async function startProduction({ database, pieceID, session = null }) {
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const piece = await pieces.findOne({ pieceID, status: 'planned' }, { session });
  if (!piece) throw new EditionCapacityError('piece is not awaiting production');
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const design = await designs.findOneAndUpdate(
    { designID: piece.designID, 'edition.committed': { $gte: 1 } },
    { $inc: { 'edition.committed': -1, 'edition.allocated': 1, 'edition.nextNumber': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'before', session },
  );
  if (!design) throw new EditionCapacityError('no committed capacity for piece');
  const editionNumber = design.edition?.nextNumber ?? 1;
  const updated = await pieces.findOneAndUpdate(
    { pieceID, status: 'planned' },
    { $set: { status: 'casting_ordered', editionNumber, productionStartedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after', session },
  );
  if (!updated) throw new EditionCapacityError('piece production was already started');
  return updated;
}

export async function cancelBeforeProduction({ database, pieceID, session = null }) {
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const piece = await pieces.findOneAndUpdate(
    { pieceID, status: 'planned', editionNumber: null },
    { $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'before', session },
  );
  if (!piece) throw new EditionCapacityError('only unstarted pieces can release capacity');
  await database.collection(Constants.DESIGNS_COLLECTION).updateOne(
    { designID: piece.designID, 'edition.committed': { $gte: 1 } },
    { $inc: { 'edition.committed': -1 }, $set: { updatedAt: new Date() } },
    { session },
  );
  return { ...piece, status: 'cancelled' };
}

export async function withEditionTransaction(client, operation) {
  const session = client.startSession();
  try { return await session.withTransaction(() => operation(session)); } finally { await session.endSession(); }
}

/** Public checkout boundary: the capacity claim and planned Piece insert commit together. */
export function checkoutMadeToOrder({ client, database, ...input }) {
  return withEditionTransaction(client, (session) => claimMadeToOrder({ database, ...input, session }));
}

/** Public production boundary: commitment conversion, number allocation, and Piece state commit together. */
export function beginPieceProduction({ client, database, ...input }) {
  return withEditionTransaction(client, (session) => startProduction({ database, ...input, session }));
}

/** Public cancellation boundary: Piece cancellation and capacity release commit together. */
export function cancelPlannedPiece({ client, database, ...input }) {
  return withEditionTransaction(client, (session) => cancelBeforeProduction({ database, ...input, session }));
}

/**
 * Manual production start: no committed slot exists (piece was not created via MTO
 * checkout). Checks edition capacity directly — allocated + committed < limit — then
 * atomically increments allocated and assigns the next edition number. Same atomicity
 * guarantee as startProduction; the difference is that committed is not decremented.
 */
export async function startManualProduction({ database, pieceID, session = null }) {
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const piece = await pieces.findOne({ pieceID, status: 'planned' }, { session });
  if (!piece) throw new EditionCapacityError('piece is not awaiting production');
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const design = await designs.findOneAndUpdate(
    { designID: piece.designID, $or: [{ 'edition.type': 'unlimited' }, cappedFilter] },
    { $inc: { 'edition.allocated': 1, 'edition.nextNumber': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'before', session },
  );
  if (!design) throw new EditionCapacityError('edition capacity exhausted');
  const editionNumber = design.edition?.nextNumber ?? 1;
  const updated = await pieces.findOneAndUpdate(
    { pieceID, status: 'planned' },
    { $set: { status: 'casting_ordered', editionNumber, productionStartedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after', session },
  );
  if (!updated) throw new EditionCapacityError('piece production was already started');
  return updated;
}

/** Public manual production boundary: direct cap allocation and Piece state commit together. */
export function beginManualPieceProduction({ client, database, ...input }) {
  return withEditionTransaction(client, (session) => startManualProduction({ database, ...input, session }));
}
