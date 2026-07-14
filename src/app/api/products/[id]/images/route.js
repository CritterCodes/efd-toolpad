import { NextResponse } from 'next/server';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'superadmin', 'dev', 'staff', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id } = await params;
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

  let form;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a file.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }
  if (!String(file.type || '').startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are supported.' }, { status: 415 });
  }
  if (Number(file.size) > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image must be 10 MB or smaller.' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `admin/products/${id}/${Date.now()}-${safeName}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
  }));

  const image = {
    id: new ObjectId().toHexString(),
    url: storageUrl(key),
    key,
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  };
  const updated = await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $push: { images: image }, $set: { updatedAt: new Date() } }
  );
  if (updated.modifiedCount !== 1) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })).catch(() => {});
    return NextResponse.json({ error: 'Product changed before the image could be attached.' }, { status: 409 });
  }
  return NextResponse.json(image, { status: 201 });
};
