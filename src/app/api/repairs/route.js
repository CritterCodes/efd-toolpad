// app/api/repairs/route.js
import { NextResponse } from "next/server";
import { uploadFileToS3 } from "@/utils/s3.util"; 
import RepairsController from "./controller";

export const POST = async (request) => {
    try {
        console.log("📩 Incoming POST request received.");
        const formData = await request.formData();
        const picture = formData.get("picture");

        // Ensure a picture is provided
        if (!picture || !(picture instanceof File)) {
            return NextResponse.json({ error: "No valid image provided." }, { status: 400 });
        }

        // Upload image to S3 and get the URL
        const imageUrl = await uploadFileToS3(picture);

        // Prepare the repair data
        const repairData = {
            userID: formData.get("userID"),
            clientName: formData.get("clientName"),
            description: formData.get("description"),
            promiseDate: formData.get("promiseDate"),
            metalType: formData.get("metalType"),
            repairTasks: JSON.parse(formData.get("repairTasks")),
            cost: parseFloat(formData.get("cost")) || 0,
            picture: imageUrl  // Save the S3 URL directly
        };

        console.log("✅ Final Repair Data:", repairData);

        const newRepair = await RepairsController.createRepair(repairData);


        // Mock database saving here (replace with your actual database logic)
        return NextResponse.json({ message: "Repair created successfully!", newRepair }, { status: 201 });
    } catch (error) {
        console.error("❌ Error in POST Route:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};




/**
 * ✅ Handle GET Requests
 * - Fetch all repairs if no repairID is provided
 * - Fetch a specific repair if repairID is provided as a query param
 */
export const GET = async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const repairID = searchParams.get("repairID");

        if (repairID) {
            return RepairsController.getRepairById(req, repairID);
        } else {
            return RepairsController.getRepairs(req);
        }
    } catch (error) {
        console.error("❌ Error in GET Route:", error.message);
        return NextResponse.json({ error: "Failed to fetch repairs", details: error.message }, { status: 500 });
    }
};

/**
 * ✅ Handle PUT Requests (Image uploads not included here)
 * - Update an existing repair by repairID
 */
export const PUT = async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const repairID = searchParams.get("repairID");

        if (!repairID) {
            return NextResponse.json({ error: "repairID is required for updating a repair" }, { status: 400 });
        }

        // ✅ Proper JSON Parsing and Error Handling
        const body = await req.json();

        if (!body || Object.keys(body).length === 0) {
            return NextResponse.json({ error: "Request body cannot be empty." }, { status: 400 });
        }

        const updatedRepair = await RepairsController.updateRepairById(repairID, body);
        
        return NextResponse.json(updatedRepair, { status: 200 });
    } catch (error) {
        console.error("❌ Error in PUT Route:", error.message);
        return NextResponse.json({ error: "Failed to update repair", details: error.message }, { status: 500 });
    }
};

/**
 * ✅ Handle DELETE Requests
 * - Delete a repair by repairID
 */
export const DELETE = async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const repairID = searchParams.get("repairID");

        if (!repairID) {
            return NextResponse.json({ error: "repairID is required for deleting a repair" }, { status: 400 });
        }

        await RepairsController.deleteRepairById(req);
        return NextResponse.json({ message: "Repair deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("❌ Error in DELETE Route:", error.message);
        return NextResponse.json({ error: "Failed to delete repair", details: error.message }, { status: 500 });
    }
};
