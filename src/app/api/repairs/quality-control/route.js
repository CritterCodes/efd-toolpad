import { NextResponse } from "next/server";
import { uploadRepairImage } from "@/utils/s3.util"; 
import RepairsController from "../controller";
import { requireRepairOps } from "@/lib/apiAuth";
import { NotificationService } from "@/lib/notificationService";
import { normalizeRepairStatus, QC_COMPLETION_STATUSES } from "@/services/repairWorkflow";

/**
 * POST Route for Quality Control updates including status, notes, checklist, and image uploads
 */
export const POST = async (req) => {
    try {
        const { errorResponse } = await requireRepairOps('qualityControl');
        if (errorResponse) return errorResponse;

        console.log("📩 Incoming Quality Control Update POST request received.");

        // ✅ Check for multipart/form-data
        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Invalid content type. Use multipart/form-data." }, { status: 400 });
        }

        const formData = await req.formData();
        console.log("📤 Parsed Form Data:", [...formData.entries()]);

        // ✅ Extract Form Data
        const repairID = formData.get("repairID");
        const status = formData.get("status");
        const notes = formData.get("notes");
        const checklist = JSON.parse(formData.get("checklist"));
        const imagePath = await uploadRepairImage(formData.get("qcPicture"), repairID); // ✅ Upload image to S3

        // ✅ Prepare the repair data for updating
        const updateData = {
            status, // Update status directly on the repair
            qcData: {
                checklist,
                ...(imagePath && { qcPicture: imagePath }), // Add qcPicture if it exists
            },
            notes,
        };

        // ✅ Update repair in the database using the controller
        const updatedRepair = await RepairsController.updateRepairById(repairID, updateData);
        console.log("✅ Quality Control Update Successful:", updatedRepair);

        // R9 — QC fail/bounce: when the item does NOT land on a completion status, it bounced
        // back for rework. Notify the assignee artisan (best-effort, in-app + push).
        try {
            const canonicalStatus = normalizeRepairStatus(status);
            const isCompletion = QC_COMPLETION_STATUSES.includes(canonicalStatus);
            const assigneeID = updatedRepair?.assignedTo;
            if (!isCompletion && assigneeID) {
                const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "";
                await NotificationService.createNotification({
                    userId: assigneeID,
                    type: "repair-qc-failed",
                    title: "Repair bounced from QC",
                    message: `A repair you worked on did not pass QC${updatedRepair.clientName ? ` (${updatedRepair.clientName})` : ""} and needs rework.`,
                    channels: ["inApp"],
                    priority: "high",
                    data: {
                        actionUrl: `${adminUrl}/dashboard/repairs/${repairID}`,
                        repairID,
                        status: updatedRepair.status || "",
                        clientName: updatedRepair.clientName || "",
                    },
                });
            }
        } catch (notifyError) {
            console.error("R9 repair-qc-failed notification failed (non-fatal):", notifyError.message);
        }

        return NextResponse.json(updatedRepair, { status: 200 });
    } catch (error) {
        console.error("❌ Error in Quality Control Route:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};
