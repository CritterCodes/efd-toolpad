// src/service/repairTasks.js
import axiosInstance from '@/utils/axiosInstance';

/**
 * Class-based service for handling all repair task-related API interactions
 */
class RepairTaskService {
    /**
     * Fetch all repair tasks
     * @returns {Promise<Object[]>} - Array of repair task objects
     */
    static fetchRepairTasks = async () => {
        try {
            const response = await axiosInstance.get('/repairTasks');
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching repair tasks:", error);
            throw error;
        }
    };
}

export default RepairTaskService;
