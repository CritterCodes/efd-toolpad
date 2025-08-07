// Print components index file - Central export location for all print components
export { default as RepairTicketComponent } from './RepairTicketComponent';
export { default as RepairReceiptComponent } from './RepairReceiptComponent';  
export { default as SideBySideLayout } from './SideBySideLayout';

// Re-export from services for convenience
export {
    calculateRepairTotal,
    getAllWorkItems,
    formatCurrency,
    calculateSubtotal
} from '../../services/pricingCalculation.service';

export {
    getRepairSummary,
    validateRepairData,
    formatRepairForDisplay,
    normalizeRepairData
} from '../../services/repairDataStructure.service';
