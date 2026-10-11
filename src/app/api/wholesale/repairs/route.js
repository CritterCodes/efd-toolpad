import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from "@/lib/auth";
import {
    normalizeRepairStatus,
    normalizeRepairWorkflow,
} from '@/services/repairWorkflow';

/**
 * Every id a store's work can be filed under.
 *
 * A wholesale repair is not always filed against the STORE. The intake flow lets a store's own
 * customer be the subject — `clients` records carrying `parentWholesalerId: <the store>` — and the
 * repair then holds that client's id in `userID`. Marlen Jewelers' first 26 repairs were filed against
 * "Andrew Eilberg", a client of his own shop.
 *
 * Matching only the store's own userID therefore hides the store's work FROM THE STORE. In production
 * that was **220 repairs**: The Smith saw 0 of 162, Greers 1 of 20, Cooper's 2 of 13. A portal that
 * shows a store nothing is a portal nobody uses, which is exactly what the usage data said — 22 of ~389
 * wholesale repairs were ever created by a store itself.
 *
 * Scoped by `parentWholesalerId`, so a store can only ever reach the clients that belong to it. That is
 * the whole authorization boundary here and it must not be loosened to "any client".
 */
export async function ownedIdentities(dbInstance, storeUserID) {
    const clients = await dbInstance.collection('clients')
        .find({ parentWholesalerId: storeUserID }, { projection: { _id: 0, userID: 1, clientID: 1 } })
        .toArray();

    const ids = new Set([storeUserID]);
    for (const client of clients) {
        if (client.userID) ids.add(client.userID);
        if (client.clientID) ids.add(client.clientID);
    }
    return [...ids];
}

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
        // The store whose work we are scoping to: themselves, or the one an admin asked about.
        const scopeTo = session.user.role !== 'admin' ? session.user.userID : wholesalerId;
        if (scopeTo) {
            // Owner (the store OR any client belonging to it) OR the creator. See ownedIdentities.
            query.$or = [
                { userID: { $in: await ownedIdentities(dbInstance, scopeTo) } },
                { createdBy: scopeTo }
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
