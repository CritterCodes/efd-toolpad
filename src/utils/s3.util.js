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
 * Upload a file directly to S3 without ACLs (Bucket must have proper policy)
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
export const uploadFileToS3 = async (file) => {
    try {
        const fileBuffer = await file.arrayBuffer();  // Convert file to buffer
        const fileKey = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;

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
