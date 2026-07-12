import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id } = await params;
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

  let form;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a file.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
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
  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $push: { images: image }, $set: { updatedAt: new Date() } }
  );
  return NextResponse.json(image, { status: 201 });
};
