/**
 * Data structure service for repair data handling
 * Provides utilities for working with repair data structure
 */

/**
 * Validate repair data structure
 * @param {Object} repair - The repair object to validate
 * @param {String} userRole - The role of the user performing validation (optional)
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validateRepairData = (repair, userRole = null) => {
    const errors = [];
    
    if (!repair) {
        errors.push('Repair object is required');
        return { isValid: false, errors };
    }

    if (!repair.repairID) {
        errors.push('Repair ID is required');
    }

    if (!repair.clientName) {
        errors.push('Client name is required');
    }

    // Only validate work items for non-wholesaler roles
    // Wholesalers submit repairs without work items - these are added by staff later
    const isWholesaler = userRole === 'wholesaler';
    
    if (!isWholesaler) {
        // Validate work items exist for admin/staff roles
        const hasWorkItems = (
            (repair.tasks && repair.tasks.length > 0) ||
            (repair.processes && repair.processes.length > 0) ||
            (repair.materials && repair.materials.length > 0) ||
            (repair.customLineItems && repair.customLineItems.length > 0) ||
            (repair.repairTasks && repair.repairTasks.length > 0)
        );

        if (!hasWorkItems) {
            errors.push('At least one work item is required');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Normalize repair data structure to ensure all arrays exist
 * @param {Object} repair - The repair object to normalize
 * @returns {Object} Normalized repair object
 */
export const normalizeRepairData = (repair) => {
    if (!repair) {
        return {
            repairID: '',
            clientName: '',
            description: '',
            tasks: [],
            processes: [],
            materials: [],
            customLineItems: [],
            repairTasks: []
        };
    }

    return {
        ...repair,
        tasks: repair.tasks || [],
        processes: repair.processes || [],
        materials: repair.materials || [],
        customLineItems: repair.customLineItems || [],
        repairTasks: repair.repairTasks || []
    };
};

/**
 * Get repair summary information
 * @param {Object} repair - The repair object
 * @returns {Object} Summary information
 */
export const getRepairSummary = (repair) => {
    const normalized = normalizeRepairData(repair);
    
    const taskCount = normalized.tasks.length;
    const processCount = normalized.processes.length;
    const materialCount = normalized.materials.length;
    const customCount = normalized.customLineItems.length;
    const legacyTaskCount = normalized.repairTasks.length;
    const totalItems = taskCount + processCount + materialCount + customCount + legacyTaskCount;

    return {
        repairID: normalized.repairID,
        clientName: normalized.clientName,
        description: normalized.description,
        totalItems,
        breakdown: {
            tasks: taskCount,
            processes: processCount,
            materials: materialCount,
            customLineItems: customCount,
            legacyTasks: legacyTaskCount
        },
        flags: {
            isRush: normalized.isRush || false,
            requiresDelivery: normalized.requiresDelivery || false,
            isWholesale: normalized.isWholesale || false,
            hasPicture: !!normalized.picture
        }
    };
};

/**
 * Format repair data for display
 * @param {Object} repair - The repair object
 * @returns {Object} Formatted repair data
 */
export const formatRepairForDisplay = (repair) => {
    const normalized = normalizeRepairData(repair);
    
    return {
        ...normalized,
        formattedDate: normalized.createdAt ? new Date(normalized.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        formattedPromiseDate: normalized.promiseDate ? new Date(normalized.promiseDate).toLocaleDateString() : 'N/A',
        metalDescription: `${normalized.metalType || 'N/A'}${normalized.karat ? ` (${normalized.karat})` : ''}`,
        statusDisplay: normalized.status || 'Pending'
    };
};

/**
 * Extract all unique work item types from repair
 * @param {Object} repair - The repair object
 * @returns {Array} Array of unique work item types
 */
export const getWorkItemTypes = (repair) => {
    const normalized = normalizeRepairData(repair);
    const types = [];

    if (normalized.tasks.length > 0) types.push('Tasks');
    if (normalized.processes.length > 0) types.push('Processes');
    if (normalized.materials.length > 0) types.push('Materials');
    if (normalized.customLineItems.length > 0) types.push('Custom Items');
    if (normalized.repairTasks.length > 0) types.push('Legacy Tasks');

    return types;
};

/**
 * Check if repair has any Stuller materials
 * @param {Object} repair - The repair object
 * @returns {boolean} True if repair has Stuller materials
 */
export const hasStullerMaterials = (repair) => {
    const normalized = normalizeRepairData(repair);
    return normalized.materials.some(material => material.isStullerItem === true);
};

/**
 * Get repair workflow status information
 * @param {Object} repair - The repair object
 * @returns {Object} Workflow status information
 */
export const getWorkflowStatus = (repair) => {
    const normalized = normalizeRepairData(repair);
    
    return {
        purchaseOrderComplete: !!normalized.poInitials,
        componentOrderComplete: !!normalized.compInitials,
        qualityControlComplete: !!normalized.qcInitials,
        readyForDelivery: !!(normalized.poInitials && normalized.compInitials && normalized.qcInitials)
    };
};

/**
 * Create a clean repair object for API submission
 * @param {Object} repair - The repair object
 * @returns {Object} Clean repair object
 */
export const createCleanRepairObject = (repair) => {
    const normalized = normalizeRepairData(repair);
    
    // Remove any undefined or null values
    const cleanRepair = {};
    
    Object.keys(normalized).forEach(key => {
        if (normalized[key] !== undefined && normalized[key] !== null) {
            cleanRepair[key] = normalized[key];
        }
    });

    return cleanRepair;
};
