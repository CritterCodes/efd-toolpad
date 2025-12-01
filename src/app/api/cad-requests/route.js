import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request) {
    try {
        console.log('🔧 CAD requests GET API called');
        
        const session = await auth();
        console.log('🔍 Session data:', session);
        
        if (!session?.user) {
            console.log('❌ No session or user found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const gemstoneId = searchParams.get('gemstoneId');
        
        console.log('🔧 CAD requests API called for gemstone:', gemstoneId);
        console.log('👤 User info:', { userID: session.user.userID, email: session.user.email });
        
        if (!gemstoneId) {
            return NextResponse.json(
                { error: 'Gemstone ID is required' },
                { status: 400 }
            );
        }
        
        console.log('🔗 Connecting to database...');
        const { db } = await connectToDatabase();
        console.log('✅ Database connected');
        
        // Find the gemstone and get its CAD requests
        const query = { 
            productId: gemstoneId,
            productType: 'gemstone',
            $or: [
                { userId: session.user.userID },
                { userId: session.user.email }
            ]
        };
        
        console.log('🔍 Searching for gemstone with query:', query);
        const gemstone = await db.collection('products').findOne(query);

        if (!gemstone) {
            return NextResponse.json(
                { error: 'Gemstone not found' },
                { status: 404 }
            );
        }
        
        // Get CAD requests from the gemstone object (default to empty array if none exist)
        const cadRequests = gemstone.cadRequests || [];
        
        console.log('📝 Found CAD requests in gemstone:', cadRequests.length);
        
        return NextResponse.json({
            success: true,
            cadRequests,
            total: cadRequests.length
        });
        
    } catch (error) {
        console.error('❌ Error in CAD requests API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch CAD requests' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        console.log('🔧 CAD requests POST API called');
        
        const session = await auth();
        console.log('🔍 POST Session data:', session);
        
        if (!session?.user) {
            console.log('❌ POST: No session or user found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { gemstoneId, ...requestData } = body;
        
        console.log('🔧 Creating new CAD request for gemstone:', gemstoneId);
        console.log('📝 Request data:', requestData);
        console.log('👤 POST User info:', { userID: session.user.userID, email: session.user.email });
        
        if (!gemstoneId) {
            return NextResponse.json(
                { error: 'Gemstone ID is required' },
                { status: 400 }
            );
        }
        
        console.log('🔗 POST: Connecting to database...');
        const { db } = await connectToDatabase();
        console.log('✅ POST: Database connected');
        
        // Find the gemstone first
        const postQuery = { 
            productId: gemstoneId,
            productType: 'gemstone',
            $or: [
                { userId: session.user.userID },
                { userId: session.user.email }
            ]
        };
        
        console.log('🔍 POST: Searching for gemstone with query:', postQuery);
        const gemstone = await db.collection('products').findOne(postQuery);
        console.log('💎 POST: Gemstone found:', gemstone ? 'YES' : 'NO');

        if (!gemstone) {
            console.log('❌ POST: Gemstone not found');
            return NextResponse.json(
                { error: 'Gemstone not found' },
                { status: 404 }
            );
        }
        
        // Create the new CAD request
        const newCadRequest = {
            id: `cad_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            mountingDetails: {
                mountingType: requestData.mountingType,
                metalType: requestData.metalType,
                styleDescription: requestData.styleDescription,
                ringSize: requestData.ringSize,
                timeline: requestData.timeline,
                specialRequests: requestData.specialRequests
            },
            assignedDesigner: requestData.assignedDesigner || null,
            status: 'pending',
            priority: requestData.priority || 'medium',
            attachedImages: requestData.attachedImages || [],
            requestedBy: {
                userId: session.user.userID || session.user.email,
                email: session.user.email,
                name: session.user.name
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Add the CAD request to the gemstone's cadRequests array
        console.log('💾 POST: Updating gemstone with new CAD request');
        const result = await db.collection('products').updateOne(
            { productId: gemstoneId },
            { 
                $push: { cadRequests: newCadRequest },
                $set: { updatedAt: new Date() }
            }
        );
        
        console.log('📊 POST: Update result:', { 
            matchedCount: result.matchedCount, 
            modifiedCount: result.modifiedCount 
        });
        
        if (result.matchedCount === 0) {
            console.log('❌ POST: No gemstone matched for update');
            return NextResponse.json(
                { error: 'Failed to update gemstone with CAD request' },
                { status: 500 }
            );
        }
        
        console.log('✅ Added CAD request to gemstone:', gemstoneId);
        
        return NextResponse.json({
            success: true,
            cadRequest: newCadRequest,
            message: 'CAD request created successfully'
        });
        
    } catch (error) {
        console.error('❌ Error creating CAD request:', error);
        return NextResponse.json(
            { error: 'Failed to create CAD request' },
            { status: 500 }
        );
    }
}