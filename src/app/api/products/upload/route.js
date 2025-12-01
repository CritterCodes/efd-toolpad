import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { uploadFileToS3 } from '../../../../utils/s3.util';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const formData = await request.formData();
        const files = formData.getAll('images');
        const productId = formData.get('productId');
        const productType = formData.get('productType') || 'general';

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // Upload all files to S3
        const uploadPromises = files.map(async (file) => {
            if (file.size === 0) return null; // Skip empty files
            
            try {
                const imageUrl = await uploadFileToS3(
                    file, 
                    `admin/products/${productType}/${productId}`, 
                    'image-'
                );
                return imageUrl;
            } catch (error) {
                console.error(`Failed to upload file ${file.name}:`, error);
                return null;
            }
        });

        const uploadResults = await Promise.all(uploadPromises);
        const successfulUploads = uploadResults.filter(url => url !== null);

        if (successfulUploads.length === 0) {
            return NextResponse.json({ error: 'All uploads failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            uploadedImages: successfulUploads,
            totalUploaded: successfulUploads.length,
            totalAttempted: files.length
        });

    } catch (error) {
        console.error('Upload API error:', error);
        return NextResponse.json(
            { error: 'Failed to upload images' }, 
            { status: 500 }
        );
    }
}