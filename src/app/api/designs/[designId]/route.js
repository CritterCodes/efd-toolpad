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
        console.log('ὐd Looking for design:', designId);

        const { db } = await connectToDatabase();

        // Find gemstone containing this design (support both old _id and new id formats)
        let gemstone = await db.collection('products').findOne({
            productType: 'gemstone',
            'designs.id': designId
        });

        if (!gemstone) {
            // Fall back to old _id format for backwards compatibility
            gemstone = await db.collection('products').findOne({
                productType: 'gemstone',
                'designs._id': new ObjectId(designId)
            });
        }

        if (!gemstone) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the specific design
        const design = gemstone.designs.find(d => d.id === designId || d._id?.toString() === designId);
        
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
        const { searchParams } = new URL(request.url);
        const fileType = searchParams.get('fileType') || 'glb'; // 'glb' or 'stl', default to glb
        
        console.log('🚮 Deleting design:', designId, 'fileType:', fileType);

        const { db } = await connectToDatabase();

        // Find product (gemstone) containing this design (support both old _id and new id formats)
        let product = await db.collection('products').findOne({
            'designs.id': designId
        });

        if (!product) {
            // Fall back to old _id format for backwards compatibility
            product = await db.collection('products').findOne({
                'designs._id': new ObjectId(designId)
            });
        }

        if (!product) {
            console.log('❌ Design not found in products collection');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the specific design
        const design = product.designs.find(d => d.id === designId || d._id?.toString() === designId);
        
        if (!design) {
            console.log('❌ Design not found in product designs array');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Check permissions - designer owns design or admin or assigned designer or Gem Cutter
        const isOwner = design.designerId === session.user.userID;
        const isAssignedDesigner = design.assignedDesignerId === session.user.userID;
        const isAdmin = session.user.role === 'admin';
        const isGemCutter = session.user.artisanTypes?.includes('Gem Cutter');
        
        if (!isOwner && !isAssignedDesigner && !isAdmin && !isGemCutter) {
            console.log('❌ Access denied - not owner, assigned designer, admin, or Gem Cutter');
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        console.log('🔐 Permission check passed for deletion');

        // Determine which files exist
        const hasGlb = !!design.files?.glb;
        const hasStl = !!design.files?.stl;
        
        console.log(`📊 File status before deletion - GLB: ${hasGlb}, STL: ${hasStl}, fileType: ${fileType}`);

        // Delete the specified file from S3
        try {
            const { deleteFileFromS3 } = await import('@/lib/s3');
            
            if (fileType === 'glb' && design.files?.glb?.url) {
                console.log('📤 Deleting GLB from S3:', design.files.glb.url);
                await deleteFileFromS3(design.files.glb.url);
            } else if (fileType === 'stl' && design.files?.stl?.url) {
                console.log('📤 Deleting STL from S3:', design.files.stl.url);
                await deleteFileFromS3(design.files.stl.url);
            }
        } catch (s3Error) {
            console.warn('⚠️ S3 deletion warning (continuing with DB deletion):', s3Error.message);
            // Continue with DB deletion even if S3 fails
        }

        // Determine what to do based on file state
        let updateData = {};
        let shouldDeleteDesign = false;
        
        if (fileType === 'glb') {
            // Deleting GLB file
            if (hasStl) {
                // STL exists, keep design but remove GLB and update status
                updateData['designs.$.files.glb'] = undefined;
                updateData['designs.$.status'] = 'stl_only';
                console.log('🔄 Removing GLB file, keeping design with STL, setting status to stl_only');
            } else {
                // No STL exists, delete entire design
                shouldDeleteDesign = true;
                console.log('🗑️ No STL exists, will delete entire design');
            }
        } else if (fileType === 'stl') {
            // Deleting STL file
            if (hasGlb) {
                // GLB exists, keep design but remove STL and update status
                updateData['designs.$.files.stl'] = undefined;
                updateData['designs.$.status'] = 'glb_only';
                console.log('🔄 Removing STL file, keeping design with GLB, setting status to glb_only');
            } else {
                // No GLB exists, delete entire design
                shouldDeleteDesign = true;
                console.log('🗑️ No GLB exists, will delete entire design');
            }
        }

        // Execute the appropriate operation
        if (shouldDeleteDesign) {
            // Remove entire design from product's designs array
            let result;
            if (design.id) {
                result = await db.collection('products').updateOne(
                    { _id: product._id },
                    { $pull: { designs: { id: designId } } }
                );
            } else {
                result = await db.collection('products').updateOne(
                    { _id: product._id },
                    { $pull: { designs: { _id: new ObjectId(designId) } } }
                );
            }

            if (result.modifiedCount === 0) {
                console.log('❌ Failed to update product - design not removed');
                return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
            }

            console.log('✅ Design deleted successfully from product (no files remaining)');
            return NextResponse.json({
                success: true,
                message: 'Design deleted successfully',
                designId,
                action: 'deleted_entire_design'
            });
        } else {
            // Update design to remove only the specified file
            let result;
            if (design.id) {
                result = await db.collection('products').updateOne(
                    { _id: product._id, 'designs.id': designId },
                    { 
                        $set: updateData
                    }
                );
            } else {
                result = await db.collection('products').updateOne(
                    { _id: product._id, 'designs._id': new ObjectId(designId) },
                    { 
                        $set: updateData
                    }
                );
            }

            if (result.modifiedCount === 0) {
                console.log('❌ Failed to update product - file not removed');
                return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
            }

            console.log('✅ File deleted successfully - design preserved with remaining files');
            return NextResponse.json({
                success: true,
                message: `${fileType.toUpperCase()} file deleted successfully`,
                designId,
                action: 'deleted_single_file',
                newStatus: updateData['designs.$.status'] || 'unchanged'
            });
        }

    } catch (error) {
        console.error('❌ Design Delete API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}