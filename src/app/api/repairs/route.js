import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import RepairsController from "./controller";

export const POST = async (req) => {
    try {
        console.log("📩 Incoming POST request received.");

        // ✅ Check if the request is FormData
        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Invalid content type. Use multipart/form-data." }, { status: 400 });
        }

        const formData = await req.formData();
        console.log("📤 Parsed Form Data:", [...formData.entries()]);



        // ✅ Parse repairTasks
        let repairTasks = [];
        try {
            repairTasks = JSON.parse(formData.get("repairTasks"));
        } catch (parseError) {
            console.error("❌ Error parsing repairTasks:", parseError);
            return NextResponse.json({ error: "Invalid repairTasks JSON" }, { status: 400 });
        }

        // ✅ Handle image upload if provided
        let imagePath = "";
        const picture = formData.get("picture");
        if (picture && picture.name) {
            const buffer = Buffer.from(await picture.arrayBuffer());
            const fileName = `${Date.now()}-${picture.name.replace(/\s/g, "_")}`;
            const uploadPath = path.join(process.cwd(), "public/uploads", fileName);
            await writeFile(uploadPath, buffer);
            imagePath = `/uploads/${fileName}`;
            console.log("📸 Image saved successfully:", imagePath);
        }

        
        // ✅ Construct repair object
        const repairData = {
            userID: formData.get("userID"),
            clientName: formData.get("clientName"),
            description: formData.get("description"),
            promiseDate: formData.get("promiseDate"),
            metalType: formData.get("metalType"),
            repairTasks,
            cost: parseFloat(formData.get("cost")) || 0,
            picture: imagePath
        };

        console.log("✅ Final Repair Data Sent to Controller:", repairData);

        // ✅ Send to controller for saving
        const newRepair = await RepairsController.createRepair(repairData);
        console.log("✅ New Repair Created:", newRepair);

        // ✅ Return the full repair object, including generated fields
        return NextResponse.json(newRepair, { status: 201 });
    } catch (error) {
        console.error("❌ Error in POST Route:", error.message);
        return NextResponse.json({ error: "Failed to create repair", details: error.message }, { status: 500 });
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
            return RepairsController.getRepairById(req);
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
