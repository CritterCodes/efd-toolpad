// Repair status constants and configurations
export const REPAIR_STATUSES = [
    "RECEIVING",
    "NEEDS PARTS",
    "PARTS ORDERED", 
    "READY FOR WORK",
    "IN PROGRESS",
    "QUALITY CONTROL",
    "READY FOR PICK-UP",
    "COMPLETED"
];

export const STATUS_DESCRIPTIONS = {
    "RECEIVING": "Initial intake - item just received",
    "NEEDS PARTS": "Waiting for parts to be ordered",
    "PARTS ORDERED": "Parts have been ordered, waiting for arrival",
    "READY FOR WORK": "All parts available, ready to start work",
    "IN PROGRESS": "Work is actively being performed",
    "QUALITY CONTROL": "Work completed, undergoing quality inspection",
    "READY FOR PICK-UP": "QC passed, ready for customer pickup",
    "COMPLETED": "Customer has picked up the item"
};

export const TRACKABLE_STATUSES = [
    "PARTS ORDERED",
    "IN PROGRESS", 
    "QUALITY CONTROL",
    "COMPLETED"
];

export const STATUS_FIELD_LABELS = {
    "PARTS ORDERED": "Parts Ordered By",
    "IN PROGRESS": "Assigned Jeweler",
    "QUALITY CONTROL": "QC Inspector",
    "COMPLETED": "Completed By"
};

export const STATUS_HELP_TEXT = {
    "PARTS ORDERED": "Who is ordering the parts?",
    "IN PROGRESS": "Which jeweler will work on these repairs?",
    "QUALITY CONTROL": "Who will perform quality control?",
    "COMPLETED": "Who completed these repairs?"
};
