import { NextResponse } from "next/server";
import { uploadRepairImage } from "@/utils/s3.util";
import RepairsController from "./controller";
import RepairLaborLogsModel from "@/app/api/repairLaborLogs/model";
import { requireRepairsAccess, requireRole } from "@/lib/apiAuth";
import {
  calculateRepairChargeTotal,
  calculateRepairLaborHours,
  getLaborRateSnapshotForUser,
} from "@/app/api/repairLaborLogs/utils";
import { REPAIR_STATUS } from "@/services/repairWorkflow";
import { resolveBillingMode } from "@/services/billing/modes";

async function createWhileYouWaitLaborLog(repair, session) {
  if (!repair?.repairID || repair.whileYouWait !== true || repair.status !== "COMPLETED" || !repair.assignedTo) {
    return null;
  }

  const existingLogs = await RepairLaborLogsModel.findByRepair(repair.repairID);
  if (existingLogs.length > 0) {
    return null;
  }

  const creditedLaborHours = calculateRepairLaborHours(repair);
  const laborRateSnapshot = await getLaborRateSnapshotForUser({
    userID: repair.assignedTo,
    session,
  });
  const laborPaySnapshot = creditedLaborHours * laborRateSnapshot;
  const repairChargeTotal = calculateRepairChargeTotal(repair);
  const requiresAdminReview = (
    laborRateSnapshot <= 0
    || (repairChargeTotal > 0 && creditedLaborHours <= 0)
    || (repairChargeTotal > 0 && laborPaySnapshot > repairChargeTotal)
  );

  const reviewNotes = [];
  if (laborRateSnapshot <= 0) {
    reviewNotes.push("Missing hourly rate snapshot. Confirm pay rate before payout.");
  }
  if (repairChargeTotal > 0 && creditedLaborHours <= 0) {
    reviewNotes.push("Chargeable repair has no labor hours snapshot. Confirm hours before payout.");
  }
  if (repairChargeTotal > 0 && laborPaySnapshot > repairChargeTotal) {
    reviewNotes.push(`Labor pay snapshot ${laborPaySnapshot.toFixed(2)} exceeds current repair total ${repairChargeTotal.toFixed(2)}.`);
  }

  return await RepairLaborLogsModel.create({
    repairID: repair.repairID,
    primaryJewelerUserID: repair.assignedTo,
    primaryJewelerName: repair.assignedJeweler || repair.completedBy || repair.whileYouWaitCompletedBy || repair.assignedTo,
    creditedLaborHours,
    laborRateSnapshot,
    sourceAction: "while_you_wait_complete",
    requiresAdminReview,
    notes: reviewNotes.join(" "),
  });
}

