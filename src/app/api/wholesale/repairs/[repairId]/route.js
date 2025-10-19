import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { ObjectId } from 'mongodb';

// PUT /api/wholesale/repairs/[repairId] - Update repair
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { repairId } = params;
        const updateData = await request.json();

        const { db } = await connectToDatabase();
        
        // Check if repair exists and user has permission
        const existingRepair = await db.collection('wholesaleRepairs')
            .findOne({ _id: new ObjectId(repairId) });

        if (!existingRepair) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        // Only allow repair owner or admin to update
        if (session.user.role !== 'admin' && existingRepair.wholesalerId !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Update repair
        const result = await db.collection('wholesaleRepairs').updateOne(
            { _id: new ObjectId(repairId) },
            { 
                $set: {
                    ...updateData,
                    updatedAt: new Date().toISOString(),
                    updatedBy: session.user.id
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        // Return updated repair
        const updatedRepair = await db.collection('wholesaleRepairs')
            .findOne({ _id: new ObjectId(repairId) });

        return NextResponse.json({
            success: true,
            ...updatedRepair,
            id: updatedRepair._id.toString(),
            _id: undefined
        });

    } catch (error) {
        console.error('PUT /api/wholesale/repairs/[repairId] error:', error);
        return NextResponse.json(
            { error: 'Failed to update repair' },
            { status: 500 }
        );
    }
}

// DELETE /api/wholesale/repairs/[repairId] - Delete repair
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { repairId } = params;

        const { db } = await connectToDatabase();
        
        // Check if repair exists and user has permission
        const existingRepair = await db.collection('wholesaleRepairs')
            .findOne({ _id: new ObjectId(repairId) });

        if (!existingRepair) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        // Only allow repair owner or admin to delete
        if (session.user.role !== 'admin' && existingRepair.wholesalerId !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete repair
        const result = await db.collection('wholesaleRepairs').deleteOne(
            { _id: new ObjectId(repairId) }
        );

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Repair deleted' });

    } catch (error) {
        console.error('DELETE /api/wholesale/repairs/[repairId] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete repair' },
            { status: 500 }
        );
    }
}