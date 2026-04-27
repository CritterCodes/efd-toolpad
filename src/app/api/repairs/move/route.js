import { db } from "@/lib/database";
import { hasStaffCapability, requireRepairOps, requireRole } from "@/lib/apiAuth";

// server-side route for updating repairs
export const PUT = async (req) => {
    try {
        const body = await req.json();
        const isAdminFlow = body?.actorMode === 'admin';
        const { session, errorResponse } = isAdminFlow
            ? await requireRole(['admin'])
            : await requireRepairOps();
        if (errorResponse) return errorResponse;

        const { repairIDs, status, metadata = {} } = body;

        if (!repairIDs || repairIDs.length === 0 || !status) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }

        const allowedStatuses = [
            "RECEIVING",
            "NEEDS QUOTE",
            "COMMUNICATION REQUIRED",
            "NEEDS PARTS",
            "PARTS ORDERED",
            "READY FOR WORK",
            "READY FOR PICKUP",
            "DELIVERY BATCHED",
            "PAID_CLOSED"
        ];

        if (!allowedStatuses.includes(status)) {
            return new Response(JSON.stringify({ error: "Use the dedicated workflow action for that status transition." }), { status: 400 });
        }

        if (status === 'PARTS ORDERED' && !isAdminFlow && !hasStaffCapability(session, 'parts')) {
            return new Response(JSON.stringify({ error: "Parts capability required." }), { status: 403 });
        }

        const dbRepairs = await db.dbRepairs();

        const result = await dbRepairs.updateMany(
            { repairID: { $in: repairIDs } },
            { $set: { status, ...metadata, updatedAt: new Date() } }
        );

        return new Response(JSON.stringify({ message: 'Repairs updated successfully' }), { status: 200 });
    } catch (error) {
        console.error("Error updating repairs:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};
