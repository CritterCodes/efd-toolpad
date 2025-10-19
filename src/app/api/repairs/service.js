import RepairsModel from "./model";
import Repair from "./class";

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
     * ✅ Create a new repair record with repairID and return the created repair
     * ✅ Added support for images
     */
    static createRepair = async (data) => {
        try {
            const newRepair = new Repair(data);
            const createdRepair = await RepairsModel.create(newRepair);
            // ✅ Return the full created repair object to the controller
            return createdRepair;
        } catch (error) {
            console.error("❌ Service Error:", error.message);
            throw new Error("Failed to create repair.");
        }
    };

    /**
     * ✅ Update an existing repair by repairID and return the updated repair object
     */
    static async updateRepairById(repairID, updateData) {
        try {
            if (!repairID) throw new Error("Repair ID is required.");
            if (!updateData || Object.keys(updateData).length === 0) {
                throw new Error("Update data cannot be empty.");
            }

            // ✅ Ensure the update is properly passed to the model
            const updatedRepair = await RepairsModel.updateById(repairID, updateData);
            if (!updatedRepair) throw new Error("Failed to retrieve updated repair.");

            return updatedRepair;
        } catch (error) {
            console.error("❌ Error in RepairsService:", error.message);
            throw new Error(`Failed to update repair: ${error.message}`);
        }
    }

    /**
     * ✅ Delete a repair by repairID and confirm deletion
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
            return { message: `Repair with ID ${repairID} deleted successfully.` };
        } catch (error) {
            console.error("Error in deleteRepairById:", error);
            throw new Error("Failed to delete repair.");
        }
    };

    /**
     * ✅ Get repairs created by a specific user (for wholesaler view)
     */
    static getRepairsByCreator = async (creatorEmail) => {
        if (!creatorEmail) {
            throw new Error("Creator email is required.");
        }
        try {
            return await RepairsModel.findByCreator(creatorEmail);
        } catch (error) {
            console.error("Error in getRepairsByCreator:", error);
            throw new Error("Failed to fetch repairs by creator.");
        }
    };

    /**
     * ✅ Get repairs created by a specific user with status filtering
     */
    static getRepairsByCreatorAndStatus = async (creatorEmail, statusFilter) => {
        if (!creatorEmail) {
            throw new Error("Creator email is required.");
        }
        try {
            const repairs = await RepairsModel.findByCreator(creatorEmail);
            
            if (!statusFilter) {
                return repairs;
            }

            // Filter based on status categories
            if (statusFilter === 'current') {
                return repairs.filter(repair => 
                    !['completed', 'ready_for_pickup', 'cancelled'].includes(repair.status?.toLowerCase())
                );
            } else if (statusFilter === 'completed') {
                return repairs.filter(repair => 
                    ['completed', 'ready_for_pickup'].includes(repair.status?.toLowerCase())
                );
            }

            return repairs;
        } catch (error) {
            console.error("Error in getRepairsByCreatorAndStatus:", error);
            throw new Error("Failed to fetch filtered repairs by creator.");
        }
    };
}
