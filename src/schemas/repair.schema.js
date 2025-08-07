/**
 * Repair Schema - Updated for v2 with comprehensive fields
 * Accommodates modern repair workflow with tasks, processes, materials, and custom line items
 */

export const repairSchema = {
  // Unique identifier
  repairID: {
    type: 'string',
    required: true,
    unique: true,
    description: 'Unique repair identifier (UUID)'
  },

  // Client information
  userID: {
    type: 'string',
    required: true,
    description: 'Client user ID'
  },
  clientName: {
    type: 'string',
    required: true,
    description: 'Client full name'
  },
  businessName: {
    type: 'string',
    default: '',
    description: 'Business name for wholesale clients'
  },

  // Basic repair information
  description: {
    type: 'string',
    required: true,
    description: 'Repair description/work to be done'
  },
  isRush: {
    type: 'boolean',
    default: false,
    description: 'Whether this is a rush job requiring expedited service'
  },
  promiseDate: {
    type: 'date',
    required: true,
    description: 'Promised completion date'
  },
  
  // Item details
  metalType: {
    type: 'string',
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'brass', 'copper', 'titanium', 'other'],
    description: 'Base metal type'
  },
  karat: {
    type: 'string',
    description: 'Metal purity/karat (10k, 14k, 18k, 925, 950, etc.)'
  },
  
  // Ring-specific fields
  isRing: {
    type: 'boolean',
    default: false,
    description: 'Whether this item is a ring (enables sizing fields)'
  },
  currentRingSize: {
    type: 'string',
    description: 'Current ring size (if applicable)'
  },
  desiredRingSize: {
    type: 'string',
    description: 'Desired ring size for sizing repairs'
  },

  // Notes and documentation
  notes: {
    type: 'string',
    description: 'Customer-facing notes and instructions'
  },
  internalNotes: {
    type: 'string',
    description: 'Internal team notes, not visible to customer'
  },

  // Work items - flexible structure to accommodate different item types
  tasks: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        taskId: { type: 'string', description: 'Reference to tasks collection' },
        title: { type: 'string', required: true },
        description: { type: 'string' },
        quantity: { type: 'number', default: 1, min: 1 },
        price: { type: 'number', default: 0, min: 0 },
        sku: { type: 'string' },
        category: { type: 'string' }
      }
    },
    description: 'Predefined tasks/services to be performed'
  },

  processes: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        processId: { type: 'string', description: 'Reference to processes collection' },
        displayName: { type: 'string', required: true },
        description: { type: 'string' },
        quantity: { type: 'number', default: 1, min: 1 },
        price: { type: 'number', default: 0, min: 0 },
        laborHours: { type: 'number', default: 0 },
        skillLevel: { type: 'string', enum: ['basic', 'standard', 'advanced', 'expert'] }
      }
    },
    description: 'Individual processes to be performed'
  },

  materials: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        materialId: { type: 'string', description: 'Reference to materials collection' },
        name: { type: 'string', required: true },
        description: { type: 'string' },
        quantity: { type: 'number', default: 1, min: 0 },
        price: { type: 'number', default: 0, min: 0 },
        unitType: { type: 'string', enum: ['piece', 'gram', 'ounce', 'inch', 'foot'] },
        category: { type: 'string' }
      }
    },
    description: 'Materials to be used in the repair'
  },

  customLineItems: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        description: { type: 'string', required: true },
        quantity: { type: 'number', default: 1, min: 1 },
        price: { type: 'number', default: 0, min: 0 }
      }
    },
    description: 'Custom work items not in predefined lists'
  },

  // Pricing
  isWholesale: {
    type: 'boolean',
    default: false,
    description: 'Whether wholesale pricing applies (50% discount)'
  },
  totalCost: {
    type: 'number',
    default: 0,
    min: 0,
    description: 'Total repair cost including all items'
  },
  
  // Detailed pricing breakdown
  subtotal: {
    type: 'number',
    default: 0,
    min: 0,
    description: 'Subtotal before delivery, rush fees, and tax'
  },
  rushFee: {
    type: 'number',
    default: 0,
    min: 0,
    description: 'Rush job additional fee'
  },
  deliveryFee: {
    type: 'number',
    default: 0,
    min: 0,
    description: 'Delivery/shipping fee'
  },
  taxAmount: {
    type: 'number',
    default: 0,
    min: 0,
    description: 'Tax amount charged'
  },
  taxRate: {
    type: 'number',
    default: 0,
    min: 0,
    max: 1,
    description: 'Tax rate applied (as decimal, e.g., 0.0875 for 8.75%)'
  },
  includeDelivery: {
    type: 'boolean',
    default: false,
    description: 'Whether delivery fee was included'
  },
  includeTax: {
    type: 'boolean',
    default: false,
    description: 'Whether tax was applied to this repair'
  },

  // Status and workflow
  status: {
    type: 'string',
    default: 'pending',
    enum: [
      'pending',      // Just created, waiting to start
      'in-progress',  // Work has begun
      'waiting',      // Waiting for parts/customer approval
      'quality-control', // In QC review
      'completed',    // Work finished
      'ready',        // Ready for pickup
      'picked-up',    // Customer has picked up
      'cancelled'     // Repair was cancelled
    ],
    description: 'Current repair status'
  },

  // Workflow tracking fields
  assignedJeweler: {
    type: 'string',
    default: '',
    description: 'Name of the jeweler assigned to work on this repair'
  },
  partsOrderedBy: {
    type: 'string',
    default: '',
    description: 'Name of who ordered the parts'
  },
  partsOrderedDate: {
    type: 'date',
    description: 'Date when parts were ordered'
  },
  completedBy: {
    type: 'string',
    default: '',
    description: 'Name of who completed the repair work'
  },
  qcBy: {
    type: 'string',
    default: '',
    description: 'Name of who performed quality control'
  },
  qcDate: {
    type: 'date',
    description: 'Date when QC was performed'
  },

  // Media
  picture: {
    type: 'string',
    description: 'Photo filename/path of the item'
  },
  beforePhotos: {
    type: 'array',
    default: [],
    items: { type: 'string' },
    description: 'Photos before repair work'
  },
  afterPhotos: {
    type: 'array',
    default: [],
    items: { type: 'string' },
    description: 'Photos after repair completion'
  },

  // Audit fields
  createdAt: {
    type: 'date',
    default: () => new Date(),
    description: 'When the repair was created'
  },
  updatedAt: {
    type: 'date',
    default: () => new Date(),
    description: 'When the repair was last modified'
  },
  completedAt: {
    type: 'date',
    description: 'When the repair was marked complete'
  },
  pickedUpAt: {
    type: 'date',
    description: 'When the item was picked up by customer'
  },

  // Team assignments
  assignedTo: {
    type: 'string',
    description: 'UserID of the person assigned to this repair'
  },
  completedBy: {
    type: 'string',
    description: 'UserID of the person who completed the repair'
  },

  // Legacy support
  repairTasks: {
    type: 'array',
    default: [],
    description: 'Legacy repair tasks field (deprecated, use tasks instead)'
  }
};

