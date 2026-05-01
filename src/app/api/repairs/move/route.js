import { db } from "@/lib/database";
import { hasStaffCapability, requireRepairOps, requireRole } from "@/lib/apiAuth";
import { buildMoveStatusUpdate, MOVE_ALLOWED_STATUSES, normalizeRepairStatus } from "@/services/repairWorkflow";

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
        const normalizedStatus = normalizeRepairStatus(status);

        if (!repairIDs || repairIDs.length === 0 || !normalizedStatus) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }

        if (!MOVE_ALLOWED_STATUSES.includes(normalizedStatus)) {
            return new Response(JSON.stringify({ error: "Use the dedicated workflow action for that status transition." }), { status: 400 });
        }

        if (normalizedStatus === 'PARTS ORDERED' && !isAdminFlow && !hasStaffCapability(session, 'parts')) {
            return new Response(JSON.stringify({ error: "Parts capability required." }), { status: 403 });
        }

        const dbRepairs = await db.dbRepairs();
        const repairs = await dbRepairs.find(
            { repairID: { $in: repairIDs } },
            { projection: { _id: 0, repairID: 1, status: 1, benchStatus: 1, assignedTo: 1 } }
        ).toArray();

        const updatesByRepairID = new Map(
            repairs.map((repair) => [
                repair.repairID,
                buildMoveStatusUpdate(normalizedStatus, metadata, repair),
            ])
        );

        if (updatesByRepairID.size !== repairIDs.length) {
            return new Response(JSON.stringify({ error: "One or more repairs were not found." }), { status: 404 });
        }

        const bulkOps = repairIDs.map((repairID) => ({
            updateOne: {
                filter: { repairID },
                update: { $set: updatesByRepairID.get(repairID) },
            },
        }));

        await dbRepairs.bulkWrite(bulkOps);

        return new Response(JSON.stringify({ message: 'Repairs updated successfully' }), { status: 200 });
    } catch (error) {
        console.error("Error updating repairs:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};
