import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// GET /api/wholesale/repairs - Get repairs for a wholesaler
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const wholesalerId = searchParams.get('wholesaler');

        // Ensure user can only access their own repairs (unless admin)
        if (session.user.role !== 'admin' && session.user.id !== wholesalerId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { db } = await connectToDatabase();
        
        const repairs = await db.collection('wholesaleRepairs')
            .find({ wholesalerId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ 
            success: true,
            repairs: repairs.map(repair => ({
                ...repair,
                id: repair._id.toString(),
                _id: undefined
            }))
        });

    } catch (error) {
        console.error('GET /api/wholesale/repairs error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch repairs' },
            { status: 500 }
        );
    }
}

// POST /api/wholesale/repairs - Create new repair
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Only wholesalers and admins can create repairs
        if (!['wholesaler', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const repairData = await request.json();
        
        // Validate required fields
        const requiredFields = ['customerName', 'customerPhone', 'itemType', 'repairType', 'description'];
        for (const field of requiredFields) {
            if (!repairData[field]?.trim()) {
                return NextResponse.json(
                    { error: `${field} is required` },
                    { status: 400 }
                );
            }
        }

        const { db } = await connectToDatabase();
        
        const newRepair = {
            ...repairData,
            wholesalerId: repairData.wholesalerId || session.user.id,
            wholesalerName: repairData.wholesalerName || session.user.name,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: session.user.id
        };

        const result = await db.collection('wholesaleRepairs').insertOne(newRepair);
        
        return NextResponse.json({
            success: true,
            ...newRepair,
            id: result.insertedId.toString(),
            _id: undefined
        });

    } catch (error) {
        console.error('POST /api/wholesale/repairs error:', error);
        return NextResponse.json(
            { error: 'Failed to create repair' },
            { status: 500 }
        );
    }
}