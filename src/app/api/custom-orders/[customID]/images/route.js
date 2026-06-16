import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { S3UploadService } from '@/services/aws/s3Upload.service';

/** POST /api/custom-orders/[customID]/images — upload a moodboard/reference image to S3. */
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
  const url = await S3UploadService.uploadToS3(
    buffer,
    file.name || 'image',
    file.type || 'application/octet-stream',
    `admin/custom-orders/${customID}/moodboard`,
  );
  const image = await CustomOrdersModel.addImage(customID, {
    url,
    caption: form.get('caption') || '',
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  });
  return NextResponse.json(image, { status: 201 });
};
