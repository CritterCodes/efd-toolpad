import { PutObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET, storageUrl } from '../lib/storage.js';

/**
 * Upload a file to storage with organized folder structure.
 */
export const uploadFileToS3 = async (file, folder = 'admin/general', prefix = '') => {
    try {
        const fileBuffer = await file.arrayBuffer();
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `${folder}/${prefix}${timestamp}-${sanitizedName}`;

        await storageClient.send(new PutObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: file.type || 'application/octet-stream',
        }));

        const fileUrl = storageUrl(fileKey);
        console.log('✅ File uploaded successfully:', fileUrl);
        return fileUrl;
    } catch (error) {
        console.error("❌ Error uploading file:", error);
        throw new Error("Failed to upload file to storage");
    }
};

export const uploadRepairTaskImage = async (file, taskId) =>
    uploadFileToS3(file, `admin/repair-tasks/${taskId}`, 'image-');

export const uploadRepairImage = async (file, repairId = 'general') =>
    uploadFileToS3(file, `admin/repairs/${repairId}`, 'image-');

/**
 * Upload base64 encoded image (used for images from communication channels).
 */
export const uploadBase64ToS3 = async (base64Data, fileName, fileType, folder = 'communications') => {
    try {
        const base64String = base64Data.startsWith('data:')
            ? base64Data.split(',')[1]
            : base64Data;

        const buffer = Buffer.from(base64String, 'base64');
        const timestamp = Date.now();
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `${folder}/${timestamp}-${sanitizedName}`;

        await storageClient.send(new PutObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: fileKey,
            Body: buffer,
            ContentType: fileType || 'application/octet-stream',
        }));

        const fileUrl = storageUrl(fileKey);
        console.log('✅ Base64 image uploaded successfully:', fileUrl);
        return fileUrl;
    } catch (error) {
        console.error("❌ Error uploading base64 image:", error);
        throw new Error(`Failed to upload image to storage: ${error.message}`);
    }
};
