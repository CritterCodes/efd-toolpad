import AWS from 'aws-sdk';

// Initialize the S3 client with credentials from environment variables
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

/**
 * Upload an image to S3
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - URL of the uploaded image
 */
export const uploadImageToS3 = async (file) => {
    try {
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: file,
            ACL: "public-read", // Adjust ACL if public access is not needed
            ContentType: file.type
        };

        // Upload the file to S3
        const data = await s3.upload(params).promise();
        return data.Location; // The public URL of the uploaded image
    } catch (error) {
        console.error("❌ Error uploading to S3:", error);
        throw error;
    }
};
