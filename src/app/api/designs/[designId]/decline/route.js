import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
    try {
        const { designId } = await params;
        console.log('❌ Design Decline API called for design ID:', designId);
        
        const session = await auth();
        if (!session?.user) {
            console.log('❌ No session found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('🔐 User:', session.user.userID, 'Role:', session.user.role, 'Types:', session.user.artisanTypes);

        const body = await request.json();
        const { statusNotes } = body;
        console.log('📝 Status notes:', statusNotes);

        const { db } = await connectToDatabase();

        // Find the gemstone with the design (support both old _id and new id formats)
        let gemstone = await db.collection('products').findOne({
            'designs.id': designId,
            productType: 'gemstone'
        });

        if (!gemstone) {
            // Fall back to old _id format for backwards compatibility
            gemstone = await db.collection('products').findOne({
                'designs._id': new ObjectId(designId),
                productType: 'gemstone'
            });
        }

        if (!gemstone) {
            console.log('❌ Gemstone not found for design:', designId);
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        console.log('✅ Found gemstone:', gemstone.productId);

        const design = gemstone.designs.find(d => d.id === designId || d._id?.toString() === designId);
        
        if (!design) {
            console.log('❌ Design not found in gemstone.designs');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        console.log('✅ Found design:', design.id || design._id, 'Status:', design.status);

        // Find the CAD request that created this design
        const cadRequest = gemstone.cadRequests?.find(r => r.id === design.cadRequestId);
        
        if (!cadRequest) {
            console.log('⚠️ CAD request not found, but continuing anyway');
            // Don't fail - CAD request might not exist in older designs
        } else {
            console.log('✅ Found CAD request:', cadRequest.id);
        }

        // Check permissions: admin, gem cutter, or the user who requested the CAD
        // Designers cannot decline their own work - only reviewers can
        const isAdmin = session.user.role === 'admin';
        const isGemCutter = session.user.artisanTypes?.includes('Gem Cutter');
        
        if (!isAdmin && !isGemCutter) {
            console.log('❌ Access denied - user is not admin or gem cutter');
            return NextResponse.json({ 
                error: 'Access denied. Only admins or gem cutters can decline designs.' 
            }, { status: 403 });
        }

        // Allow decline if status is pending_approval, stl_only, stl_submitted, glb_only, or complete
        const declinableStatuses = ['pending_approval', 'stl_only', 'stl_submitted', 'glb_only', 'complete', 'stl_approved'];
        if (!declinableStatuses.includes(design.status)) {
            console.log('❌ Design not in declinable status:', design.status);
            return NextResponse.json({ 
                error: 'Design is not in a declinable status',
                currentStatus: design.status,
                declinableStatuses 
            }, { status: 400 });
        }

        // Update design status to declined and delete GLB file from S3
        // This allows the designer to re-upload a corrected GLB file
        
        // Delete GLB file from S3 if it exists (since design is being declined)
        if (design.files?.glb?.url) {
            try {
                const { deleteFileFromS3 } = await import('@/lib/s3');
                console.log('📤 Deleting declined GLB from S3:', design.files.glb.url);
                await deleteFileFromS3(design.files.glb.url);
            } catch (s3Error) {
                console.warn('⚠️ S3 deletion warning (continuing with status update):', s3Error.message);
                // Continue with status update even if S3 deletion fails
            }
        }

        // Update design status to declined (support both old _id and new id formats)
        let updateResult;
        if (design.id) {
            console.log('🔄 Updating design with new id format:', designId);
            updateResult = await db.collection('products').updateOne(
                {
                    productId: gemstone.productId,
                    'designs.id': designId
                },
                {
                    $set: {
                        'designs.$.status': 'declined',
                        'designs.$.statusNotes': statusNotes || '',
                        'designs.$.declinedAt': new Date(),
                        'designs.$.declinedBy': session.user.userID,
                        'designs.$.declinedByName': session.user.name,
                        'designs.$.updatedAt': new Date()
                    },
                    $unset: {
                        'designs.$.files.glb': '' // Remove GLB so designer can re-upload
                    }
                }
            );
        } else {
            console.log('🔄 Updating design with old _id format:', designId);
            updateResult = await db.collection('products').updateOne(
                {
                    productId: gemstone.productId,
                    'designs._id': new ObjectId(designId)
                },
                {
                    $set: {
                        'designs.$.status': 'declined',
                        'designs.$.statusNotes': statusNotes || '',
                        'designs.$.declinedAt': new Date(),
                        'designs.$.declinedBy': session.user.userID,
                        'designs.$.declinedByName': session.user.name,
                        'designs.$.updatedAt': new Date()
                    },
                    $unset: {
                        'designs.$.files.glb': '' // Remove GLB so designer can re-upload
                    }
                }
            );
        }

        console.log('📊 Update result:', {
            modifiedCount: updateResult.modifiedCount,
            matchedCount: updateResult.matchedCount,
            upsertedCount: updateResult.upsertedCount
        });

        if (updateResult.modifiedCount === 0) {
            console.log('❌ Update failed - no documents modified. Matched:', updateResult.matchedCount);
            return NextResponse.json({ 
                error: 'Failed to update design status',
                details: `Matched ${updateResult.matchedCount} documents but modified 0`
            }, { status: 500 });
        }

        console.log('✅ Design status updated to declined');

        // Keep CAD request in in_progress status to allow designer to re-upload
        // Since we cleared the GLB file, designer can now replace it
        if (design.cadRequestId) {
            console.log('📋 Updating CAD request:', design.cadRequestId);
            const cadUpdateResult = await db.collection('products').updateOne(
                {
                    productId: gemstone.productId,
                    'cadRequests.id': design.cadRequestId
                },
                {
                    $set: {
                        'cadRequests.$.status': 'in_progress',
                        'cadRequests.$.updatedAt': new Date()
                    },
                    $push: {
                        'cadRequests.$.comments': {
                            _id: new ObjectId(),
                            comment: `Design declined: ${statusNotes || 'Please review and resubmit.'}`,
                            userId: session.user.userID,
                            userName: session.user.name,
                            createdAt: new Date(),
                            type: 'decline'
                        }
                    }
                }
            );
            console.log('📊 CAD update result:', {
                modifiedCount: cadUpdateResult.modifiedCount,
                matchedCount: cadUpdateResult.matchedCount
            });
        }

        console.log('✅ Design declined successfully:', designId);

        return NextResponse.json({
            success: true,
            message: 'Design declined successfully',
            design: {
                _id: designId,
                status: 'declined',
                statusNotes: statusNotes || ''
            }
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Design Decline API error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error.message 
            },
            { status: 500 }
        );
    }
}
