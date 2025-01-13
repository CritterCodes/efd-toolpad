// src/service/repair.js
import axiosInstance from '@/utils/axiosInstance';

/**
 * Class-based service to handle all repair-related API interactions
 */
class RepairsService {
    /**
     * Fetch all repairs
     * @returns {Promise<Object[]>} - Array of repair objects
     */
    static getRepairs = async () => {
        try {
            const response = await axiosInstance.get('/repairs');
            console.log("🔧 Repairs fetched:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching repairs:", error);
            throw error;
        }
    }

    /**
     * Fetch a single repair by ID
     * @param {string} repairID - The ID of the repair
     * @returns {Promise<Object>} - The repair object
     */
    static getRepairById = async (repairID) => {
        try {
            const response = await axiosInstance.get(`/repairs?repairID=${repairID}`);
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching repair by ID:", error);
            throw error;
        }
    }

    /**
     * Create a new repair
     * @param {FormData} repairData - The repair data in FormData format
     * @returns {Promise<Object>} - The newly created repair object
     */
    static createRepair = async (repairData) => {
        try {
            const response = await axiosInstance.post('/repairs', repairData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Error creating repair:", error);
            throw error;
        }
    }

    /**
     * Update an existing repair by ID
     * @param {string} repairID - The ID of the repair
     * @param {Object} repairData - The repair data to update
     * @returns {Promise<Object>} - The updated repair object
     */
    static updateRepair = async (repairID, repairData) => {
        try {
            const response = await axiosInstance.put(`/repairs?repairID=${repairID}`, repairData);
            return response.data;
        } catch (error) {
            console.error("❌ Error updating repair:", error);
            throw error;
        }
    }

    /**
     * Delete a repair by ID
     * @param {string} repairID - The ID of the repair to delete
     * @returns {Promise<Object>} - Confirmation message
     */
    static deleteRepair = async (repairID) => {
        try {
            const response = await axiosInstance.delete(`/repairs?repairID=${repairID}`);
            return response.data;
        } catch (error) {
            console.error("❌ Error deleting repair:", error);
            throw error;
        }
    }

    /**
     * Add a part to a repair
     * @param {string} repairID - The ID of the repair
     * @param {Object} partData - The part data to be added
     * @returns {Promise<Object>} - Updated repair object
     */
    static addPart = async (repairID, partData) => {
        try {
            // Combine parts with the same SKU before sending the request
            const combinedParts = partData.reduce((acc, part) => {
                const existingPart = acc.find(p => p.sku === part.sku);
                if (existingPart) {
                    existingPart.quantity += part.quantity;
                } else {
                    acc.push({ ...part });
                }
                return acc;
            }, []);
    
            console.log("📦 Sending combined parts:", combinedParts);
    
            for (const part of combinedParts) {
                const response = await axiosInstance.post(`/repairs/parts`, { repairID, part });
                console.log(`✅ Part added successfully:`, part);
            }
    
            return { message: "All parts added successfully" };
        } catch (error) {
            console.error("❌ Error adding part to repair:", error);
            throw error;
        }
    };
    

    /**
     * Move a repair's status
     * @param {string[]} repairIDs - Array of repair IDs to move
     * @param {string} status - The new status for the repairs
     * @returns {Promise<Object>} - Confirmation message
     */
    static moveRepairStatus = async (repairIDs, status) => {
        try {
            const response = await axiosInstance.put('/repairs/move', { repairIDs, status });
            return response.data;
        } catch (error) {
            console.error("❌ Error moving repair status:", error);
            throw error;
        }
    }
}

export default RepairsService;
