import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024;
const CERTIFICATE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'dev', 'staff']);

export const POST = async (request, { params }) => {
  const { session, errorResponse } = await requireRole([...ADMIN_ROLES, 'artisan']);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  const db = await mongo.connect();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const actorId = session.user.userID || session.user.id;
  const isOwner = [product.artisanId, product.userId, product.seller?.userId]
    .filter(Boolean)
    .includes(actorId);
  const isAdmin = ADMIN_ROLES.has(session.user.role);
  if (!isAdmin && (session.user.role !== 'artisan' || !isOwner)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  if (!isAdmin && product.status !== 'draft') {
    return NextResponse.json({ error: 'Can only edit draft products' }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A certificate file is required.' }, { status: 400 });
  }
  if (!CERTIFICATE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Certificate must be a PDF, JPEG, PNG, or WebP file.' }, { status: 415 });
  }
  if (Number(file.size) > MAX_CERTIFICATE_BYTES) {
    return NextResponse.json({ error: 'Certificate must be 10 MB or smaller.' }, { status: 413 });
  }

  const safeName = (file.name || 'certificate').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `admin/products/${id}/certificate/${Date.now()}-${safeName}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  const certification = {
    ...(product.gemstone?.certification || {}),
    url: storageUrl(key),
    key,
    filename: file.name || safeName,
    uploadedAt: new Date(),
    uploadedBy: actorId,
  };
  const updated = await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $set: { 'gemstone.certification': certification, updatedAt: new Date() } }
  );
  if (updated.modifiedCount !== 1) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })).catch(() => {});
    return NextResponse.json({ error: 'Product changed before the certificate could be attached.' }, { status: 409 });
  }

  const previousKey = product.gemstone?.certification?.key;
  if (previousKey && previousKey !== key) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: previousKey })).catch((error) => {
      console.error('Previous product certificate cleanup failed:', { productId: id, error: error.message });
    });
  }

  return NextResponse.json(certification, { status: 201 });
};
