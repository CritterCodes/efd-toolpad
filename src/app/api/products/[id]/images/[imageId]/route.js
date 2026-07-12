import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';

export const DELETE = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id, imageId } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  const db = await mongo.connect();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const isArtisan = session.user.role === 'artisan';
  const isOwner = product.artisanId === (session.user.userID || session.user.id);
  const isAdminRole = ['admin', 'superadmin', 'dev'].includes(session.user.role);

  if (!isAdminRole && (!isArtisan || !isOwner)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  if (isArtisan && isOwner && product.status !== 'draft') {
    return NextResponse.json({ error: 'Can only edit draft products' }, { status: 400 });
  }

  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $pull: { images: { id: imageId } }, $set: { updatedAt: new Date() } }
  );
  return NextResponse.json({ ok: true });
};
