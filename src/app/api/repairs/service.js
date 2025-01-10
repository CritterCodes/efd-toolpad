import RepairsModel from "./model";

export default class RepairsService {
    /**
     * ✅ Fetch all repairs (ignoring _id)
     */
    static getRepairs = async () => {
        try {
            return await RepairsModel.findAll();
        } catch (error) {
            console.error("Error in getRepairs:", error);
            throw new Error("Failed to fetch repairs.");
        }
    };

    /**
     * ✅ Fetch a single repair by repairID
     */
    static getRepairById = async (repairID) => {
        if (!repairID) {
            throw new Error("Repair ID is required.");
        }
        try {
            return await RepairsModel.findById(repairID);
        } catch (error) {
            console.error("Error in getRepairById:", error);
            throw new Error("Failed to fetch repair by ID.");
        }
    };

    /**
     * ✅ Create a new repair record with repairID
     * ✅ Added support for images
     */
    static createRepair = async (data) => {
        const { userID, clientName, description, metalType, repairTasks, cost, completed, picture } = data;
    
        // ✅ Improved validation
        if (!userID || !clientName || !description || !Array.isArray(repairTasks) || repairTasks.length === 0 || typeof cost !== 'number') {
            throw new Error("Invalid repair data provided.");
        }
    
        try {
            const newRepair = {
                userID,
                clientName,
                description,
                metalType,
                repairTasks,
                cost,
                completed: completed || false,
                picture: picture || "",
                status: "RECEIVED",
                createdAt: new Date()
            };
    
            const result = await RepairsModel.create(newRepair);
            return result;
        } catch (error) {
            console.error("❌ Service Error:", error.message);
            throw new Error("Failed to create repair.");
        }
    };
    

    /**
     * ✅ Update an existing repair by repairID
     */
    static updateRepairById = async (repairID, updateData) => {
        if (!repairID) {
            throw new Error("Repair ID is required.");
        }
        if (Object.keys(updateData).length === 0) {
            throw new Error("Update data cannot be empty.");
        }

        try {
            const updatedCount = await RepairsModel.updateById(repairID, updateData);
            if (updatedCount === 0) {
                throw new Error("No repair updated. Check if the repair ID exists.");
            }
            return { message: "Repair updated successfully." };
        } catch (error) {
            console.error("Error in updateRepairById:", error);
            throw new Error("Failed to update repair.");
        }
    };

    /**
     * ✅ Delete a repair by repairID
     */
    static deleteRepairById = async (repairID) => {
        if (!repairID) {
            throw new Error("Repair ID is required.");
        }

        try {
            const deletedCount = await RepairsModel.deleteById(repairID);
            if (deletedCount === 0) {
                throw new Error("No repair deleted. Check if the repair ID exists.");
            }
            return { message: "Repair deleted successfully." };
        } catch (error) {
            console.error("Error in deleteRepairById:", error);
            throw new Error("Failed to delete repair.");
        }
    };
}
