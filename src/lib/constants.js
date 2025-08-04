// lib/constants.js
const Constants = {
    // Core Collections
    USERS_COLLECTION: 'users',
    REPAIRS_COLLECTION: 'repairs',
    TASKS_COLLECTION: 'tasks',
    MATERIALS_COLLECTION: 'materials',
    PROCESSES_COLLECTION: 'processes',
    
    // Admin Collections
    ADMIN_SETTINGS_COLLECTION: 'adminSettings',
    ADMIN_SETTINGS_AUDIT_COLLECTION: 'adminSettingsAudit',
    
    // Additional Collections
    COLLECTORS_COLLECTION: 'collectors',
    CONTACT_REQUESTS_COLLECTION: 'contactRequests',
    CUSTOM_TICKETS_COLLECTION: 'customTickets',
    INVENTORY_COLLECTION: 'inventory',
    
    // Legacy/Compatibility (to be phased out)
    REPAIRTASKS_COLLECTION: 'repairTasks', // Use TASKS_COLLECTION instead
    
    // Default Projections
    DEFAULT_PROJECTION: {
        _id: 0,
    },
    PUBLIC_USER_PROJECTION: {
        password: 0,
        verificationToken: 0,
        resetToken: 0,
        resetTokenExpiry: 0
    },
};

export default Constants;
