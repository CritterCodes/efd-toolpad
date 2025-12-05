import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize the S3 Client globally for reuse
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

/**
 * Upload a file directly to S3 with organized folder structure
 * @param {File} file - The file to upload.
 * @param {string} folder - The folder path (e.g., 'admin/repairs', 'admin/tasks')
 * @param {string} prefix - Optional prefix for the filename
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
export const uploadFileToS3 = async (file, folder = 'admin/general', prefix = '') => {
    try {
        const fileBuffer = await file.arrayBuffer();  // Convert file to buffer
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `${folder}/${prefix}${timestamp}-${sanitizedName}`;

        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: file.type,  // No ACL here since bucket owner enforced
        };

        // Upload file to S3 without ACL
        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct the public URL assuming bucket policy allows public reads
        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
        
        console.log('✅ File uploaded successfully:', fileUrl);
        return fileUrl;
    } catch (error) {
        console.error("❌ Error uploading to S3:", error);
        throw new Error("Failed to upload file to S3");
    }
};

/**
 * Upload repair task image with organized structure
 * @param {File} file - The file to upload
 * @param {string} taskId - The repair task ID
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadRepairTaskImage = async (file, taskId) => {
    return uploadFileToS3(file, `admin/repair-tasks/${taskId}`, 'image-');
};

/**
 * Upload general repair image with organized structure
 * @param {File} file - The file to upload
 * @param {string} repairId - The repair ID
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadRepairImage = async (file, repairId = 'general') => {
    return uploadFileToS3(file, `admin/repairs/${repairId}`, 'image-');
};

/**
 * Upload base64 encoded image to S3
 * Used for images uploaded via communication channels
 * @param {string} base64Data - Base64 encoded image data (with or without data: prefix)
 * @param {string} fileName - Original filename
 * @param {string} fileType - MIME type (e.g., 'image/png')
 * @param {string} folder - Folder path for organization (default: 'communications')
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadBase64ToS3 = async (base64Data, fileName, fileType, folder = 'communications') => {
    try {
        // Remove data: prefix if present
        const base64String = base64Data.startsWith('data:') 
            ? base64Data.split(',')[1] 
            : base64Data;

        // Convert base64 to buffer
        const buffer = Buffer.from(base64String, 'base64');
        
        const timestamp = Date.now();
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `${folder}/${timestamp}-${sanitizedName}`;

        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            Body: buffer,
            ContentType: fileType || 'application/octet-stream',
        };

        // Upload file to S3
        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct the public URL
        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
        
        console.log('✅ Base64 image uploaded successfully:', fileUrl);
        return fileUrl;
    } catch (error) {
        console.error("❌ Error uploading base64 image to S3:", error);
        throw new Error(`Failed to upload image to S3: ${error.message}`);
    }
};
