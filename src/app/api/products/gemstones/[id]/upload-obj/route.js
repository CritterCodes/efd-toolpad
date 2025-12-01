import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
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
        console.log('🎨 OBJ Upload API called for gemstone:', params.id);
        
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

        const { db } = await connectToDatabase();

        // Parse form data
        const formData = await request.formData();
        const objFile = formData.get('objFile');

        console.log('📋 OBJ file received');

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
        console.log(`🔍 Looking for gemstone with productId: ${params.id}`);
        
        const gemstone = await db.collection('products').findOne({ 
            productId: params.id
        });

        if (!gemstone) {
            console.log('❌ Gemstone not found:', params.id);
            return NextResponse.json({ 
                error: 'Gemstone not found' 
            }, { status: 404 });
        }

        console.log('✅ Found gemstone:', gemstone.productId || gemstone.title);

        // Check if user is admin or the artisan who owns this product
        if (session.user.role !== 'admin') {
            if (gemstone.userId && gemstone.userId !== session.user.userID) {
                return NextResponse.json({ 
                    error: 'You do not have permission to upload files for this product' 
                }, { status: 403 });
            }
        }

        // Upload file to S3
        console.log(`📁 Uploading OBJ file: ${objFile.name} (${objFile.size} bytes)`);
        
        const fileUrl = await uploadFileToS3(
            objFile,
            `gemstones/${params.id}`,
            'obj-'
        );

        console.log('✅ File uploaded to S3:', fileUrl);

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

        const result = await db.collection('products').findOneAndUpdate(
            { productId: params.id },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        console.log('✅ Gemstone updated with OBJ file info');

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
