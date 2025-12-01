import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request) {
    try {
        console.log('🎨 CAD Requests for Designers API called');
        
        const session = await auth();
        console.log('🔍 Session data:', session);
        
        if (!session?.user) {
            console.log('❌ No session or user found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is a CAD Designer
        if (!session.user.artisanTypes?.includes('CAD Designer')) {
            console.log('❌ User is not a CAD Designer:', session.user.artisanTypes);
            return NextResponse.json({ error: 'Access denied. CAD Designer role required.' }, { status: 403 });
        }

        console.log('🔗 Connecting to database...');
        const { db } = await connectToDatabase();
        console.log('✅ Database connected');

        const allRequests = [];

        // Get CAD requests from gemstones (if any)
        const gemstonesWithRequests = await db.collection('products').find({
            productType: 'gemstone',
            'cadRequests.0': { $exists: true }
        }).toArray();

        console.log('🔍 Found gemstones with CAD requests:', gemstonesWithRequests.length);

        gemstonesWithRequests.forEach(gemstone => {
            gemstone.cadRequests.forEach(request => {
                allRequests.push({
                    ...request,
                    _id: request.id, // Use custom ID format like "cad_1763264886773_4odnkq"
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
                    }
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

        console.log('📋 Returning all CAD-related requests:', allRequests.length);
        console.log('🔍 Sample request IDs:', allRequests.slice(0, 3).map(r => ({ id: r._id, source: r.source, title: r.title || r.mountingType })));

        return NextResponse.json({
            success: true,
            requests: allRequests,
            total: allRequests.length
        });

    } catch (error) {
        console.error('❌ CAD Requests for Designers API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}