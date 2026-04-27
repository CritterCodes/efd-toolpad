import { NextResponse } from "next/server";
import RepairsController from "../controller";
import { requireRepairsAccess } from "@/lib/apiAuth";

/**
 * GET Route - Fetch a single repair by ID
 */
export const GET = async (req, { params }) => {
    try {
        const { session, errorResponse } = await requireRepairsAccess();
        if (errorResponse) return errorResponse;

        const { repairID } = params;
        console.log("📩 GET repair by ID request received:", repairID);

        if (!repairID) {
            return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
        }

        const repair = await RepairsController.getRepairById(repairID);
        
        if (!repair) {
            return NextResponse.json({ error: "Repair not found." }, { status: 404 });
        }

        console.log("✅ Repair fetched successfully:", repair.repairID);
        return NextResponse.json(repair, { status: 200 });
    } catch (error) {
        console.error("❌ Error in GET repair route:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};

/**
 * PUT Route - Update a repair by ID
 */
export const PUT = async (req, { params }) => {
    try {
        const { session, errorResponse } = await requireRepairsAccess();
        if (errorResponse) return errorResponse;

        const { repairID } = params;
        console.log("📩 PUT repair update request received:", repairID);

        if (!repairID) {
            return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
        }

        const updateData = await req.json();
        console.log("📤 Update data received:", updateData);

        if (!updateData || Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "Update data is required." }, { status: 400 });
        }

        const updatedRepair = await RepairsController.updateRepairById(repairID, updateData);
        
        if (!updatedRepair) {
            return NextResponse.json({ error: "Failed to update repair." }, { status: 500 });
        }

        console.log("✅ Repair updated successfully:", updatedRepair.repairID);
        return NextResponse.json(updatedRepair, { status: 200 });
    } catch (error) {
        console.error("❌ Error in PUT repair route:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};

/**
 * DELETE Route - Delete a repair by ID
 */
export const DELETE = async (req, { params }) => {
    try {
        const { session, errorResponse } = await requireRole(['admin']);
        if (errorResponse) return errorResponse;

        const { repairID } = params;
        console.log("📩 DELETE repair request received:", repairID);

        if (!repairID) {
            return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
        }

        const result = await RepairsController.deleteRepairById(repairID);
        
        console.log("✅ Repair deleted successfully:", repairID);
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("❌ Error in DELETE repair route:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};
