import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { auth } from '../../../../../../auth';

const client = new MongoClient(process.env.MONGODB_URI);

export async function PATCH(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.artisanTypes?.includes('CAD Designer')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { volume, updatedBy } = await request.json();

        if (!volume || volume <= 0) {
            return NextResponse.json({ error: 'Valid volume required' }, { status: 400 });
        }

        await client.connect();
        const db = client.db('jewelry-ecommerce');
        const collection = db.collection('products'); // Use products collection

        // Find the gemstone with this CAD request
        const gemstone = await collection.findOne({
            'cadRequests.id': id
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Find the specific CAD request
        const cadRequest = gemstone.cadRequests.find(req => req.id === id);
        
        if (!cadRequest) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Check if user is assigned to this request
        if (cadRequest.designerId !== session.user.userID) {
            return NextResponse.json({ error: 'Not assigned to this request' }, { status: 403 });
        }

        // Update the volume
        const result = await collection.updateOne(
            { 'cadRequests.id': id },
            { 
                $set: { 
                    'cadRequests.$.estimatedVolume': volume,
                    'cadRequests.$.lastUpdated': new Date().toISOString(),
                    'cadRequests.$.volumeUpdatedBy': updatedBy
                } 
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }

        // Log the volume update
        await collection.updateOne(
            { 'cadRequests.id': id },
            { 
                $push: { 
                    'cadRequests.$.activityLog': {
                        action: 'volume_updated',
                        performedBy: updatedBy,
                        timestamp: new Date().toISOString(),
                        details: {
                            newVolume: volume,
                            previousVolume: cadRequest.estimatedVolume || 'Not set'
                        }
                    }
                } 
            }
        );

        return NextResponse.json({ 
            success: true, 
            volume,
            message: 'Design volume updated successfully' 
        });

    } catch (error) {
        console.error('Volume update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    } finally {
        await client.close();
    }
}