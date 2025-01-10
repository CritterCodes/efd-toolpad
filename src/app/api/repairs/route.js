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

        // ✅ Extract fields from FormData
        const userID = formData.get("userID");
        const clientName = formData.get("clientName");
        const description = formData.get("description");
        const promiseDate = formData.get("promiseDate");
        const metalType = formData.get("metalType");
        const cost = parseFloat(formData.get("cost")) || 0;
        const completed = formData.get("completed") === "true";

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
            userID,
            clientName,
            description,
            promiseDate,
            metalType,
            repairTasks,
            cost,
            completed,
            picture: imagePath
        };

        console.log("✅ Final Repair Data Sent to Controller:", repairData);

        // ✅ Send to controller for saving
        const newRepair = await RepairsController.createRepair(repairData);
        return NextResponse.json({ message: "Repair created successfully", repair: newRepair }, { status: 201 });
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
        return new Response(JSON.stringify({ error: "Failed to fetch repairs" }), { status: 500 });
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
            return new Response(
                JSON.stringify({ error: "repairID is required for updating a repair" }),
                { status: 400 }
            );
        }

        const updatedRepair = await RepairsController.updateRepairById(req);
        return new Response(JSON.stringify(updatedRepair), { status: 200 });
    } catch (error) {
        console.error("❌ Error in PUT Route:", error.message);
        return new Response(
            JSON.stringify({ error: "Failed to update repair", details: error.message }),
            { status: 500 }
        );
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
            return new Response(
                JSON.stringify({ error: "repairID is required for deleting a repair" }),
                { status: 400 }
            );
        }

        await RepairsController.deleteRepairById(req);
        return new Response(JSON.stringify({ message: "Repair deleted successfully" }), { status: 200 });
    } catch (error) {
        console.error("❌ Error in DELETE Route:", error.message);
        return new Response(
            JSON.stringify({ error: "Failed to delete repair", details: error.message }),
            { status: 500 }
        );
    }
};
