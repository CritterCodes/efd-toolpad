import { NextResponse } from 'next/server';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireRole } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

const ALLOWED_MEDIA_TYPES = ['video', 'glb'];
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_GLB_BYTES = 50 * 1024 * 1024;

async function checkAccess(session, product) {
  const isArtisan = session.user.role === 'artisan';
  const ownerId = session.user.userID || session.user.id;
  const isOwner = [product.artisanId, product.userId, product.seller?.userId].filter(Boolean).includes(ownerId);
  const isAdminRole = ['admin', 'superadmin', 'dev', 'staff'].includes(session.user.role);
  if (!isAdminRole && (!isArtisan || !isOwner)) return false;
  return true;
}

export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'superadmin', 'dev', 'staff', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  let form;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const mediaType = form.get('mediaType');
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: `mediaType must be one of: ${ALLOWED_MEDIA_TYPES.join(', ')}` }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }

  if (mediaType === 'video' && !String(file.type || '').startsWith('video/')) {
    return NextResponse.json({ error: 'Only video files are accepted for mediaType=video.' }, { status: 415 });
  }
  if (mediaType === 'glb' && !String(file.name || '').toLowerCase().endsWith('.glb')) {
    return NextResponse.json({ error: 'Only .glb files are accepted for mediaType=glb.' }, { status: 415 });
  }

  const maxBytes = mediaType === 'video' ? MAX_VIDEO_BYTES : MAX_GLB_BYTES;
  if (Number(file.size) > maxBytes) {
    return NextResponse.json({ error: `File exceeds ${maxBytes / 1024 / 1024} MB limit.` }, { status: 413 });
  }

  const db = await mongo.connect();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  if (!await checkAccess(session, product)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const existing = product.salesMedia?.[mediaType];
  if (existing?.key) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: existing.key })).catch(() => {});
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || mediaType).replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `admin/products/${id}/sales-media/${mediaType}-${Date.now()}-${safeName}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
  }));

  const media = {
    id: new ObjectId().toHexString(),
    url: storageUrl(key),
    key,
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  };

  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $set: { [`salesMedia.${mediaType}`]: media, updatedAt: new Date() } }
  );
  return NextResponse.json(media, { status: 201 });
};

export const DELETE = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'superadmin', 'dev', 'staff', 'artisan']);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const mediaType = searchParams.get('mediaType');
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: `mediaType query param must be one of: ${ALLOWED_MEDIA_TYPES.join(', ')}` }, { status: 400 });
  }

  const db = await mongo.connect();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  if (!await checkAccess(session, product)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const media = product.salesMedia?.[mediaType];
  if (!media) return NextResponse.json({ error: 'Media not found' }, { status: 404 });

  if (media.key) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: media.key })).catch((err) => {
      console.error('Sales media object cleanup failed:', { productId: id, mediaType, error: err.message });
    });
  }

  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $unset: { [`salesMedia.${mediaType}`]: '' }, $set: { updatedAt: new Date() } }
  );
  return NextResponse.json({ ok: true });
};
