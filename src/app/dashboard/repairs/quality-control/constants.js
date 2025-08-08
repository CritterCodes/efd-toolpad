// Quality Control constants
export const QC_DECISIONS = {
    APPROVE: 'APPROVE',
    REJECT: 'REJECT'
};

export const QC_DECISION_LABELS = {
    APPROVE: 'Approve & Move to Pickup',
    REJECT: 'Reject & Return to Work'
};

export const QC_DECISION_COLORS = {
    APPROVE: 'success',
    REJECT: 'error'
};

export const QC_INSPECTOR_OPTIONS = [
    'Unassigned',
    'Quality Manager',
    'Senior Jeweler',
    'Lead Technician',
    'Shop Manager'
];

export const QC_ISSUE_CATEGORIES = [
    'Workmanship Quality',
    'Stone Setting',
    'Sizing/Fit',
    'Finish Quality',
    'Missing Components',
    'Customer Request Changes',
    'Damage/Defects',
    'Other'
];

export const QC_SEVERITY_LEVELS = [
    { value: 'low', label: 'Minor Issue', color: 'warning' },
    { value: 'medium', label: 'Moderate Issue', color: 'orange' },
    { value: 'high', label: 'Major Issue', color: 'error' },
    { value: 'critical', label: 'Critical Issue', color: 'error' }
];

export const QC_STATUS_DESCRIPTIONS = {
    'QUALITY CONTROL': 'Item is being inspected for quality',
    'READY FOR PICK-UP': 'Quality approved - ready for customer',
    'READY FOR WORK': 'Quality issues found - returned to work queue'
};

export const QC_FORM_VALIDATION = {
    PHOTO_REQUIRED: true,
    NOTES_REQUIRED_ON_REJECT: true,
    INSPECTOR_REQUIRED: true,
    ISSUE_CATEGORY_REQUIRED_ON_REJECT: true
};

export const QC_PHOTO_CONFIG = {
    MAX_PHOTOS: 10,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ACCEPTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    PHOTO_TYPES: [
        'Before QC',
        'After QC', 
        'Issue Documentation',
        'Completion Verification'
    ]
};
