import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
    try {
        console.log('🎨 Design Details API called');
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { designId } = await params;
        console.log('🔍 Looking for design:', designId);

        const { db } = await connectToDatabase();

        // Find gemstone containing this design
        const gemstone = await db.collection('products').findOne({
            productType: 'gemstone',
            'designs._id': new ObjectId(designId)
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the specific design
        const design = gemstone.designs.find(d => d._id.toString() === designId);
        
        if (!design) {
            return NextResponse.json({ error: 'Design not found in gemstone' }, { status: 404 });
        }

        // Check permissions - designer owns design or admin
        const isOwner = design.designerId === session.user.userID;
        const isAdmin = session.user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Include gemstone context
        const designWithContext = {
            ...design,
            gemstone: {
                productId: gemstone.productId,
                title: gemstone.title,
                species: gemstone.gemstone?.species,
                subspecies: gemstone.gemstone?.subspecies,
                carat: gemstone.gemstone?.carat,
                dimensions: gemstone.gemstone?.dimensions,
                images: gemstone.images?.[0]?.url // Primary image
            }
        };

        return NextResponse.json({
            success: true,
            design: designWithContext
        });

    } catch (error) {
        console.error('❌ Design Details API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        console.log('🗑️ Design Delete API called');
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { designId } = await params;
        console.log('🔍 Deleting design:', designId);

        const { db } = await connectToDatabase();

        // Find product (gemstone) containing this design
        const product = await db.collection('products').findOne({
            'designs._id': new ObjectId(designId)
        });

        if (!product) {
            console.log('❌ Design not found in products collection');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the specific design
        const design = product.designs.find(d => d._id.toString() === designId);
        
        if (!design) {
            console.log('❌ Design not found in product designs array');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Check permissions - designer owns design or admin
        const isOwner = design.designerId === session.user.userID;
        const isAdmin = session.user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            console.log('❌ Access denied - not owner or admin');
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        console.log('🔐 Permission check passed for deletion');

        // Delete files from S3 if they exist
        if (design.files) {
            try {
                const { deleteFileFromS3 } = await import('@/lib/s3');
                
                // Delete GLB file
                if (design.files.glb?.url) {
                    console.log('📤 Deleting GLB from S3:', design.files.glb.url);
                    await deleteFileFromS3(design.files.glb.url);
                }
                
                // Delete STL file
                if (design.files.stl?.url) {
                    console.log('📤 Deleting STL from S3:', design.files.stl.url);
                    await deleteFileFromS3(design.files.stl.url);
                }
            } catch (s3Error) {
                console.warn('⚠️ S3 deletion warning (continuing with DB deletion):', s3Error.message);
                // Continue with DB deletion even if S3 fails
            }
        }

        // Remove design from product's designs array
        const result = await db.collection('products').updateOne(
            { _id: product._id },
            { $pull: { designs: { _id: new ObjectId(designId) } } }
        );

        if (result.modifiedCount === 0) {
            console.log('❌ Failed to update product - design not removed');
            return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
        }

        console.log('✅ Design deleted successfully from product');

        return NextResponse.json({
            success: true,
            message: 'Design deleted successfully',
            designId
        });

    } catch (error) {
        console.error('❌ Design Delete API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}