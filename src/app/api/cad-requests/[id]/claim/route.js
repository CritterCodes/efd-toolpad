import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { NotificationService, NOTIFICATION_TYPES, CHANNELS } from '@/lib/notificationService';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        console.log('🤝 CAD Request Claim API called for ID:', id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is a CAD Designer
        if (!session.user.artisanTypes?.includes('CAD Designer')) {
            return NextResponse.json({ error: 'Access denied. CAD Designer role required.' }, { status: 403 });
        }

        const body = await request.json();
        const { designerId, designerName, designerEmail } = body;

        const { db } = await connectToDatabase();

        // Find the gemstone with this CAD request
        console.log('🔍 Looking for gemstone with CAD request ID:', id);
        const gemstone = await db.collection('products').findOne({
            'cadRequests.id': id
        });

        if (!gemstone) {
            console.log('❌ No gemstone found with CAD request ID:', id);
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Find the specific CAD request
        const cadRequest = gemstone.cadRequests.find(req => req.id === id);
        
        if (!cadRequest) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        if (cadRequest.status !== 'pending') {
            return NextResponse.json({ 
                error: 'CAD request is no longer available for claiming',
                status: cadRequest.status 
            }, { status: 400 });
        }

        // Claim the request
        const result = await db.collection('products').updateOne(
            { 'cadRequests.id': id },
            { 
                $set: { 
                    'cadRequests.$.status': 'in_progress',
                    'cadRequests.$.assignedDesigner': designerName,
                    'cadRequests.$.designerId': designerId,
                    'cadRequests.$.designerEmail': designerEmail,
                    'cadRequests.$.claimedAt': new Date(),
                    'cadRequests.$.updatedAt': new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Failed to claim request' }, { status: 500 });
        }

        // Log the claim action
        await db.collection('products').updateOne(
            { 'cadRequests.id': id },
            { 
                $push: { 
                    'cadRequests.$.statusHistory': {
                        status: 'in_progress',
                        action: 'claimed',
                        performedBy: designerName,
                        timestamp: new Date(),
                        details: {
                            designerId,
                            designerEmail
                        }
                    }
                } 
            }
        );

        console.log('✅ CAD request claimed successfully by:', designerName);
        
        // Send notifications
        try {
            // 1. Notify all admins about the claim
            const adminUsers = await db.collection('users').find({ role: 'admin' }).toArray();
            
            for (const admin of adminUsers) {
                await NotificationService.createNotification({
                    userId: admin.userID,
                    type: NOTIFICATION_TYPES.CAD_CLAIMED,
                    title: 'CAD Request Claimed',
                    message: `${designerName} has claimed CAD request ${id}`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    templateName: 'cad_claimed',
                    data: {
                        requestId: id,
                        designerName,
                        gemName: gemstone.name
                    },
                    recipientEmail: admin.email
                });
            }
            
            // 2. Notify the Gem Cutter who created the request
            if (cadRequest.requestedBy?.email) {
                await NotificationService.createNotification({
                    userId: cadRequest.requestedBy?.userId,
                    type: NOTIFICATION_TYPES.CAD_CLAIMED,
                    title: 'Your CAD Request Has Been Claimed',
                    message: `${designerName} has claimed your CAD design request for ${gemstone.name}. Work is now in progress.`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    templateName: 'cad_claimed',
                    data: {
                        requestId: id,
                        designerName,
                        gemName: gemstone.name
                    },
                    recipientEmail: cadRequest.requestedBy.email
                });
            }
        } catch (notificationError) {
            console.error('⚠️ Failed to send notifications:', notificationError);
            // Don't fail the whole request if notifications fail
        }
        
        return NextResponse.json({ 
            success: true,
            message: `CAD request claimed by ${designerName}`,
            status: 'in_progress'
        });

    } catch (error) {
        console.error('❌ CAD Request Claim API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
