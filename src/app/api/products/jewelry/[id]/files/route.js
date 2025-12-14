import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { connectToDatabase } from '@/lib/mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;
        const formData = await request.formData();
        const file = formData.get('file');
        const type = formData.get('type'); // 'obj', 'stl', 'glb'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!['obj', 'stl', 'glb'].includes(type)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }

        // Upload to S3
        const folder = `admin/products/jewelry/${id}/${type}`;
        const fileUrl = await uploadFileToS3(file, folder, `${type}-`);

        if (!fileUrl) {
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
        }

        // Update database
        const { db } = await connectToDatabase();
        
        const updateField = `jewelry.${type}File`; // e.g., jewelry.objFile, jewelry.stlFile
        
        let query = { productId: id, productType: 'jewelry' };
        if (ObjectId.isValid(id)) {
             // Try to find by _id if productId not found, but usually we use productId in URL
             const exists = await db.collection('products').findOne(query);
             if (!exists) {
                 query = { _id: new ObjectId(id), productType: 'jewelry' };
             }
        }

        await db.collection('products').updateOne(
            query,
            { 
                $set: { 
                    [updateField]: fileUrl,
                    updatedAt: new Date()
                } 
            }
        );

        return NextResponse.json({ 
            success: true, 
            fileUrl 
        });

    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
