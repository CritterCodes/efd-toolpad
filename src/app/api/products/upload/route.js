import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFileToS3 } from '../../../../utils/s3.util';
import { db as mongo } from '@/lib/database';
import { loadJewelryListing, loadGemListing } from '@/services/production/listingLookup';
import { canAccessListing, listingEditorRefusal, LISTING_STAFF_ROLES } from '@/services/production/jewelryListingAccess';

export async function POST(request) {
    try {
        const session = await auth();
        
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

        // Staff, or the jeweler who owns the listing's design — being signed in isn't enough to add images to
        // somebody else's listing. A listing with no design behind it is staff-only.
        const db = await mongo.connect();
        const lookup = productType === 'gemstone' ? loadGemListing : loadJewelryListing;
        const { design } = await lookup(db, productId).catch(() => ({ design: null }));
        const allowed = design ? canAccessListing(session, design) : LISTING_STAFF_ROLES.has(session.user?.role);
        if (!allowed) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        // The jeweler check is the jewelry editor's; a gem listing's owner (a cutter) isn't a jeweler.
        const refusal = productType === 'gemstone' ? null : await listingEditorRefusal(db, session);
        if (refusal) return NextResponse.json({ error: refusal }, { status: 403 });

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

        try {
            // Images belong to the DESIGN (`media.images`), which is what the editor and efd-shop read. They
            // used to be pushed onto a `products` document nothing reads any more, so an uploaded photo showed
            // up in neither place (2026-10-01). A listing with no design keeps the legacy write (staff only).
            if (design) {
                await db.collection('designs').updateOne(
                    { designID: design.designID },
                    {
                        // Same shape as the images already there ({ url, uploadedBy, … }).
                        $push: { 'media.images': { $each: successfulUploads.map((url) => ({ url, uploadedBy: session.user?.userID || 'admin', uploadedAt: new Date() })) } },
                        $set: { updatedAt: new Date() },
                    }
                );
            } else {
                await db.collection('products').updateOne(
                    { productId },
                    {
                        $push: { images: { $each: successfulUploads } },
                        $set: { updatedAt: new Date() },
                    }
                );
            }
        } catch (dbError) {
            console.error('Uploaded images but failed to attach them to product:', dbError);
            return NextResponse.json({
                error: 'Images uploaded but failed to save them to the product',
                uploadedImages: successfulUploads,
            }, { status: 500 });
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
