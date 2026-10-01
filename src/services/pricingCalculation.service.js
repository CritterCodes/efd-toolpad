/**
 * Pricing calculation service for repair orders
 * Handles calculation of subtotals, fees, discounts, and totals
 */

/*
 * Repair TOTALS are not calculated here. They are THE engine's (services/pricing/engine.js
 * priceRepairTotals) and stored on the ticket. This file used to re-derive them for the print page with
 * an 8.75% default tax that read the stored tax rate as a percent — and the result was only logged.
 */

/**
 * Count total number of work items
 * @param {Object} repair - The repair object
 * @returns {number} Total item count
 */
export const calculateItemCount = (repair) => {
    const allItems = [
        ...(repair.tasks || []),
        ...(repair.materials || []),
        ...(repair.customLineItems || []),
        ...(repair.repairTasks || [])
    ];

    return allItems.reduce((count, item) => {
        const quantity = parseInt(item.quantity || 1);
        return count + quantity;
    }, 0);
};

/**
 * Format currency for display
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `$${num.toFixed(2)}`;
};

/**
 * Get all work items with type labels for display
 * @param {Object} repair - The repair object
 * @returns {Array} Array of items with type labels
 */
export const getAllWorkItems = (repair) => {
    return [
        ...(repair.tasks || []).map(item => ({ ...item, type: 'Task' })),
        ...(repair.materials || []).map(item => ({ ...item, type: 'Material', isStullerItem: item.isStullerItem })),
        ...(repair.customLineItems || []).map(item => ({ ...item, type: 'Custom' })),
        ...(repair.repairTasks || []).map(item => ({ ...item, type: 'Legacy Task' }))
    ];
};
