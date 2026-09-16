import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db as mongo } from '@/lib/database';
import { uploadFileToS3 } from '@/utils/s3.util';
import { loadJewelryListing } from '@/services/production/listingLookup';

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

        // The file belongs to the DESIGN. It used to be written onto a `products` document,
        // which the storefront no longer reads — so an uploaded GLB never reached the viewer.
        // `viewer.glbUrl` is the field efd-shop's resolveViewer actually looks at.
        const db = await mongo.connect();
        const { design } = await loadJewelryListing(db, id);
        if (!design) {
            return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
        }

        const field = type === 'glb' ? 'viewer.glbUrl' : `files.${type}`;
        await db.collection('designs').updateOne(
            { designID: design.designID },
            { $set: { [field]: fileUrl, updatedAt: new Date() } },
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
