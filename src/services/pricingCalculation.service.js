/**
 * Pricing calculation service for repair orders
 * Handles calculation of subtotals, fees, discounts, and totals
 */

/**
 * Calculate subtotal from all work items
 * @param {Object} repair - The repair object containing tasks, processes, materials, etc.
 * @returns {number} The calculated subtotal
 */
export const calculateSubtotal = (repair) => {
    const allItems = [
        ...(repair.tasks || []),
        ...(repair.processes || []),
        ...(repair.materials || []),
        ...(repair.customLineItems || []),
        ...(repair.repairTasks || [])
    ];

    return allItems.reduce((sum, item) => {
        const price = parseFloat(item.price || 0);
        const quantity = parseInt(item.quantity || 1);
        return sum + (price * quantity);
    }, 0);
};

/**
 * Calculate rush fee based on repair settings
 * @param {Object} repair - The repair object
 * @returns {number} The rush fee amount
 */
export const calculateRushFee = (repair) => {
    if (repair.isRush) {
        return parseFloat(repair.rushFee || 0);
    }
    return 0;
};

/**
 * Calculate delivery fee based on repair settings
 * @param {Object} repair - The repair object
 * @returns {number} The delivery fee amount
 */
export const calculateDeliveryFee = (repair) => {
    if (repair.requiresDelivery) {
        return parseFloat(repair.deliveryFee || 5.00);
    }
    return 0;
};

/**
 * Calculate wholesale discount
 * @param {number} subtotal - The subtotal amount
 * @param {Object} repair - The repair object
 * @returns {number} The wholesale discount amount (positive number)
 */
export const calculateWholesaleDiscount = (subtotal, repair) => {
    if (repair.isWholesale) {
        const discountPercent = parseFloat(repair.wholesaleDiscountPercent || 50);
        return (subtotal * discountPercent) / 100;
    }
    return 0;
};

/**
 * Calculate tax amount
 * @param {number} subtotal - The subtotal amount
 * @param {Object} repair - The repair object
 * @returns {number} The tax amount
 */
export const calculateTax = (subtotal, repair) => {
    // Wholesale clients are typically tax exempt
    if (repair.isWholesale) {
        return 0;
    }
    
    const taxRate = parseFloat(repair.taxRate || 8.75); // Default tax rate
    return (subtotal * taxRate) / 100;
};

/**
 * Calculate the final total for a repair
 * @param {Object} repair - The repair object
 * @returns {Object} An object containing all pricing breakdown
 */
export const calculateRepairTotal = (repair) => {
    const subtotal = calculateSubtotal(repair);
    const rushFee = calculateRushFee(repair);
    const deliveryFee = calculateDeliveryFee(repair);
    const wholesaleDiscount = calculateWholesaleDiscount(subtotal, repair);
    const discountedSubtotal = subtotal - wholesaleDiscount;
    const tax = calculateTax(discountedSubtotal, repair);
    const total = discountedSubtotal + rushFee + deliveryFee + tax;

    return {
        subtotal: subtotal.toFixed(2),
        rushFee: rushFee.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        wholesaleDiscount: wholesaleDiscount.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        breakdown: {
            itemCount: calculateItemCount(repair),
            hasRush: repair.isRush || false,
            hasDelivery: repair.requiresDelivery || false,
            isWholesale: repair.isWholesale || false,
            taxExempt: repair.isWholesale || false
        }
    };
};

/**
 * Count total number of work items
 * @param {Object} repair - The repair object
 * @returns {number} Total item count
 */
export const calculateItemCount = (repair) => {
    const allItems = [
        ...(repair.tasks || []),
        ...(repair.processes || []),
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
        ...(repair.processes || []).map(item => ({ ...item, type: 'Process' })),
        ...(repair.materials || []).map(item => ({ ...item, type: 'Material', isStullerItem: item.isStullerItem })),
        ...(repair.customLineItems || []).map(item => ({ ...item, type: 'Custom' })),
        ...(repair.repairTasks || []).map(item => ({ ...item, type: 'Legacy Task' }))
    ];
};