export const POST = async (request) => {
  try {
    const { session, errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const contentType = request.headers.get("content-type");
    let repairData;
    let imageUrl = null;

    if (contentType && contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const picture = formData.get("picture");

      if (picture && picture instanceof File) {
        imageUrl = await uploadRepairImage(picture, formData.get("userID") || "unknown");
      }

      repairData = {
        userID: formData.get("userID"),
        clientName: formData.get("clientName"),
        description: formData.get("description"),
        promiseDate: formData.get("promiseDate"),
        isRush: formData.get("isRush") === "true",
        metalType: formData.get("metalType"),
        karat: formData.get("karat"),
        goldColor: formData.get("goldColor") || "",
        isRing: formData.get("isRing") === "true",
        currentRingSize: formData.get("currentRingSize"),
        desiredRingSize: formData.get("desiredRingSize"),
        notes: formData.get("notes"),
        internalNotes: formData.get("internalNotes"),
        isWholesale: formData.get("isWholesale") === "true",
        totalCost: parseFloat(formData.get("totalCost")) || 0,
        subtotal: parseFloat(formData.get("subtotal")) || 0,
        deliveryFee: parseFloat(formData.get("deliveryFee")) || 0,
        taxAmount: parseFloat(formData.get("taxAmount")) || 0,
        rushFee: parseFloat(formData.get("rushFee")) || 0,
        taxRate: parseFloat(formData.get("taxRate")) || 0,
        includeDelivery: formData.get("includeDelivery") === "true",
        includeTax: formData.get("includeTax") === "true",
        compRepair: formData.get("compRepair") === "true",
        includedWithSale: formData.get("includedWithSale") === "true",
        smartIntakeInput: formData.get("smartIntakeInput") || "",
        businessName: formData.get("businessName") || "",
        storeId: formData.get("storeId") || "",
        storeName: formData.get("storeName") || "",
        assignedTo: formData.get("assignedTo") || "",
        assignedJeweler: formData.get("assignedJeweler") || "",
        partsOrderedBy: formData.get("partsOrderedBy") || "",
        partsOrderedDate: formData.get("partsOrderedDate") || null,
        completedBy: formData.get("completedBy") || "",
        completedAt: formData.get("completedAt") || null,
        qcBy: formData.get("qcBy") || "",
        qcDate: formData.get("qcDate") || null,
        claimedAt: formData.get("claimedAt") || null,
        benchStatus: formData.has("benchStatus") ? formData.get("benchStatus") : undefined,
        whileYouWait: formData.get("whileYouWait") === "true",
        whileYouWaitCompletedBy: formData.get("whileYouWaitCompletedBy") || "",
        whileYouWaitCompletedAt: formData.get("whileYouWaitCompletedAt") || null,
        status: formData.get("status") || REPAIR_STATUS.READY_FOR_WORK,
        picture: imageUrl,
        sourceType: formData.get("sourceType") || "",
        salesInvoiceID: formData.get("salesInvoiceID") || "",
        salesLineID: formData.get("salesLineID") || "",
        productID: formData.get("productID") || "",
        tasks: formData.get("tasks") ? JSON.parse(formData.get("tasks")) : [],
        materials: formData.get("materials") ? JSON.parse(formData.get("materials")) : [],
        customLineItems: formData.get("customLineItems") ? JSON.parse(formData.get("customLineItems")) : [],
        ...(formData.get("metalType") && formData.get("karat") && {
          metalType: `${formData.get("metalType")} - ${formData.get("karat")}`,
        }),
        repairTasks: formData.get("repairTasks") ? JSON.parse(formData.get("repairTasks")) : [],
      };
    } else {
      const jsonData = await request.json();
      const { processes, ...safeJsonData } = jsonData;

      if (safeJsonData.picture && typeof safeJsonData.picture === "object" && safeJsonData.picture.data) {
        const buffer = Buffer.from(safeJsonData.picture.data, "base64");
        const file = new File([buffer], safeJsonData.picture.name || "repair-image.jpg", {
          type: safeJsonData.picture.type || "image/jpeg",
        });
        imageUrl = await uploadRepairImage(file, safeJsonData.userID || "unknown");
      }

      repairData = {
        ...safeJsonData,
        picture: imageUrl || safeJsonData.picture,
        totalCost: parseFloat(safeJsonData.totalCost) || 0,
        subtotal: parseFloat(safeJsonData.subtotal) || 0,
        deliveryFee: parseFloat(safeJsonData.deliveryFee) || 0,
        taxAmount: parseFloat(safeJsonData.taxAmount) || 0,
        rushFee: parseFloat(safeJsonData.rushFee) || 0,
        taxRate: parseFloat(safeJsonData.taxRate) || 0,
        includeDelivery: !!safeJsonData.includeDelivery,
        includeTax: !!safeJsonData.includeTax,
        businessName: safeJsonData.businessName || "",
        assignedJeweler: safeJsonData.assignedJeweler || "",
        partsOrderedBy: safeJsonData.partsOrderedBy || "",
        partsOrderedDate: safeJsonData.partsOrderedDate || null,
        completedBy: safeJsonData.completedBy || "",
        qcBy: safeJsonData.qcBy || "",
        qcDate: safeJsonData.qcDate || null,
        ...(safeJsonData.metalType && safeJsonData.karat && {
          metalType: `${safeJsonData.metalType} - ${safeJsonData.karat}`,
        }),
      };
    }

    repairData.createdBy = session.user.userID || session.user.id;
    repairData.submittedBy = session.user.email;

    if (
      session.user.role === "wholesaler"
      && (!repairData.status || [REPAIR_STATUS.RECEIVING, REPAIR_STATUS.READY_FOR_WORK].includes(repairData.status))
    ) {
      repairData.status = REPAIR_STATUS.PENDING_PICKUP;
    }

    // Canonical billing classification (S1) — derived from comp/wholesale flags.
    repairData.billing = { mode: resolveBillingMode(repairData) };

    const newRepair = await RepairsController.createRepair(repairData);
    await createWhileYouWaitLaborLog(newRepair, session);

    return NextResponse.json(
      {
        message: "Repair created successfully!",
        newRepair,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST Route:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const repairID = searchParams.get("repairID");

    if (repairID) {
      const repair = await RepairsController.getRepairById(repairID);
      return NextResponse.json(repair, { status: 200 });
    }

    return RepairsController.getRepairs(req);
  } catch (error) {
    console.error("Error in GET Route:", error.message);
    return NextResponse.json({ error: "Failed to fetch repairs", details: error.message }, { status: 500 });
  }
};

export const PUT = async (req) => {
  try {
    const { errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const repairID = searchParams.get("repairID");

    if (!repairID) {
      return NextResponse.json({ error: "repairID is required for updating a repair" }, { status: 400 });
    }

    const body = await req.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Request body cannot be empty." }, { status: 400 });
    }

    const updatedRepair = await RepairsController.updateRepairById(repairID, body);
    return NextResponse.json(updatedRepair, { status: 200 });
  } catch (error) {
    console.error("Error in PUT Route:", error.message);
    return NextResponse.json({ error: "Failed to update repair", details: error.message }, { status: 500 });
  }
};

export const DELETE = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const repairID = searchParams.get("repairID");

    if (!repairID) {
      return NextResponse.json({ error: "repairID is required for deleting a repair" }, { status: 400 });
    }

    const result = await RepairsController.deleteRepairById(repairID);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE Route:", error.message);
    return NextResponse.json({ error: "Failed to delete repair", details: error.message }, { status: 500 });
  }
};
