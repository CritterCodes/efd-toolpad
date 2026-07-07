import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { db } from '@/lib/database';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

/**
 * U-4 (production-ui-rework) — shared entity-image plumbing, mirroring the custom-orders images route
 * (MinIO via lib/storage; images stored as an `images[]` sub-doc `{id,url,key,caption,isPrimary,uploadedAt}`).
 * One helper for piece / collection / product so the upload+delete logic isn't copy-pasted per entity;
 * each route just supplies the collection + filter + key prefix. The FIRST image becomes `isPrimary`
 * (the card thumbnail source, U-6). Returns `{ status, image? , error? }` for the route to echo.
 */

export async function uploadEntityImage({ collection, filter, keyPrefix, form, uploadedBy = 'admin' }) {
  const file = form?.get?.('file');
  if (!file || typeof file.arrayBuffer !== 'function') return { status: 400, error: 'A file is required (multipart/form-data).' };

  const dbInstance = await db.connect();
  const col = dbInstance.collection(collection);
  const doc = await col.findOne(filter, { projection: { images: 1 } });
  if (!doc) return { status: 404, error: 'Not found.' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${keyPrefix}/${Date.now()}-${safeName}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'application/octet-stream',
  }));

  const image = {
    id: randomUUID(),
    url: storageUrl(key),
    key,
    caption: String(form.get('caption') || ''),
    isPrimary: !(Array.isArray(doc.images) && doc.images.length), // first image = primary
    uploadedBy,
    uploadedAt: new Date(),
  };
  await col.updateOne(filter, { $push: { images: image }, $set: { updatedAt: new Date() } });
  return { status: 201, image };
}

export async function deleteEntityImage({ collection, filter, imageId }) {
  const dbInstance = await db.connect();
  const col = dbInstance.collection(collection);
  const res = await col.updateOne(filter, { $pull: { images: { id: imageId } }, $set: { updatedAt: new Date() } });
  if (!res.matchedCount) return { status: 404, error: 'Not found.' };
  return { status: 200, ok: true };
}
