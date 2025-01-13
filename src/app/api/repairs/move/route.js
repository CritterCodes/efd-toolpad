import { db } from "@/lib/database";

// server-side route for updating repairs
export const PUT = async (req) => {
    try {
        const { repairIDs, status } = await req.json();

        if (!repairIDs || repairIDs.length === 0 || !status) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }
        const dbRepairs = await db.dbRepairs();

        const result = await dbRepairs.updateMany(
            { repairID: { $in: repairIDs } },
            { $set: { status } }
        );

        return new Response(JSON.stringify({ message: 'Repairs updated successfully' }), { status: 200 });
    } catch (error) {
        console.error("Error updating repairs:", error);
        return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }
};
