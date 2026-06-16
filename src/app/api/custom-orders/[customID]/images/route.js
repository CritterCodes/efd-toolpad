import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';

/**
 * POST /api/custom-orders/[customID]/images — upload a moodboard/reference image.
 * Stores to the shared object store via lib/storage (MinIO; the SDK speaks the
 * S3 protocol but the bucket is our self-hosted MinIO, not AWS).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a file.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `admin/custom-orders/${customID}/moodboard/${Date.now()}-${safeName}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
  }));

  const image = await CustomOrdersModel.addImage(customID, {
    url: storageUrl(key),
    key,
    caption: form.get('caption') || '',
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  });
  return NextResponse.json(image, { status: 201 });
};
