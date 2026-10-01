import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';
import { uploadFileToS3 } from '@/utils/s3.util';

/**
 * Upload OBJ file for a gemstone product
 * POST /api/products/gemstones/[id]/upload-obj
 * 
 * Accepts FormData with:
 * - objFile: File (required) - The OBJ file to upload
 * 
 * Returns:
 * {
 *   success: true,
 *   obj3DFile: {
 *     url: string,
 *     filename: string,
 *     fileSize: number,
 *     uploadedAt: Date,
 *     downloadCount: 0
 *   }
 * }
 */
export async function POST(request, { params }) {
    try {
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check user role - admin, artisan (CAD Designer/Gem Cutter), or owner
        if (session.user.role !== 'admin' && session.user.artisanTypes?.length === 0) {
            return NextResponse.json({ 
                error: 'Access denied. Admin or artisan role required.' 
            }, { status: 403 });
        }

        const db = await mongo.connect();

        // Parse form data
        const formData = await request.formData();
        const objFile = formData.get('objFile');


        // Validate file
        if (!objFile || objFile.size === 0) {
            return NextResponse.json({ error: 'OBJ file is required' }, { status: 400 });
        }

        // Validate file extension
        const fileName = objFile.name.toLowerCase();
        if (!fileName.endsWith('.obj')) {
            return NextResponse.json({ 
                error: 'File must be in .obj format' 
            }, { status: 400 });
        }

        // Validate file size (max 50MB for OBJ files)
        const maxSize = 50 * 1024 * 1024;
        if (objFile.size > maxSize) {
            return NextResponse.json({ 
                error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` 
            }, { status: 413 });
        }

        // Find the gemstone product
        
        const gemstone = await db.collection('products').findOne({ 
            productId: params.id
        });

        if (!gemstone) {
            return NextResponse.json({ 
                error: 'Gemstone not found' 
            }, { status: 404 });
        }


        // Check if user is admin or the artisan who owns this product
        if (session.user.role !== 'admin') {
            if (gemstone.userId && gemstone.userId !== session.user.userID) {
                return NextResponse.json({ 
                    error: 'You do not have permission to upload files for this product' 
                }, { status: 403 });
            }
        }

        // Upload file to S3
        
        const fileUrl = await uploadFileToS3(
            objFile,
            `gemstones/${params.id}`,
            'obj-'
        );


        // Update gemstone product with OBJ file info
        const updateData = {
            obj3DFile: {
                url: fileUrl,
                filename: objFile.name,
                fileSize: objFile.size,
                uploadedAt: new Date(),
                downloadCount: 0
            },
            updatedAt: new Date(),
            updatedBy: session.user.userID
        };

        await db.collection('products').findOneAndUpdate(
            { productId: params.id },
            { $set: updateData },
            { returnDocument: 'after' }
        );


        return NextResponse.json({
            success: true,
            obj3DFile: updateData.obj3DFile,
            message: 'OBJ file uploaded successfully'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ OBJ Upload Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to upload OBJ file'
        }, { status: 500 });
    }
}
