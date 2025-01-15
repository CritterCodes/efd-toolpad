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
     * ✅ Create a new repair and return the created repair object
     */
    static createRepair = async (repairData) => {
        try {
            console.log("🔧 Creating new repair:", repairData);
            // ✅ Validate data before sending to the service
            if (!repairData.userID) throw new Error("Client ID is missing.");
            console.log("sending to service");
            const newRepair = await RepairsService.createRepair(repairData);

            // ✅ Return the full repair object instead of a message
            return newRepair;
        } catch (error) {
            console.error("❌ Controller Error:", error.message);
            return new Response(
                JSON.stringify({ error: "Failed to create repair", details: error.message }),
                { status: 500 }
            );
        }
    };

    /**
     * ✅ Update an existing repair and return the updated object
     */
    static async updateRepairById(repairID, body) {
        try {
            if (!repairID) {
                throw new Error("repairID is required.");
            }

            if (!body || Object.keys(body).length === 0) {
                throw new Error("Update data cannot be empty.");
            }

            // ✅ Pass both repairID and body correctly to the service
            const updatedRepair = await RepairsService.updateRepairById(repairID, body);
            return updatedRepair;
        } catch (error) {
            console.error("❌ Error in RepairsController:", error.message);
            throw new Error(`Failed to update repair: ${error.message}`);
        }
    }

    /**
     * ✅ Delete a repair by repairID and return confirmation
     */
    static deleteRepairById = async (req) => {
        try {
            const { searchParams } = new URL(req.url);
            const repairID = searchParams.get('repairID');

            if (!repairID) {
                return new Response(JSON.stringify({ error: "repairID is required" }), { status: 400 });
            }

            await RepairsService.deleteRepairById(repairID);

            // ✅ Return a confirmation message after deletion
            return new Response(
                JSON.stringify({ message: `Repair with ID ${repairID} deleted successfully.` }),
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
