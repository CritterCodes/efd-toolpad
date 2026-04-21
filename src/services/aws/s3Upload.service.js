import { PutObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET, storageUrl } from '../../lib/storage.js';

export class S3UploadService {
    static async uploadToS3(fileBuffer, fileName, fileType, folder = 'admin/general', prefix = '') {
        try {
            const timestamp = Date.now();
            const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileKey = `${folder}/${prefix}${timestamp}-${sanitizedName}`;

            await storageClient.send(new PutObjectCommand({
                Bucket: STORAGE_BUCKET,
                Key: fileKey,
                Body: Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer),
                ContentType: fileType || 'application/octet-stream',
            }));

            const fileUrl = storageUrl(fileKey);
            console.log('✅ File uploaded successfully:', fileUrl);
            return fileUrl;
        } catch (error) {
            console.error("❌ Error uploading to storage:", error);
            throw new Error(`Failed to upload file to storage: ${error.message}`);
        }
    }
}
