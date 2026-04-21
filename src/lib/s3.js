import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { storageClient, STORAGE_BUCKET, extractKeyFromStorageUrl } from './storage.js';

/**
 * Delete file from storage using its full URL.
 */
export async function deleteFileFromS3(url) {
  const key = extractKeyFromStorageUrl(url);
  if (!key) throw new Error('Could not extract storage key from URL: ' + url);

  console.log('🗑️ Deleting storage file:', { bucket: STORAGE_BUCKET, key });

  await storageClient.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));

  console.log('✅ File deleted successfully:', key);
  return { success: true, key };
}

/**
 * Delete multiple files from storage.
 */
export async function deleteFilesFromS3(urls) {
  const results = [];
  for (const url of urls) {
    try {
      results.push(await deleteFileFromS3(url));
    } catch (error) {
      console.warn('⚠️ Failed to delete file, continuing:', error.message);
      results.push({ success: false, url, error: error.message });
    }
  }
  return results;
}
