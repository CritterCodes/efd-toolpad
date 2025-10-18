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
    
    // Artisan Application Constants
    ARTISAN_TYPES: [
        'Jeweler',
        'Gem Cutter', 
        'CAD Designer',
        'Hand Engraver'
    ],
    
    SPECIALTIES_SUGGESTIONS: [
        'Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Brooches', 'Pendants',
        'Custom Designs', 'Vintage Restoration', 'Stone Setting', 'Engraving',
        'Chain Making', 'Enameling'
    ],
    
    SERVICES_SUGGESTIONS: [
        'Custom Design', 'Jewelry Repair', 'Stone Setting', 'Engraving',
        'Resizing', 'Restoration', 'Appraisal', 'Consultation',
        'Education/Classes', 'Stone Cutting', 'Metal Fabrication'
    ],
    
    MATERIALS_SUGGESTIONS: [
        'Gold', 'Silver', 'Platinum', 'Palladium', 'Copper', 'Brass',
        'Precious Stones', 'Semi-Precious Stones', 'Pearls', 'Alternative Materials'
    ],
    
    TECHNIQUES_SUGGESTIONS: [
        'Hand Fabrication', 'Lost Wax Casting', 'Stone Setting', 'Engraving',
        'Enameling', 'Granulation', 'Filigree', 'Repoussé', 'Chain Making',
        'Wire Wrapping', 'Electroforming', 'CAD/CAM'
    ],
};

export default Constants;
