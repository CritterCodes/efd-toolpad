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

        // Check if request exists and is available
        const designRequest = await db.collection('designRequests').findOne({
            _id: new ObjectId(requestId)
        });

        if (!designRequest) {
            return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
        }

        if (designRequest.status !== 'pending') {
            return NextResponse.json(
                { error: 'Request is not available for claiming' }, 
                { status: 409 }
            );
        }

        // Claim the request
        const result = await db.collection('designRequests').updateOne(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    status: 'in_progress',
                    assignedTo: session.user.id,
                    assignedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Failed to claim request' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Request claimed successfully'
        });

    } catch (error) {
        console.error('Error claiming design request:', error);
        return NextResponse.json(
            { error: 'Failed to claim design request' }, 
            { status: 500 }
        );
    }
}