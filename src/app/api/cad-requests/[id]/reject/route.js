import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

/**
 * POST /api/cad-requests/[id]/reject
 * Reject a design and update CAD request status
 * 
 * This endpoint:
 * 1. Updates CAD request status to 'rejected'
 * 2. Stores rejection reason for reference
 * 3. Designer can see rejection reason and resubmit
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        console.log('❌ Rejecting CAD request/design:', id);

        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin can reject
        if (session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can reject designs' }, { status: 403 });
        }

        const body = await request.json();
        const { rejectionReason } = body;

        if (!rejectionReason?.trim()) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

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

        // Update CAD request with rejection
        const updatedCadRequest = {
            ...cadRequest,
            status: 'rejected',
            rejectedAt: new Date(),
            rejectedBy: session.user.userID,
            rejectedByName: session.user.name,
            rejectionReason: rejectionReason.trim()
        };

        // Update gemstone
        const result = await db.collection('products').findOneAndUpdate(
            { productId: gemstone.productId },
            {
                $set: {
                    [`cadRequests.${cadRequestIndex}`]: updatedCadRequest,
                    updatedAt: new Date(),
                    updatedBy: session.user.userID
                }
            },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return NextResponse.json({ error: 'Failed to update CAD request' }, { status: 500 });
        }

        console.log('✅ CAD request rejected');

        return NextResponse.json({
            success: true,
            message: 'Design rejected',
            cadRequest: updatedCadRequest,
            note: 'Designer can see the rejection reason and resubmit a new design'
        });

    } catch (error) {
        console.error('❌ Error rejecting CAD request:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reject design' },
            { status: 500 }
        );
    }
}
