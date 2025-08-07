// app/api/repairs/route.js
import { NextResponse } from "next/server";
import { uploadFileToS3 } from "@/utils/s3.util"; 
import RepairsController from "./controller";

export const POST = async (request) => {
    try {
        console.log("📩 Incoming POST request received.");
        const contentType = request.headers.get("content-type");
        let repairData;
        let imageUrl = null;

        if (contentType && contentType.includes("multipart/form-data")) {
            // Handle FormData (legacy support and image uploads)
            const formData = await request.formData();
            const picture = formData.get("picture");

            // Upload image to S3 if provided
            if (picture && picture instanceof File) {
                imageUrl = await uploadFileToS3(picture);
            }

            // Extract repair data from FormData
            repairData = {
                userID: formData.get("userID"),
                clientName: formData.get("clientName"),
                description: formData.get("description"),
                promiseDate: formData.get("promiseDate"),
                isRush: formData.get("isRush") === "true",
                
                // Handle both new format (metalType + karat) and legacy format
                metalType: formData.get("metalType"),
                karat: formData.get("karat"),
                
                isRing: formData.get("isRing") === "true",
                currentRingSize: formData.get("currentRingSize"),
                desiredRingSize: formData.get("desiredRingSize"),
                notes: formData.get("notes"),
                internalNotes: formData.get("internalNotes"),
                isWholesale: formData.get("isWholesale") === "true",
                
                // Pricing breakdown fields
                totalCost: parseFloat(formData.get("totalCost")) || 0,
                subtotal: parseFloat(formData.get("subtotal")) || 0,
                deliveryFee: parseFloat(formData.get("deliveryFee")) || 0,
                taxAmount: parseFloat(formData.get("taxAmount")) || 0,
                rushFee: parseFloat(formData.get("rushFee")) || 0,
                taxRate: parseFloat(formData.get("taxRate")) || 0,
                includeDelivery: formData.get("includeDelivery") === "true",
                includeTax: formData.get("includeTax") === "true",
                
                // Business name for wholesale clients
                businessName: formData.get("businessName") || '',
                
                // Workflow tracking fields
                assignedJeweler: formData.get("assignedJeweler") || '',
                partsOrderedBy: formData.get("partsOrderedBy") || '',
                partsOrderedDate: formData.get("partsOrderedDate") || null,
                completedBy: formData.get("completedBy") || '',
                qcBy: formData.get("qcBy") || '',
                qcDate: formData.get("qcDate") || null,
                
                picture: imageUrl,
                
                // Parse JSON arrays
                tasks: formData.get("tasks") ? JSON.parse(formData.get("tasks")) : [],
                processes: formData.get("processes") ? JSON.parse(formData.get("processes")) : [],
                materials: formData.get("materials") ? JSON.parse(formData.get("materials")) : [],
                customLineItems: formData.get("customLineItems") ? JSON.parse(formData.get("customLineItems")) : [],
                
                // Legacy support - combine metalType and karat for backward compatibility
                ...(formData.get("metalType") && formData.get("karat") && {
                    metalType: `${formData.get("metalType")} - ${formData.get("karat")}`
                }),
                
                // Legacy support
                repairTasks: formData.get("repairTasks") ? JSON.parse(formData.get("repairTasks")) : []
            };
        } else {
            // Handle JSON data (new form)
            const jsonData = await request.json();
            
            // Handle base64 image data if provided
            if (jsonData.picture && typeof jsonData.picture === 'object' && jsonData.picture.data) {
                // Convert base64 to file and upload
                const buffer = Buffer.from(jsonData.picture.data, 'base64');
                const file = new File([buffer], jsonData.picture.name || 'repair-image.jpg', {
                    type: jsonData.picture.type || 'image/jpeg'
                });
                imageUrl = await uploadFileToS3(file);
            }
            
            repairData = {
                ...jsonData,
                picture: imageUrl || jsonData.picture,
                
                // Pricing breakdown fields
                totalCost: parseFloat(jsonData.totalCost) || 0,
                subtotal: parseFloat(jsonData.subtotal) || 0,
                deliveryFee: parseFloat(jsonData.deliveryFee) || 0,
                taxAmount: parseFloat(jsonData.taxAmount) || 0,
                rushFee: parseFloat(jsonData.rushFee) || 0,
                taxRate: parseFloat(jsonData.taxRate) || 0,
                includeDelivery: !!jsonData.includeDelivery,
                includeTax: !!jsonData.includeTax,
                
                // Business name for wholesale clients
                businessName: jsonData.businessName || '',
                
                // Workflow tracking fields
                assignedJeweler: jsonData.assignedJeweler || '',
                partsOrderedBy: jsonData.partsOrderedBy || '',
                partsOrderedDate: jsonData.partsOrderedDate || null,
                completedBy: jsonData.completedBy || '',
                qcBy: jsonData.qcBy || '',
                qcDate: jsonData.qcDate || null,
                
                // Handle legacy metalType format for backward compatibility
                ...(jsonData.metalType && jsonData.karat && {
                    metalType: `${jsonData.metalType} - ${jsonData.karat}`
                })
            };
        }

        console.log("✅ Final Repair Data:", repairData);

        const newRepair = await RepairsController.createRepair(repairData);

        return NextResponse.json({ 
            message: "Repair created successfully!", 
            newRepair 
        }, { status: 201 });
        
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
