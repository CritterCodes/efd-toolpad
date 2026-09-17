import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAuth } from '@/lib/apiAuth';
import { db as mongo } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import { canManageDesign } from '@/lib/designPermissions';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

/**
 * A design's LISTING photos — `design.media.images`, the gallery the storefront renders.
 *
 * These had no home in admin. `assets` takes referenceImages and sketches (working images), and
 * the only photo manager that existed wrote `products.images` — a collection efd-shop stopped
 * reading, so every photo uploaded there went somewhere no shopper could see. This is the
 * design-side replacement.
 *
 * Shape matches what the shop's resolver already expects: `{ id, url, key, uploadedBy }`, first
 * image first. Order is meaningful — image one is the listing's face.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function load(session, designID) {
  const design = await DesignsModel.findById(designID);
  if (!design) return { error: NextResponse.json({ error: 'Design not found.' }, { status: 404 }) };
  if (!canManageDesign(session, design)) {
    return { error: NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 }) };
  }
  return { design };
}

/** POST — attach a photo. multipart/form-data: { file } */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const { design, error } = await load(session, designID);
  if (error) return error;

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
  const key = `admin/designs/${design.designID}/${Date.now()}-${safeName}`;
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
    uploadedBy: session.user.userID || session.user.email || 'admin',
    uploadedAt: new Date(),
  };

  const db = await mongo.connect();
  const result = await db.collection('designs').updateOne(
    { designID: design.designID },
    { $push: { 'media.images': image }, $set: { updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) {
    // Don't leave an orphan in storage for a write that didn't land.
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })).catch(() => {});
    return NextResponse.json({ error: 'The design changed before the photo could be attached.' }, { status: 409 });
  }
  return NextResponse.json(image, { status: 201 });
};

/**
 * PATCH — reorder. Body: { order: [imageId, …] }
 * Images the caller didn't mention keep their relative order at the end, so a stale tab can
 * never drop a photo it hadn't loaded.
 */
export const PATCH = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const { design, error } = await load(session, designID);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Expected JSON body.' }, { status: 400 });
  }
  if (!Array.isArray(body?.order)) {
    return NextResponse.json({ error: '`order` must be an array of image IDs.' }, { status: 400 });
  }

  const current = design.media?.images || [];
  const byId = new Map(current.map((img) => [img.id, img]));
  const reordered = body.order.map((id) => byId.get(id)).filter(Boolean);
  const untouched = current.filter((img) => !body.order.includes(img.id));
  const images = [...reordered, ...untouched];

  const db = await mongo.connect();
  await db.collection('designs').updateOne(
    { designID: design.designID },
    { $set: { 'media.images': images, updatedAt: new Date() } },
  );
  return NextResponse.json({ images });
};

/** DELETE ?imageId=… — detach a photo and drop the stored object. */
export const DELETE = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const { design, error } = await load(session, designID);
  if (error) return error;

  const imageId = new URL(req.url).searchParams.get('imageId');
  if (!imageId) return NextResponse.json({ error: 'imageId is required.' }, { status: 400 });

  const image = (design.media?.images || []).find((img) => img.id === imageId);
  if (!image) return NextResponse.json({ error: 'Photo not found on this design.' }, { status: 404 });

  const db = await mongo.connect();
  await db.collection('designs').updateOne(
    { designID: design.designID },
    { $pull: { 'media.images': { id: imageId } }, $set: { updatedAt: new Date() } },
  );
  // Best effort: the listing is already correct, and a stranded object is cheaper than a 500
  // on a delete the user saw succeed.
  if (image.key) {
    await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: image.key })).catch(() => {});
  }
  return NextResponse.json({ ok: true });
};
