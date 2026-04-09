import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize the S3 Client globally for reuse
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

export class S3UploadService {
    /**
     * Upload a file buffer to S3 with organized folder structure
     * @param {ArrayBuffer|Buffer} fileBuffer - The file content
     * @param {string} fileName - Original file name
     * @param {string} fileType - MIME type
     * @param {string} folder - The folder path
     * @param {string} prefix - Optional prefix for the filename
     * @returns {Promise<string>} - The public URL of the uploaded file.
     */
    static async uploadToS3(fileBuffer, fileName, fileType, folder = 'admin/general', prefix = '') {
        try {
            const timestamp = Date.now();
            const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileKey = `${folder}/${prefix}${timestamp}-${sanitizedName}`;

            const uploadParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey,
                Body: Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer),
                ContentType: fileType || 'application/octet-stream',
            };

            await s3Client.send(new PutObjectCommand(uploadParams));

            const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
            console.log('✅ File uploaded successfully:', fileUrl);
            return fileUrl;
        } catch (error) {
            console.error("❌ Error uploading to S3:", error);
            throw new Error(`Failed to upload file to S3: ${error.message}`);
        }
    }
}