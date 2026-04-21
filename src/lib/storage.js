import { S3Client } from '@aws-sdk/client-s3';

/**
 * Central storage config — uses MinIO when MINIO_ENDPOINT is set, falls back to AWS S3.
 * Both use @aws-sdk/client-s3 since MinIO speaks the S3 protocol.
 */
function createStorageClient() {
  const endpoint = process.env.MINIO_ENDPOINT;
  if (endpoint) {
    const port = process.env.MINIO_PORT || 9000;
    const useSsl = process.env.MINIO_USE_SSL === 'true';
    return new S3Client({
      region: 'us-east-1', // MinIO ignores region — SDK requires a value
      endpoint: `${useSsl ? 'https' : 'http'}://${endpoint}:${port}`,
      forcePathStyle: true, // Required for MinIO (path-style: /bucket/key)
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
      },
    });
  }
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export const storageClient = createStorageClient();

export const STORAGE_BUCKET =
  process.env.MINIO_BUCKET ||
  process.env.AWS_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET_NAME;

/**
 * Build a public-readable URL for an object key.
 * MinIO: https://s3.crittercodes.dev/efd-repair-images/key
 * AWS:   https://efd-repair-images.s3.us-east-2.amazonaws.com/key
 */
export function storageUrl(key) {
  if (process.env.MINIO_PUBLIC_URL) {
    return `${process.env.MINIO_PUBLIC_URL}/${STORAGE_BUCKET}/${key}`;
  }
  const bucket = STORAGE_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Extract the object key from a full storage URL.
 * Handles both MinIO path-style and AWS virtual-hosted URLs.
 */
export function extractKeyFromStorageUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\//, ''); // strip leading slash

    // MinIO path-style URL: https://s3.crittercodes.dev/efd-repair-images/admin/repairs/file.jpg
    // pathname = "efd-repair-images/admin/repairs/file.jpg" → strip bucket prefix
    if (process.env.MINIO_PUBLIC_URL) {
      const minioOrigin = new URL(process.env.MINIO_PUBLIC_URL).origin;
      if (urlObj.origin === minioOrigin) {
        const bucket = STORAGE_BUCKET;
        return pathname.startsWith(bucket + '/') ? pathname.slice(bucket.length + 1) : pathname;
      }
    }

    // AWS virtual-hosted: https://bucket.s3.region.amazonaws.com/admin/repairs/file.jpg
    // pathname is already just the key
    return pathname;
  } catch {
    return null;
  }
}
