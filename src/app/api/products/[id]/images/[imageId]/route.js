import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';

export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id, imageId } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  const db = await mongo.connect();
  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $pull: { images: { id: imageId } }, $set: { updatedAt: new Date() } }
  );
  return NextResponse.json({ ok: true });
};
