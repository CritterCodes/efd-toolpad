import { NextResponse } from "next/server";
import RepairsController from "../controller";
import { writeFile } from "fs/promises";
import path from "path";

/**
 * POST Route for Quality Control updates including status, notes, checklist, and image uploads
 */
export const POST = async (req) => {
    try {
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
        let imagePath = "";

        // ✅ Handle image upload if provided
        const picture = formData.get("picture");
        if (picture && picture.name) {
            const buffer = Buffer.from(await picture.arrayBuffer());
            const fileName = `${Date.now()}-${picture.name.replace(/\s/g, "_")}`;
            const uploadPath = path.join(process.cwd(), "public/uploads", fileName);
            await writeFile(uploadPath, buffer);
            imagePath = `/uploads/${fileName}`;
            console.log("📸 Image saved successfully:", imagePath);
        }

        // ✅ Prepare the repair data for updating
        const updateData = {
            status,
            notes,
            checklist,
            ...(imagePath && { picture: imagePath }) // Only add picture if uploaded
        };

        // ✅ Update repair in the database using the controller
        const updatedRepair = await RepairsController.updateRepairById(repairID, updateData);
        console.log("✅ Quality Control Update Successful:", updatedRepair);

        return NextResponse.json(updatedRepair, { status: 200 });
    } catch (error) {
        console.error("❌ Error in Quality Control Route:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};
