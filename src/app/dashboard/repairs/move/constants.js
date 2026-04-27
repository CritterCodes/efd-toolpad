// Repair status constants and configurations
export const REPAIR_STATUSES = [
    "RECEIVING",
    "NEEDS QUOTE",
    "COMMUNICATION REQUIRED",
    "NEEDS PARTS",
    "PARTS ORDERED", 
    "READY FOR WORK",
    "QC",
    "COMPLETED",
    "READY FOR PICKUP",
    "DELIVERY BATCHED",
    "PAID_CLOSED",
    "READY FOR PICK-UP"
];

export const STATUS_DESCRIPTIONS = {
    "RECEIVING": "Initial intake - item just received",
    "NEEDS QUOTE": "Waiting on quote review before work can proceed",
    "COMMUNICATION REQUIRED": "Needs customer or internal communication before work can continue",
    "NEEDS PARTS": "Waiting for parts to be ordered",
    "PARTS ORDERED": "Parts have been ordered, waiting for arrival",
    "READY FOR WORK": "All parts available, ready to start work",
    "IN PROGRESS": "Work is actively being performed",
    "QC": "Work completed and cleaned, awaiting physical QC inspection",
    "COMPLETED": "Passed QC and physically complete",
    "READY FOR PICKUP": "Completed and ready for customer pickup",
    "READY FOR PICK-UP": "Completed and ready for customer pickup",
    "DELIVERY BATCHED": "Completed and batched for delivery/invoicing",
    "PAID_CLOSED": "Invoice paid and repair fully closed"
};

export const TRACKABLE_STATUSES = [
    "PARTS ORDERED"
];

export const STATUS_FIELD_LABELS = {
    "PARTS ORDERED": "Parts Ordered By"
};

export const STATUS_HELP_TEXT = {
    "PARTS ORDERED": "Who is ordering the parts?"
};
