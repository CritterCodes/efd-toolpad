import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

/**
 * GET /api/cad-requests/[id]
 * Fetch a specific CAD request by ID
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        console.log('🎯 CAD Request Detail API called for ID:', id);

        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();

        // Find the gemstone with the CAD request using custom ID
        console.log('🔍 Looking for gemstone with CAD request ID:', id);
        const gemstone = await db.collection('products').findOne({
            'cadRequests.id': id  // Use custom ID field, not _id
        });

        if (!gemstone) {
            console.log('❌ Gemstone not found for CAD request ID:', id);
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        console.log('✅ Found gemstone:', gemstone.productId);

        // Find the specific CAD request
        const cadRequest = gemstone.cadRequests.find(req => req.id === id);

        if (!cadRequest) {
            console.log('❌ CAD request not found in gemstone. Available requests:',
                gemstone.cadRequests.map(r => r.id));
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Add any related designs
        const relatedDesigns = gemstone.designs?.filter(design => 
            design.cadRequestId === id
        ) || [];

        const requestWithDesigns = {
            ...cadRequest,
            designs: relatedDesigns
        };

        console.log('✅ CAD request found:', requestWithDesigns.id);

        return NextResponse.json({
            request: requestWithDesigns,
            gemstone: {
                productId: gemstone.productId,
                title: gemstone.title,
                gemstone: gemstone.gemstone,
                pricing: gemstone.pricing,
                obj3DFile: gemstone.obj3DFile  // Include existing 3D file info
            }
        });

    } catch (error) {
        console.error('❌ CAD Request Detail API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/cad-requests/[id]
 * Update a CAD request (edit mounting details, designer assignment, etc.)
 */
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        console.log('🔄 CAD Request Update API called for ID:', id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { gemstoneId, status, notes, updatedBy, ...updateData } = body;

        const { db } = await connectToDatabase();

        // Build update object
        const updateFields = {
            'cadRequests.$.updatedAt': new Date(),
            'cadRequests.$.lastUpdatedBy': updatedBy || session.user.email
        };

        if (status) {
            updateFields['cadRequests.$.status'] = status;
        }

        if (updateData.mountingType !== undefined) {
            updateFields['cadRequests.$.mountingDetails.mountingType'] = updateData.mountingType;
        }
        if (updateData.styleDescription !== undefined) {
            updateFields['cadRequests.$.mountingDetails.styleDescription'] = updateData.styleDescription;
        }
        if (updateData.ringSize !== undefined) {
            updateFields['cadRequests.$.mountingDetails.ringSize'] = updateData.ringSize;
        }
        if (updateData.specialRequests !== undefined) {
            updateFields['cadRequests.$.mountingDetails.specialRequests'] = updateData.specialRequests;
        }
        if (updateData.assignedDesigner !== undefined) {
            updateFields['cadRequests.$.assignedDesigner'] = updateData.assignedDesigner;
        }
        if (updateData.priority !== undefined) {
            updateFields['cadRequests.$.priority'] = updateData.priority;
        }

        // Update using custom ID
        const result = await db.collection('products').updateOne(
            {
                'cadRequests.id': id
            },
            {
                $set: updateFields,
                ...(notes && {
                    $push: {
                        'cadRequests.$.statusHistory': {
                            status: status || 'updated',
                            notes,
                            updatedBy: updatedBy || session.user.email,
                            updatedAt: new Date()
                        }
                    }
                })
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        console.log('✅ CAD request updated:', id);

        return NextResponse.json({
            success: true,
            message: 'CAD request updated successfully'
        });

    } catch (error) {
        console.error('❌ CAD Request Update API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/cad-requests/[id]
 * Delete a CAD request
 */
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        console.log('🗑️ CAD Request DELETE API called for ID:', id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const gemstoneId = searchParams.get('gemstoneId');

        const { db } = await connectToDatabase();

        // Find and delete the CAD request
        const result = await db.collection('products').updateOne(
            { 
                'cadRequests.id': id
            },
            { 
                $pull: { cadRequests: { id } },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'CAD request not found' },
                { status: 404 }
            );
        }

        console.log('✅ CAD request deleted:', id);

        return NextResponse.json({
            success: true,
            message: 'CAD request deleted successfully'
        });

    } catch (error) {
        console.error('❌ CAD Request DELETE API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/cad-requests/[id]
 * Update specific status or perform actions on a CAD request
 * Used for: status changes, assignments, etc.
 */
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        console.log('⚙️ CAD Request PATCH API called for ID:', id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...updateData } = body;

        const { db } = await connectToDatabase();

        // Build update object based on action
        const updateFields = {
            'cadRequests.$.updatedAt': new Date(),
            'cadRequests.$.lastUpdatedBy': session.user.email
        };

        if (action === 'status' && updateData.status) {
            updateFields['cadRequests.$.status'] = updateData.status;
        } else if (action === 'assign' && updateData.assignedDesigner) {
            updateFields['cadRequests.$.assignedDesigner'] = updateData.assignedDesigner;
        } else if (action === 'priority' && updateData.priority) {
            updateFields['cadRequests.$.priority'] = updateData.priority;
        } else {
            // Default: update any provided fields
            if (updateData.status !== undefined) {
                updateFields['cadRequests.$.status'] = updateData.status;
            }
            if (updateData.assignedDesigner !== undefined) {
                updateFields['cadRequests.$.assignedDesigner'] = updateData.assignedDesigner;
            }
            if (updateData.priority !== undefined) {
                updateFields['cadRequests.$.priority'] = updateData.priority;
            }
        }

        // Update the CAD request
        const result = await db.collection('products').updateOne(
            { 
                'cadRequests.id': id
            },
            { 
                $set: updateFields,
                ...(updateData.notes && {
                    $push: {
                        'cadRequests.$.statusHistory': {
                            status: updateData.status || action,
                            notes: updateData.notes,
                            updatedBy: session.user.email,
                            updatedAt: new Date()
                        }
                    }
                })
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'CAD request not found' },
                { status: 404 }
            );
        }

        console.log('✅ CAD request patched:', id);

        return NextResponse.json({
            success: true,
            message: 'CAD request updated successfully'
        });

    } catch (error) {
        console.error('❌ CAD Request PATCH API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}