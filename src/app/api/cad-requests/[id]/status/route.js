import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PUT(request, { params }) {
    try {
        console.log('📝 CAD Request Status Update API called for ID:', params.id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { status, notes, updatedBy } = body;

        const { db } = await connectToDatabase();

        // Validate the status transition
        const validStatuses = [
            'pending', 'claimed', 'in_progress', 'design_submitted', 
            'under_review', 'approved', 'rejected', 'completed'
        ];

        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Find the current request to validate the transition
        const gemstone = await db.collection('products').findOne({
            'cadRequests._id': new ObjectId(params.id),
            productType: 'gemstone'
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        const cadRequest = gemstone.cadRequests.find(req => req._id.toString() === params.id);
        
        if (!cadRequest) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Check permissions for status changes
        const canUpdateStatus = () => {
            // Designers can update their own requests
            if (cadRequest.designerId === session.user.userID) {
                return ['in_progress', 'design_submitted'].includes(status);
            }
            
            // Admins can update any status
            if (session.user.role === 'admin') {
                return true;
            }
            
            // Gem cutters can approve/reject designs
            if (session.user.artisanTypes?.includes('Gem Cutter')) {
                return ['under_review', 'approved', 'rejected'].includes(status);
            }
            
            return false;
        };

        if (!canUpdateStatus()) {
            return NextResponse.json({ 
                error: 'Insufficient permissions to update this status' 
            }, { status: 403 });
        }

        // Update the request status
        const updateData = {
            'cadRequests.$.status': status,
            'cadRequests.$.updatedAt': new Date(),
            'cadRequests.$.lastUpdatedBy': updatedBy
        };

        // Add specific fields for certain status changes
        if (status === 'under_review') {
            updateData['cadRequests.$.reviewStartedAt'] = new Date();
        } else if (status === 'approved') {
            updateData['cadRequests.$.approvedAt'] = new Date();
            updateData['cadRequests.$.approvedBy'] = updatedBy;
        } else if (status === 'rejected') {
            updateData['cadRequests.$.rejectedAt'] = new Date();
            updateData['cadRequests.$.rejectedBy'] = updatedBy;
        } else if (status === 'completed') {
            updateData['cadRequests.$.completedAt'] = new Date();
        }

        const result = await db.collection('products').updateOne(
            {
                'cadRequests._id': new ObjectId(params.id),
                productType: 'gemstone'
            },
            {
                $set: updateData,
                $push: {
                    'cadRequests.$.statusHistory': {
                        _id: new ObjectId(),
                        status,
                        notes: notes || '',
                        updatedBy,
                        updatedByName: session.user.name,
                        updatedAt: new Date()
                    },
                    'cadRequests.$.comments': {
                        _id: new ObjectId(),
                        comment: notes || `Status updated to ${status}`,
                        userId: updatedBy,
                        userName: session.user.name,
                        createdAt: new Date(),
                        type: 'status_update'
                    }
                }
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to update CAD request status' }, { status: 500 });
        }

        // If approved, we need to make the design available for purchase
        if (status === 'approved') {
            // Find the associated design
            const design = gemstone.designs?.find(d => d.cadRequestId?.toString() === params.id);
            
            if (design) {
                // Update the design status to approved (support both old _id and new id formats)
                const queryFilter = design.id 
                    ? { productId: gemstone.productId, 'designs.id': design.id }
                    : { productId: gemstone.productId, 'designs._id': design._id };
                
                await db.collection('products').updateOne(
                    queryFilter,
                    {
                        $set: {
                            'designs.$.status': 'approved',
                            'designs.$.approvedAt': new Date(),
                            'designs.$.approvedBy': updatedBy,
                            'designs.$.isAvailableForPurchase': true
                        }
                    }
                );

                // Update the standalone design product
                const designProductId = design.id ? `design_${design.id}` : `design_${design._id.toString()}`;
                await db.collection('products').updateOne(
                    {
                        productId: designProductId,
                        productType: 'design'
                    },
                    {
                        $set: {
                            status: 'approved',
                            isAvailableForPurchase: true,
                            approvedAt: new Date(),
                            approvedBy: updatedBy
                        }
                    }
                );
            }
        }

        console.log('✅ CAD request status updated to:', status);

        return NextResponse.json({
            success: true,
            message: 'CAD request status updated successfully'
        });

    } catch (error) {
        console.error('❌ CAD Request Status Update API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}