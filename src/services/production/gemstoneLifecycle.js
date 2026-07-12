import { db } from '@/lib/database';

export async function setGemstonePieceStatus(gemstoneId, status) {
  if (!gemstoneId) return { matchedCount: 0, modifiedCount: 0 };
  const dbInstance = await db.connect();
  return dbInstance.collection('pieces').updateOne(
    { productID: gemstoneId },
    { $set: { status, updatedAt: new Date() } },
  );
}

export async function reserveLinkedGemstones(products = []) {
  const gemstoneIds = [...new Set(products.map((product) => product?.references?.gemstoneId).filter(Boolean))];
  if (!gemstoneIds.length) return { matchedCount: 0, modifiedCount: 0 };
  const dbInstance = await db.connect();
  return dbInstance.collection('pieces').updateMany(
    { productID: { $in: gemstoneIds }, status: { $ne: 'sold' } },
    { $set: { status: 'reserved', updatedAt: new Date() } },
  );
}
