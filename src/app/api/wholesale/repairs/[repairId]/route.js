import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from "@/lib/auth";

// PUT /api/wholesale/repairs/[repairId] - Update repair
export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { repairId } = params;
        const updateData = await request.json();

        const dbInstance = await db.connect();
        
        // Check if repair exists and user has permission
        const existingRepair = await dbInstance.collection('repairs')
            .findOne({ repairID: repairId });

        if (!existingRepair) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        // Only allow repair owner or admin to update
        if (session.user.role !== 'admin' && existingRepair.userID !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Update repair
        const result = await dbInstance.collection('repairs').updateOne(
            { repairID: repairId },
            { 
                $set: {
                    ...updateData,
                    updatedAt: new Date(),
                    updatedBy: session.user.id
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        // Return updated repair
        const updatedRepair = await dbInstance.collection('repairs')
            .findOne({ repairID: repairId }, { projection: { _id: 0 } });

        return NextResponse.json({
            success: true,
            ...updatedRepair
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { repairId } = params;

        const dbInstance = await db.connect();
        
        // Check if repair exists and user has permission
        const existingRepair = await dbInstance.collection('repairs')
            .findOne({ repairID: repairId });

        if (!existingRepair) {
            return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
        }

        // Only allow repair owner or admin to delete
        if (session.user.role !== 'admin' && existingRepair.userID !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete repair
        const result = await dbInstance.collection('repairs').deleteOne(
            { repairID: repairId }
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