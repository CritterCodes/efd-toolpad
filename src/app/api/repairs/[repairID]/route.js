import { NextResponse } from "next/server";
import RepairsController from "../controller";
import { requireRepairsAccess, requireRole } from "@/lib/apiAuth";

export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) {
      return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
    }

    const repair = await RepairsController.getRepairById(repairID);
    if (!repair) {
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
    const { errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) {
      return NextResponse.json({ error: "Repair ID is required." }, { status: 400 });
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
