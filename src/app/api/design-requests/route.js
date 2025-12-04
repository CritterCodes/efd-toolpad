import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
    try {
        const session = await auth();
        
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const assignedTo = searchParams.get('assignedTo');

        const { db } = await connectToDatabase();
        
        // Build query filter
        let filter = {};
        if (status) {
            filter.status = status;
        }
        if (assignedTo) {
            filter.assignedTo = assignedTo;
        }

        // Get design requests with populated gemstone data
        const requests = await db.collection('designRequests').aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'products',
                    localField: 'gemstoneId',
                    foreignField: 'productId',
                    as: 'gemstone'
                }
            },
            {
                $unwind: {
                    path: '$gemstone',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'designs',
                    localField: '_id',
                    foreignField: 'requestId',
                    as: 'design'
                }
            },
            {
                $unwind: {
                    path: '$design',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: {
                    priority: 1, // high = 1, medium = 2, low = 3
                    createdAt: -1
                }
            }
        ]).toArray();

        // Add designer names for assigned requests
        const requestsWithDesignerNames = await Promise.all(requests.map(async (request) => {
            if (request.assignedTo) {
                try {
                    const designer = await db.collection('users').findOne(
                        { _id: new ObjectId(request.assignedTo) },
                        { projection: { name: 1, email: 1 } }
                    );
                    if (designer) {
                        request.assignedToName = designer.name || designer.email;
                    }
                } catch (error) {
                    console.error('Error fetching designer name:', error);
                }
            }
            return request;
        }));

        return NextResponse.json({
            success: true,
            requests: requestsWithDesignerNames
        });

    } catch (error) {
        console.error('Error fetching design requests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch design requests' }, 
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const data = await request.json();
        const { 
            gemstoneId, 
            requirements, 
            priority = 'medium',
            dueDate,
            requestedBy 
        } = data;

        if (!gemstoneId) {
            return NextResponse.json(
                { error: 'Gemstone ID is required' }, 
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();

        // Check if request already exists for this gemstone
        const existingRequest = await db.collection('designRequests').findOne({
            gemstoneId,
            status: { $in: ['pending', 'in_progress'] }
        });

        if (existingRequest) {
            return NextResponse.json(
                { error: 'Design request already exists for this gemstone' }, 
                { status: 409 }
            );
        }

        // Create new design request
        const designRequest = {
            gemstoneId,
            status: 'pending',
            requirements: requirements || '',
            priority, // 'high', 'medium', 'low'
            dueDate: dueDate ? new Date(dueDate) : null,
            requestedBy: requestedBy || session.user.id,
            assignedTo: null,
            assignedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('designRequests').insertOne(designRequest);

        // Update the gemstone to mark it as needing design
        await db.collection('products').updateOne(
            { productId: gemstoneId },
            { 
                $set: { 
                    needsCustomDesign: true,
                    designRequestId: result.insertedId,
                    updatedAt: new Date()
                } 
            }
        );

        return NextResponse.json({
            success: true,
            requestId: result.insertedId,
            message: 'Design request created successfully'
        });

    } catch (error) {
        console.error('Error creating design request:', error);
        return NextResponse.json(
            { error: 'Failed to create design request' }, 
            { status: 500 }
        );
    }
}