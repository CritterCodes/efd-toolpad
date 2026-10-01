import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import RepairsModel from '@/app/api/repairs/model';

/**
 * PUT / DELETE /api/wholesale/repairs/[repairId] — ADMIN ONLY (2026-10-01).
 *
 * Until 2026-10-01 any signed-in owner of a repair (a store) could $set ANY field on it — status, prices, even
 * userID — and delete it at any stage, mid-work included; both wrote the collection directly, so the work order
 * (My Bench) went stale or was orphaned. Nothing in efd-admin or efd-shop calls this route (checked that day), so
 * it is locked to admins and routed through RepairsModel, which syncs the work order on update and cleans up the
 * work order, labor logs and payroll counts on delete. Retiring the route is an owner question
 * (docs/OPEN-QUESTIONS.md).
 */
export async function PUT(request, { params }) {
    try {
        const { session, errorResponse } = await requireRole(['admin']);
        if (errorResponse) return errorResponse;

        const { repairId } = await params;
        const { _id: _ignored, repairID: _alsoIgnored, ...updateData } = await request.json();
        const updatedRepair = await RepairsModel.updateById(repairId, {
            ...updateData,
            updatedAt: new Date(),
            updatedBy: session.user.userID,
        });
        return NextResponse.json({ success: true, ...updatedRepair });
    } catch (error) {
        const notFound = /not found/i.test(error.message || '');
        console.error('PUT /api/wholesale/repairs/[repairId] error:', error);
        return NextResponse.json({ error: notFound ? 'Repair not found' : 'Failed to update repair' }, { status: notFound ? 404 : 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { errorResponse } = await requireRole(['admin']);
        if (errorResponse) return errorResponse;

        const { repairId } = await params;
        await RepairsModel.findById(repairId); // throws 'Repair not found.'
        await RepairsModel.deleteById(repairId);
        return NextResponse.json({ success: true, message: 'Repair deleted' });
    } catch (error) {
        const notFound = /not found/i.test(error.message || '');
        console.error('DELETE /api/wholesale/repairs/[repairId] error:', error);
        return NextResponse.json({ error: notFound ? 'Repair not found' : 'Failed to delete repair' }, { status: notFound ? 404 : 500 });
    }
}
