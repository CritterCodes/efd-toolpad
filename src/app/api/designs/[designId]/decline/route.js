import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
    try {
        console.log('❌ Design Decline API called for design ID:', params.designId);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { statusNotes } = body;
        const designId = params.designId;

        const { db } = await connectToDatabase();

        // Find the gemstone with the design and CAD request
        const gemstone = await db.collection('products').findOne({
            'designs._id': new ObjectId(designId),
            productType: 'gemstone'
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        const design = gemstone.designs.find(d => d._id.toString() === designId);
        
        if (!design) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the CAD request that created this design
        const cadRequest = gemstone.cadRequests?.find(r => r.id === design.cadRequestId);
        
        if (!cadRequest) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Check permissions: admin, gem cutter who requested CAD, or original designer
        const isAdmin = session.user.role === 'admin';
        const isGemCutter = session.user.artisanTypes?.includes('Gem Cutter') && cadRequest.gemCutterId === session.user.userID;
        const isDesigner = design.designerId === session.user.userID;
        
        if (!isAdmin && !isGemCutter && !isDesigner) {
            return NextResponse.json({ 
                error: 'Access denied. Only admins, the requesting gem cutter, or the designer can decline.' 
            }, { status: 403 });
        }

        if (design.status !== 'pending_approval') {
            return NextResponse.json({ 
                error: 'Design is not in pending approval status',
                currentStatus: design.status 
            }, { status: 400 });
        }

        // Update design status to declined
        const updateResult = await db.collection('products').updateOne(
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
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return NextResponse.json({ 
                error: 'Failed to update design status' 
            }, { status: 500 });
        }

        // Keep CAD request in appropriate status for re-submission
        // STL decline → keep in_progress (designer can re-submit STL)
        // GLB decline → keep in_progress (designer can re-submit GLB)
        const keepInProgress = design.files?.stl || design.files?.glb;
        if (keepInProgress && design.cadRequestId) {
            await db.collection('products').updateOne(
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
