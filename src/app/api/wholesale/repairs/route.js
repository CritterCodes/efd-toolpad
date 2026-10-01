import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from "@/lib/auth";
import {
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
// NO CREATE HERE. Stores and the shop both create repairs through POST /api/repairs, where THE pricing
// engine prices the ticket (services/pricing/repairPricing.js). This route used to accept a second,
// different repair shape and store each task's `price` exactly as the browser sent it — a create path
// with no caller in the app, and no check on what it charged (EFD-DEFECTS P12, 2026-09-30).
