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
            return response.data;
        } catch (error) {
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
            throw error;
        }
    }

    /**
     * Create a new repair
     * @param {Object|FormData} repairData - The repair data as JSON object or FormData
     * @returns {Promise<Object>} - The newly created repair object
     */
    static createRepair = async (repairData) => {
        try {
            let requestConfig = {
                headers: { 'Content-Type': 'application/json' }
            };
            
            let dataToSend = repairData;
            
            // Check if it's FormData (legacy support)
            if (repairData instanceof FormData) {
                requestConfig.headers = { 'Content-Type': 'multipart/form-data' };
                dataToSend = repairData;
            } else {
                // Handle JSON data with potential image file
                if (repairData.picture && repairData.picture instanceof File) {
                    // If there's a file, we need to use FormData
                    const formData = new FormData();
                    
                    // Convert JSON data to FormData
                    Object.keys(repairData).forEach(key => {
                        if (key === 'picture') {
                            formData.append(key, repairData[key]);
                        } else if (typeof repairData[key] === 'object' && repairData[key] !== null) {
                            formData.append(key, JSON.stringify(repairData[key]));
                        } else {
                            formData.append(key, repairData[key] || '');
                        }
                    });
                    
                    dataToSend = formData;
                    requestConfig.headers = { 'Content-Type': 'multipart/form-data' };
                } else {
                    // Pure JSON data
                    dataToSend = JSON.stringify(repairData);
                }
            }

            const response = await axiosInstance.post('/repairs', dataToSend, requestConfig);
            return response.data;
        } catch (error) {
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

            for (const part of combinedParts) {
                const response = await axiosInstance.post(`/repairs/parts`, { repairID, part });
            }

            return { message: "All parts added successfully" };
        } catch (error) {
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
            throw error;
        }
    }

    /**
 * Update repair via Quality Control route (Notes, Status, Completion Photo)
 * @param {FormData} qcData - The quality control data including image
 * @returns {Promise<Object>} - Updated repair object
 */
    static updateQualityControl = async (qcData) => {
        try {
            const response = await axiosInstance.post('/repairs/quality-control', qcData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
}

export default RepairsService;
