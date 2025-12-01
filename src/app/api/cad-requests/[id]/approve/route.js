import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

/**
 * POST /api/cad-requests/[id]/approve
 * Approve a GLB design and add it to the gemstone's available designs
 * 
 * This endpoint:
 * 1. Updates CAD request status to 'approved'
 * 2. Adds the design to the gemstone's designs array
 * 3. Makes design available for purchase with metal/mounting options
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        console.log('✅ Approving CAD request/design:', id);

        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin can approve
        if (session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can approve designs' }, { status: 403 });
        }

        const body = await request.json();
        const { approvalNotes } = body;

        const { db } = await connectToDatabase();

        // Find the gemstone with this CAD request
        const gemstone = await db.collection('products').findOne({
            'cadRequests.id': id
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        console.log('✅ Found gemstone:', gemstone.productId);

        // Find the specific CAD request
        const cadRequestIndex = gemstone.cadRequests.findIndex(req => req.id === id);
        if (cadRequestIndex === -1) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        const cadRequest = gemstone.cadRequests[cadRequestIndex];

        // Find approved GLB design
        const approvedDesign = gemstone.designs?.find(d => 
            d.cadRequestId === id && d.files?.glb && d.status === 'approved'
        );

        if (!approvedDesign) {
            return NextResponse.json({ 
                error: 'No approved GLB design found for this CAD request' 
            }, { status: 400 });
        }

        console.log('✅ Found approved design:', approvedDesign.title);

        // Update CAD request status
        const updatedCadRequest = {
            ...cadRequest,
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: session.user.userID,
            approvedByName: session.user.name,
            approvalNotes: approvalNotes || null
        };

        // Prepare design for gemstone's available designs
        // This makes it available for purchase with metal/mounting options
        const designForGemstone = {
            id: approvedDesign._id?.toString() || approvedDesign.id || `design_${Date.now()}`,
            title: approvedDesign.title,
            cadRequestId: id,
            description: approvedDesign.description || '',
            files: {
                stl: approvedDesign.files?.stl || null,
                glb: approvedDesign.files?.glb || null
            },
            meshStats: approvedDesign.meshStats || null,
            printVolume: approvedDesign.printVolume || 0,
            // Metal/mounting options - to be configured
            metals: [],
            mountingOptions: [],
            // Pricing - base pricing, metal costs added per option
            basePrice: 0,
            status: 'available',
            approvedAt: new Date(),
            createdAt: new Date()
        };

        // Update gemstone:
        // 1. Update CAD request status
        // 2. Add design to available designs
        const result = await db.collection('products').findOneAndUpdate(
            { productId: gemstone.productId },
            {
                $set: {
                    [`cadRequests.${cadRequestIndex}`]: updatedCadRequest,
                    updatedAt: new Date(),
                    updatedBy: session.user.userID
                },
                $push: {
                    designs: designForGemstone
                }
            },
            { returnDocument: 'after' }
        );

        console.log('✅ CAD request approved and design added to gemstone');

        return NextResponse.json({
            success: true,
            message: 'Design approved and added to gemstone',
            design: designForGemstone,
            cadRequest: updatedCadRequest
        });

    } catch (error) {
        console.error('❌ Error approving CAD request:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to approve design' },
            { status: 500 }
        );
    }
}