// Validation helper functions
export const validateRepairData = (data) => {
  const errors = [];
  
  // Required field validation
  if (!data.clientName || !data.clientName.trim()) {
    errors.push('Client name is required');
  }
  
  if (!data.description || !data.description.trim()) {
    errors.push('Repair description is required');
  }
  
  if (!data.promiseDate) {
    errors.push('Promise date is required');
  } else {
    const promiseDate = new Date(data.promiseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    if (promiseDate < today) {
      errors.push('Promise date cannot be in the past');
    }
  }
  
  // Ring size validation
  if (data.isRing && data.desiredRingSize && data.currentRingSize) {
    if (data.desiredRingSize === data.currentRingSize) {
      errors.push('Desired ring size must be different from current size for sizing repairs');
    }
  }
  
  // Cost validation
  if (data.totalCost !== undefined) {
    const cost = parseFloat(data.totalCost);
    if (isNaN(cost) || cost < 0) {
      errors.push('Total cost must be a valid positive number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to calculate total cost
export const calculateTotalCost = (repair, isWholesale = false) => {
  const tasksCost = (repair.tasks || []).reduce((sum, item) => 
    sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    
  const processesCost = (repair.processes || []).reduce((sum, item) => 
    sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    
  const materialsCost = (repair.materials || []).reduce((sum, item) => 
    sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    
  const customCost = (repair.customLineItems || []).reduce((sum, item) => 
    sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
  
  const subtotal = tasksCost + processesCost + materialsCost + customCost;
  return isWholesale ? subtotal * 0.5 : subtotal;
};

// Default repair object
export const defaultRepairData = {
  userID: '',
  clientName: '',
  description: '',
  isRush: false,
  promiseDate: '',
  metalType: '',
  karat: '',
  isRing: false,
  currentRingSize: '',
  desiredRingSize: '',
  notes: '',
  internalNotes: '',
  tasks: [],
  processes: [],
  materials: [],
  customLineItems: [],
  isWholesale: false,
  totalCost: 0,
  status: 'pending',
  picture: null,
  beforePhotos: [],
  afterPhotos: [],
  assignedTo: '',
  repairTasks: [] // Legacy support
};
