import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketUrl = process.env.AWS_S3_BUCKET_URL;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

/**
 * Extract S3 key from full URL
 * URL format: https://efd-repair-images.s3.us-east-2.amazonaws.com/designs/...
 * or: https://efd-repair-images.s3.amazonaws.com/designs/...
 */
function extractKeyFromUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove leading slash and return the pathname
    const key = urlObj.pathname.substring(1);
    console.log('🔑 Extracted S3 key from URL:', { original: url, extracted: key });
    return key;
  } catch (error) {
    console.error('❌ Error extracting key from URL:', error);
    return null;
  }
}

/**
 * Delete file from S3 using full URL
 */
export async function deleteFileFromS3(url) {
  try {
    const key = extractKeyFromUrl(url);
    
    if (!key) {
      throw new Error('Could not extract S3 key from URL');
    }

    console.log('🗑️ Deleting S3 file:', { bucket: bucketName, key });

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const result = await s3Client.send(command);
    console.log('✅ File deleted from S3 successfully:', key);
    return { success: true, key };
  } catch (error) {
    console.error('❌ Error deleting file from S3:', error);
    throw error;
  }
}

/**
 * Delete multiple files from S3
 */
export async function deleteFilesFromS3(urls) {
  try {
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await deleteFileFromS3(url);
        results.push(result);
      } catch (error) {
        console.warn('⚠️ Failed to delete individual file, continuing:', error.message);
        results.push({ success: false, url, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error in batch delete:', error);
    throw error;
  }
}
