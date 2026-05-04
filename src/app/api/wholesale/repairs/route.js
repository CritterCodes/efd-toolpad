import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from "@/lib/auth";
import {
    LEGACY_BENCH_STATUS,
    REPAIR_STATUS,
    normalizeRepairStatus,
    normalizeRepairWorkflow,
} from '@/services/repairWorkflow';

// GET /api/wholesale/repairs - Get repairs for a wholesaler
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const wholesalerId = searchParams.get('wholesaler');

        // Non-admin users can only access their own repairs
        if (session.user.role !== 'admin' && wholesalerId && session.user.userID !== wholesalerId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const dbInstance = await db.connect();
        
        // Query unified repairs collection, filter by wholesaler
        const query = { isWholesale: true };
        if (session.user.role !== 'admin') {
            // Match repairs where wholesaler is the owner (userID) OR the creator (createdBy)
            query.$or = [
                { userID: session.user.userID },
                { createdBy: session.user.userID }
            ];
        } else if (wholesalerId) {
            query.$or = [
                { userID: wholesalerId },
                { createdBy: wholesalerId }
            ];
        }

        // Optional status filter
        const status = searchParams.get('status');
        if (status) {
            const normalizedStatus = normalizeRepairStatus(status);
            if (!normalizedStatus) {
                return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
            }
            query.status = normalizedStatus;
        }
        
        const repairs = await dbInstance.collection('repairs')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ 
            success: true,
            repairs: repairs.map(repair => ({
                ...normalizeRepairWorkflow(repair),
                id: repair._id?.toString() || repair.repairID,
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
        const session = await auth();
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

        const dbInstance = await db.connect();
        
        // Wholesaler submits -> PENDING PICKUP (not yet at shop)
        // Admin creates for wholesale account -> READY FOR WORK (already in hand)
        const initialStatus = session.user.role === 'admin'
            ? REPAIR_STATUS.READY_FOR_WORK
            : REPAIR_STATUS.PENDING_PICKUP;

        const newRepair = {
            ...repairData,
            repairID: `repair-${Date.now().toString(36)}`,
            userID: repairData.wholesalerId || session.user.userID,
            isWholesale: true,
            wholesalerName: repairData.wholesalerName || session.user.name,
            clientName: repairData.customerName,
            smartIntakeInput: repairData.description || '',
            status: initialStatus,
            benchStatus: initialStatus === REPAIR_STATUS.READY_FOR_WORK ? LEGACY_BENCH_STATUS.UNCLAIMED : null,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: session.user.userID,
            submittedBy: session.user.email
        };

        const result = await dbInstance.collection('repairs').insertOne(newRepair);
        
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
