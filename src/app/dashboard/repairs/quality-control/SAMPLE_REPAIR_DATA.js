/**
 * Sample Repair Object for Quality Control Testing
 * This represents a repair that has completed work and is ready for QC review
 */

export const SAMPLE_QC_REPAIR = {
    // Core identification
    _id: "675a1b2c3d4e5f6789abcdef",
    repairID: "RPR-2025-08-001",
    orderNumber: "EFD-20250808-001",
    
    // Customer information
    customerInfo: {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@email.com",
        phone: "(555) 123-4567"
    },
    
    // Client details
    userID: "user_sarah_johnson_123",
    clientName: "Sarah Johnson",
    businessName: null, // Retail customer, not wholesale
    
    // Item details
    itemDetails: {
        description: "14K Yellow Gold Wedding Band - Resize and Polish",
        type: "ring",
        metal: "14K Yellow Gold",
        size: "6.5",
        weight: "4.2g"
    },
    description: "Customer's wedding band needs to be sized from 7 to 6.5 and professionally polished",
    
    // Work completed
    tasks: [
        {
            id: "task-001",
            name: "Ring Sizing Down",
            description: "Resize ring from size 7 to 6.5",
            price: 45.00,
            quantity: 1,
            status: "completed",
            completedBy: "Mike Wilson",
            completedAt: "2025-08-08T14:30:00.000Z",
            timeSpent: 45, // minutes
            notes: "Removed 1.2mm material, filed and rounded perfectly"
        }
    ],
    
    processes: [
        {
            id: "process-001",
            displayName: "Professional Polish",
            description: "Full professional polish and shine",
            price: 25.00,
            quantity: 1,
            status: "completed",
            completedBy: "Jennifer Smith", 
            completedAt: "2025-08-08T15:15:00.000Z",
            timeSpent: 20, // minutes
            notes: "Polished to mirror finish, removed all scratches"
        }
    ],
    
    materials: [
        {
            id: "material-001",
            name: "Polishing Compound",
            description: "Professional jewelry polishing compound",
            price: 2.50,
            quantity: 1,
            status: "used",
            usedBy: "Jennifer Smith"
        }
    ],
    
    customLineItems: [
        {
            id: "custom-001",
            description: "Stone Tightening (2 small diamonds)",
            price: 15.00,
            quantity: 1,
            status: "completed",
            completedBy: "Mike Wilson",
            notes: "Both prongs tightened, stones secure"
        }
    ],
    
    // Pricing breakdown
    subtotal: 87.50,
    rushFee: 0,
    deliveryFee: 0, // Customer pickup
    taxAmount: 8.31, // 9.5% on subtotal
    taxRate: 0.095,
    totalCost: 95.81,
    
    // Pricing flags
    isWholesale: false,
    includeDelivery: false, // Customer pickup
    includeTax: true,
    isRush: false,
    
    // Workflow tracking
    assignedJeweler: "Mike Wilson",
    partsOrderedBy: null, // No parts needed
    qcBy: null, // Will be assigned during QC
    
    // Status and timing
    status: "quality_control", // Ready for QC review
    priority: "medium",
    promiseDate: "2025-08-10T17:00:00.000Z",
    estimatedCompletionDays: 2,
    
    // Timestamps
    createdAt: "2025-08-06T09:00:00.000Z",
    updatedAt: "2025-08-08T15:30:00.000Z",
    completedWorkAt: "2025-08-08T15:15:00.000Z", // When work was finished
    
    // Work history
    workHistory: [
        {
            action: "created",
            timestamp: "2025-08-06T09:00:00.000Z",
            by: "Front Desk - Rebecca",
            notes: "Initial repair intake"
        },
        {
            action: "assigned",
            timestamp: "2025-08-06T10:30:00.000Z",
            by: "Shop Manager",
            assignedTo: "Mike Wilson",
            notes: "Assigned to Mike for sizing work"
        },
        {
            action: "work_started",
            timestamp: "2025-08-08T14:00:00.000Z",
            by: "Mike Wilson",
            notes: "Started ring sizing process"
        },
        {
            action: "work_completed",
            timestamp: "2025-08-08T15:15:00.000Z",
            by: "Jennifer Smith",
            notes: "All work completed, moved to QC"
        }
    ],
    
    // Media
    pictures: [
        {
            id: "pic-001",
            url: "/uploads/1733760000000-before-repair.jpg",
            type: "before",
            uploadedAt: "2025-08-06T09:00:00.000Z",
            uploadedBy: "Front Desk - Rebecca",
            description: "Ring condition upon intake"
        }
    ],
    
    // QC data (empty - will be filled during QC process)
    qcData: null,
    
    // Customer preferences
    customerPreferences: {
        notificationMethod: "email",
        pickupContactNumber: "(555) 123-4567",
        specialInstructions: "Please call before ready for pickup"
    },
    
    // Internal notes
    internalNotes: [
        {
            id: "note-001",
            timestamp: "2025-08-06T09:05:00.000Z",
            by: "Rebecca - Front Desk",
            note: "Customer mentioned ring is family heirloom, handle with extra care",
            priority: "high"
        },
        {
            id: "note-002", 
            timestamp: "2025-08-08T14:30:00.000Z",
            by: "Mike Wilson",
            note: "Sizing went perfectly, no issues with material",
            priority: "normal"
        }
    ]
};

export default SAMPLE_QC_REPAIR;
