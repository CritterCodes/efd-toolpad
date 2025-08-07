// src/service/repairTasks.js
import axiosInstance from '@/utils/axiosInstance';

/**
 * Class-based service for handling all repair task-related API interactions
 * Updated to use the new tasks MVC system
 */
class RepairTaskService {
    /**
     * Fetch all repair tasks (now using tasks API)
     * @returns {Promise<Object[]>} - Array of task objects
     */
    static fetchRepairTasks = async () => {
        try {
            // Use the new tasks API instead of deprecated repairTasks
            const response = await axiosInstance.get('/tasks', {
                params: {
                    isActive: true,
                    limit: 1000 // Get all active tasks
                }
            });
            
            // Transform new tasks structure to match what repair components expect
            const tasks = response.data.tasks || response.data;
            
            return tasks.map(task => ({
                // Map new structure to old expected structure for backward compatibility
                title: task.title,
                description: task.description,
                price: task.basePrice, // Map basePrice to price
                sku: task.sku,
                category: task.category,
                metalType: task.metalType,
                // Include original fields for components that need them
                ...task
            }));
            
        } catch (error) {
            console.error("❌ Error fetching repair tasks:", error);
            
            // Fallback to old API temporarily if new API fails
            try {
                console.log("🔄 Falling back to legacy repairTasks API...");
                const fallbackResponse = await axiosInstance.get('/repairTasks');
                return fallbackResponse.data;
            } catch (fallbackError) {
                console.error("❌ Fallback also failed:", fallbackError);
                throw error; // Throw original error
            }
        }
    };

    /**
     * Fetch tasks with specific filtering for repair workflow
     * @param {Object} filters - Filter parameters
     * @returns {Promise<Object[]>} - Array of filtered task objects
     */
    static fetchTasksForRepairs = async (filters = {}) => {
        try {
            const response = await axiosInstance.get('/tasks', {
                params: {
                    isActive: true,
                    category: filters.category || undefined,
                    metalType: filters.metalType || undefined,
                    search: filters.search || undefined,
                    limit: filters.limit || 1000
                }
            });
            
            const tasks = response.data.tasks || response.data;
            
            return tasks.map(task => ({
                title: task.title,
                description: task.description,
                price: task.basePrice,
                sku: task.sku,
                category: task.category,
                metalType: task.metalType,
                laborHours: task.laborHours,
                skillLevel: task.skillLevel,
                riskLevel: task.riskLevel,
                ...task
            }));
            
        } catch (error) {
            console.error("❌ Error fetching filtered repair tasks:", error);
            throw error;
        }
    };
}

export default RepairTaskService;
