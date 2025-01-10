import RepairsService from "./service";

export default class RepairsController {
    /**
     * ✅ Get all repairs
     */
    static getRepairs = async (req) => {
        try {
            const repairs = await RepairsService.getRepairs();
            return new Response(JSON.stringify(repairs), { status: 200 });
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Failed to fetch repairs", details: error.message }),
                { status: 500 }
            );
        }
    };

    /**
     * ✅ Get repair by repairID
     */
    static getRepairById = async (req) => {
        try {
            const { searchParams } = new URL(req.url);
            const repairID = searchParams.get('repairID');

            if (!repairID) {
                return new Response(JSON.stringify({ error: "repairID is required" }), { status: 400 });
            }

            const repair = await RepairsService.getRepairById(repairID);
            if (!repair) {
                return new Response(JSON.stringify({ error: "Repair not found" }), { status: 404 });
            }

            return new Response(JSON.stringify(repair), { status: 200 });
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Failed to fetch repair", details: error.message }),
                { status: 500 }
            );
        }
    };

    /**
     * ✅ Create a new repair (Now supports image uploads)
     */
    static createRepair = async (repairData) => {
        try {
            console.log("🛠️ Processing Repair in Controller...");

            // ✅ Validate data before sending to the service
            if (!repairData.userID) throw new Error("Client ID is missing.");

            const newRepair = await RepairsService.createRepair(repairData);
            console.log("✅ Repair created successfully:", newRepair);

            return new Response(
                JSON.stringify({ message: "Repair created successfully", repairID: newRepair }),
                { status: 201 }
            );
        } catch (error) {
            console.error("❌ Controller Error:", error.message);
            return new Response(
                JSON.stringify({ error: "Failed to create repair", details: error.message }),
                { status: 500 }
            );
        }
    };

    /**
     * ✅ Update an existing repair by repairID
     */
    static updateRepairById = async (req) => {
        try {
            const { searchParams } = new URL(req.url);
            const repairID = searchParams.get('repairID');

            if (!repairID) {
                return new Response(JSON.stringify({ error: "repairID is required" }), { status: 400 });
            }

            let body;
            if (req.body) {
                body = JSON.parse(req.body);
            } else {
                body = await req.json();
            }

            const updatedRepair = await RepairsService.updateRepairById(repairID, body);

            return new Response(
                JSON.stringify({ message: "Repair updated successfully", repair: updatedRepair }),
                { status: 200 }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Failed to update repair", details: error.message }),
                { status: 500 }
            );
        }
    };

    /**
     * ✅ Delete a repair by repairID
     */
    static deleteRepairById = async (req) => {
        try {
            const { searchParams } = new URL(req.url);
            const repairID = searchParams.get('repairID');

            if (!repairID) {
                return new Response(JSON.stringify({ error: "repairID is required" }), { status: 400 });
            }

            await RepairsService.deleteRepairById(repairID);

            return new Response(
                JSON.stringify({ message: "Repair deleted successfully" }),
                { status: 200 }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Failed to delete repair", details: error.message }),
                { status: 500 }
            );
        }
    };
}
