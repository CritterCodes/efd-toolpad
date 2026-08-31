import { NextResponse } from "next/server";
import RepairsController from "../controller";
import { requireRepairsAccess, requireRole, canTouchRepair, isStaffRepairSession } from "@/lib/apiAuth";

export const GET = async (_req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) {
      return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
    }

    const repair = await RepairsController.getRepairById(repairID);
    // Ownership at the sink: a wholesaler only reads their own. 404 so a foreign
    // ID doesn't even confirm the repair exists.
    if (!repair || !canTouchRepair(session, repair)) {
      return NextResponse.json({ error: "Repair not found." }, { status: 404 });
    }

    return NextResponse.json(repair, { status: 200 });
  } catch (error) {
    console.error("Error in GET repair route:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PUT = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) {
      return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
    }

    // Ownership before write — a wholesaler must not edit another business's repair.
    if (!isStaffRepairSession(session)) {
      const existing = await RepairsController.getRepairById(repairID);
      if (!existing || !canTouchRepair(session, existing)) {
        return NextResponse.json({ error: "Repair not found." }, { status: 404 });
      }
    }

    const updateData = await req.json();
    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Update data is required." }, { status: 400 });
    }

    const updatedRepair = await RepairsController.updateRepairById(repairID, updateData);
    if (!updatedRepair) {
      return NextResponse.json({ error: "Failed to update repair." }, { status: 500 });
    }

    return NextResponse.json(updatedRepair, { status: 200 });
  } catch (error) {
    console.error("Error in PUT repair route:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const DELETE = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin']);
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) {
      return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
    }

    const result = await RepairsController.deleteRepairById(repairID);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE repair route:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
