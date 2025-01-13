import { db } from "@/lib/database";

// ✅ Add or update parts for specific repairs
export const PUT = async (req) => {
    try {
        const { repairID, parts } = await req.json();

        if (!repairID || !parts || parts.length === 0) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }

        const dbRepairs = await db.dbRepairs();

        const result = await dbRepairs.updateOne(
            { repairID },
            { $set: { parts: parts } }
        );

        if (result.modifiedCount === 0) {
            return new Response(JSON.stringify({ error: "Repair not found or no changes made" }), { status: 404 });
        }

        return new Response(JSON.stringify({ message: 'Parts updated successfully' }), { status: 200 });
    } catch (error) {
        console.error("Error updating parts:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};

// ✅ Add a single part to a repair (without replacing the whole array)
export const POST = async (req) => {
    try {
        const { repairID, part } = await req.json();

        if (!repairID || !part || !part.partName || !part.sku) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }

        const dbRepairs = await db.dbRepairs();

        // Check if the part already exists based on SKU
        const existingRepair = await dbRepairs.findOne({ repairID });
        const existingPart = existingRepair?.parts.find(p => p.sku === part.sku);

        if (existingPart) {
            // If the part exists, update its quantity
            const result = await dbRepairs.updateOne(
                { repairID, "parts.sku": part.sku },
                { $inc: { "parts.$.quantity": part.quantity } }
            );

            if (result.modifiedCount === 0) {
                return new Response(JSON.stringify({ error: "Failed to update part quantity" }), { status: 404 });
            }

            return new Response(JSON.stringify({ message: "Part quantity updated successfully" }), { status: 200 });
        } else {
            // If the part does not exist, add it as a new part
            const result = await dbRepairs.updateOne(
                { repairID },
                { $push: { parts: part } }
            );

            if (result.modifiedCount === 0) {
                return new Response(JSON.stringify({ error: "Repair not found or no changes made" }), { status: 404 });
            }

            return new Response(JSON.stringify({ message: 'Part added successfully' }), { status: 200 });
        }
    } catch (error) {
        console.error("Error adding part:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};



// ✅ Delete a part from a repair
export const DELETE = async (req) => {
    try {
        const { repairID, partSKU } = await req.json();

        if (!repairID || !partSKU) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }

        const dbRepairs = await db.dbRepairs();

        const result = await dbRepairs.updateOne(
            { repairID },
            { $pull: { parts: { sku: partSKU } } }
        );

        if (result.modifiedCount === 0) {
            return new Response(JSON.stringify({ error: "Repair not found or part not found" }), { status: 404 });
        }

        return new Response(JSON.stringify({ message: 'Part deleted successfully' }), { status: 200 });
    } catch (error) {
        console.error("Error deleting part:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};

// ✅ Fetch parts for a specific repair
export const GET = async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const repairID = searchParams.get("repairID");

        if (!repairID) {
            return new Response(JSON.stringify({ error: "Repair ID is required" }), { status: 400 });
        }

        const dbRepairs = await db.dbRepairs();
        const repair = await dbRepairs.findOne({ repairID });

        if (!repair) {
            return new Response(JSON.stringify({ error: "Repair not found" }), { status: 404 });
        }

        return new Response(JSON.stringify({ parts: repair.parts || [] }), { status: 200 });
    } catch (error) {
        console.error("Error fetching parts:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};
