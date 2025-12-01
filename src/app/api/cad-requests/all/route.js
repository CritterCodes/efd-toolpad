import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export async function GET(request) {
    try {
        console.log('📋 All CAD Requests (Admin View) API called');
        
        const session = await auth();
        
        if (!session?.user) {
            console.log('❌ No session or user found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is admin or staff
        const isAdmin = session.user.role === 'admin' || session.user.role === 'staff';
        
        if (!isAdmin) {
            console.log('❌ User is not admin or staff:', session.user.role);
            return NextResponse.json({ error: 'Access denied. Admin or Staff role required.' }, { status: 403 });
        }

        console.log('🔗 Connecting to database...');
        const { db } = await connectToDatabase();
        console.log('✅ Database connected');

        const allRequests = [];

        // Get ALL CAD requests from gemstones (admin view)
        const gemstonesWithRequests = await db.collection('products').find({
            productType: 'gemstone',
            'cadRequests.0': { $exists: true }
        }).toArray();

        console.log('🔍 Found gemstones with CAD requests:', gemstonesWithRequests.length);

        gemstonesWithRequests.forEach(gemstone => {
            gemstone.cadRequests.forEach(request => {
                allRequests.push({
                    ...request,
                    _id: request.id,
                    gemstoneId: gemstone.productId,
                    gemstoneTitle: gemstone.title,
                    source: 'gemstone',
                    // Map the mounting details to expected fields
                    mountingType: request.mountingDetails?.mountingType,
                    metalType: request.mountingDetails?.metalType,
                    styleDescription: request.mountingDetails?.styleDescription,
                    ringSize: request.mountingDetails?.ringSize,
                    timeline: request.mountingDetails?.timeline,
                    specialRequests: request.mountingDetails?.specialRequests,
                    // Designer assignment
                    designerId: request.assignedDesigner?.userId,
                    designerName: request.assignedDesigner?.name,
                    gemstoneData: {
                        species: gemstone.gemstone?.species,
                        subspecies: gemstone.gemstone?.subspecies,
                        carat: gemstone.gemstone?.carat,
                        cut: gemstone.gemstone?.cut,
                        color: gemstone.gemstone?.color,
                        clarity: gemstone.gemstone?.clarity,
                        dimensions: gemstone.gemstone?.dimensions
                    },
                    // Requester info
                    gemCutterId: request.gemCutterId,
                    gemCutterName: request.gemCutterName,
                    gemCutterEmail: request.gemCutterEmail
                });
            });
        });

        // Sort by priority and creation date
        allRequests.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, normal: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        console.log('📋 Returning all CAD requests (admin view):', allRequests.length);

        return NextResponse.json({
            success: true,
            requests: allRequests,
            total: allRequests.length
        });

    } catch (error) {
        console.error('❌ All CAD Requests API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
