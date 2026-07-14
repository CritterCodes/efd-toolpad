import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { storageClient, STORAGE_BUCKET } from '@/lib/storage';

export const DELETE = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'superadmin', 'dev', 'staff', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id, imageId } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  const db = await mongo.connect();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const isArtisan = session.user.role === 'artisan';
  const ownerId = session.user.userID || session.user.id;
  const isOwner = [product.artisanId, product.userId, product.seller?.userId].filter(Boolean).includes(ownerId);
  const isAdminRole = ['admin', 'superadmin', 'dev', 'staff'].includes(session.user.role);

  if (!isAdminRole && (!isArtisan || !isOwner)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  if (isArtisan && isOwner && product.status !== 'draft') {
    return NextResponse.json({ error: 'Can only edit draft products' }, { status: 400 });
  }

  const image = Array.isArray(product.images)
    ? product.images.find((item) => item && typeof item === 'object' && item.id === imageId)
    : null;
  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  const updated = await db.collection('products').updateOne(
    { _id: new ObjectId(id), 'images.id': imageId },
    { $pull: { images: { id: imageId } }, $set: { updatedAt: new Date() } }
  );
  if (updated.modifiedCount !== 1) {
    return NextResponse.json({ error: 'Image changed before it could be removed.' }, { status: 409 });
  }
  if (image.key) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: image.key })).catch((error) => {
      console.error('Product image object cleanup failed:', { productId: id, imageId, error: error.message });
    });
  }
  return NextResponse.json({ ok: true });
};
