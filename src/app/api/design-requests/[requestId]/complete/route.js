import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/database';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
    try {
        const session = await auth();
        
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { requestId } = params;

        if (!ObjectId.isValid(requestId)) {
            return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Check if request exists and is assigned to current user
        const designRequest = await db.collection('designRequests').findOne({
            _id: new ObjectId(requestId)
        });

        if (!designRequest) {
            return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
        }

        if (designRequest.assignedTo !== session.user.id) {
            return NextResponse.json(
                { error: 'You are not assigned to this request' }, 
                { status: 403 }
            );
        }

        if (designRequest.status !== 'in_progress') {
            return NextResponse.json(
                { error: 'Request is not in progress' }, 
                { status: 409 }
            );
        }

        // Mark request as completed
        const result = await db.collection('designRequests').updateOne(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Failed to complete request' }, { status: 500 });
        }

        // Update the gemstone to mark design as completed
        await db.collection('products').updateOne(
            { productId: designRequest.gemstoneId },
            { 
                $set: { 
                    needsCustomDesign: false,
                    hasCustomDesign: true,
                    updatedAt: new Date()
                } 
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Request completed successfully'
        });

    } catch (error) {
        console.error('Error completing design request:', error);
        return NextResponse.json(
            { error: 'Failed to complete design request' }, 
            { status: 500 }
        );
    }
}