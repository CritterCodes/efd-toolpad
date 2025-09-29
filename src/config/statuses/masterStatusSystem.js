/**
 * MASTER STATUS DEFINITION SYSTEM
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all custom ticket statuses.
 * It defines internal statuses, client-facing statuses, workflow transitions,
 * and status metadata in one place to prevent status system confusion.
 * 
 * DO NOT MODIFY WITHOUT UPDATING ALL STATUS REFERENCES
 */

/**
 * INTERNAL STATUSES - What we track internally for workflow management
 * These are granular and specific to our business processes
 */
export const INTERNAL_STATUSES = {
  // === INITIAL PHASE ===
  PENDING: 'pending',                           // Just received, needs first review
  REVIEWING_REQUEST: 'reviewing-request',       // Admin reviewing initial request
  IN_CONSULTATION: 'in-consultation',           // Actively discussing with client
  AWAITING_CLIENT_INFO: 'awaiting-client-info', // Need more info from client
  
  // === DESIGN PHASE ===
  SKETCHING: 'sketching',                       // Creating initial sketches
  SKETCH_REVIEW: 'sketch-review',               // Client reviewing sketches
  SKETCH_APPROVED: 'sketch-approved',           // Sketches approved, moving to CAD
  
  CREATING_CAD: 'creating-cad',                 // Creating 3D CAD model
  CAD_REVIEW: 'cad-review',                     // Client reviewing CAD
  CAD_REVISION: 'cad-revision',                 // Making CAD changes
  CAD_APPROVED: 'cad-approved',                 // CAD approved, ready for quote
  
  // === QUOTING & APPROVAL PHASE ===
  PREPARING_QUOTE: 'preparing-quote',           // Creating price quote
  QUOTE_SENT: 'quote-sent',                     // Quote sent to client
  QUOTE_REVISION: 'quote-revision',             // Revising quote
  QUOTE_APPROVED: 'quote-approved',             // Quote approved by client
  
  // === PAYMENT PHASE ===
  DEPOSIT_INVOICE_SENT: 'deposit-invoice-sent', // Deposit invoice sent
  DEPOSIT_RECEIVED: 'deposit-received',         // Deposit payment received
  
  // === PRODUCTION PREPARATION ===
  ORDERING_MATERIALS: 'ordering-materials',     // Ordering stones/metals
  MATERIALS_RECEIVED: 'materials-received',     // Materials arrived
  READY_FOR_PRODUCTION: 'ready-for-production', // Ready to start making
  
  // === PRODUCTION PHASE ===
  IN_PRODUCTION: 'in-production',               // General production status
  CASTING: 'casting',                           // Casting metal
  SETTING_STONES: 'setting-stones',             // Setting gemstones
  POLISHING: 'polishing',                       // Final polishing
  QUALITY_CHECK: 'quality-check',               // Quality control check
  
  // === FINAL PAYMENT & COMPLETION ===
  FINAL_PAYMENT_SENT: 'final-payment-sent',    // Final invoice sent
  PAID_IN_FULL: 'paid-in-full',                // Full payment received
  READY_FOR_PICKUP: 'ready-for-pickup',        // Ready for client pickup
  SHIPPED: 'shipped',                           // Shipped to client
  DELIVERED: 'delivered',                       // Delivered to client
  COMPLETED: 'completed',                       // Project fully complete
  
  // === SPECIAL STATUSES ===
  ON_HOLD: 'on-hold',                          // Project paused
  CANCELLED: 'cancelled',                       // Project cancelled
  REFUNDED: 'refunded'                         // Refund processed
};

/**
 * CLIENT-FACING STATUSES - What clients see (simplified)
 * These group internal statuses into client-friendly categories
 */
export const CLIENT_STATUSES = {
  PENDING_REVIEW: 'pending-review',
  IN_CONSULTATION: 'in-consultation', 
  AWAITING_YOUR_RESPONSE: 'awaiting-your-response',
  IN_DESIGN: 'in-design',
  QUOTE_PENDING: 'quote-pending',
  PAYMENT_PENDING: 'payment-pending',
  IN_PRODUCTION: 'in-production',
  READY_FOR_DELIVERY: 'ready-for-delivery',
  COMPLETED: 'completed',
  ON_HOLD: 'on-hold',
  CANCELLED: 'cancelled'
};

/**
 * INTERNAL TO CLIENT STATUS MAPPING
 * Maps each internal status to what the client should see
 */
export const INTERNAL_TO_CLIENT_MAPPING = {
  [INTERNAL_STATUSES.PENDING]: CLIENT_STATUSES.PENDING_REVIEW,
  [INTERNAL_STATUSES.REVIEWING_REQUEST]: CLIENT_STATUSES.PENDING_REVIEW,
  [INTERNAL_STATUSES.IN_CONSULTATION]: CLIENT_STATUSES.IN_CONSULTATION,
  [INTERNAL_STATUSES.AWAITING_CLIENT_INFO]: CLIENT_STATUSES.AWAITING_YOUR_RESPONSE,
  
  [INTERNAL_STATUSES.SKETCHING]: CLIENT_STATUSES.IN_DESIGN,
  [INTERNAL_STATUSES.SKETCH_REVIEW]: CLIENT_STATUSES.AWAITING_YOUR_RESPONSE,
  [INTERNAL_STATUSES.SKETCH_APPROVED]: CLIENT_STATUSES.IN_DESIGN,
  [INTERNAL_STATUSES.CREATING_CAD]: CLIENT_STATUSES.IN_DESIGN,
  [INTERNAL_STATUSES.CAD_REVIEW]: CLIENT_STATUSES.AWAITING_YOUR_RESPONSE,
  [INTERNAL_STATUSES.CAD_REVISION]: CLIENT_STATUSES.IN_DESIGN,
  [INTERNAL_STATUSES.CAD_APPROVED]: CLIENT_STATUSES.IN_DESIGN,
  
  [INTERNAL_STATUSES.PREPARING_QUOTE]: CLIENT_STATUSES.QUOTE_PENDING,
  [INTERNAL_STATUSES.QUOTE_SENT]: CLIENT_STATUSES.AWAITING_YOUR_RESPONSE,
  [INTERNAL_STATUSES.QUOTE_REVISION]: CLIENT_STATUSES.QUOTE_PENDING,
  [INTERNAL_STATUSES.QUOTE_APPROVED]: CLIENT_STATUSES.PAYMENT_PENDING,
  
  [INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT]: CLIENT_STATUSES.PAYMENT_PENDING,
  [INTERNAL_STATUSES.DEPOSIT_RECEIVED]: CLIENT_STATUSES.IN_PRODUCTION,
  
  [INTERNAL_STATUSES.ORDERING_MATERIALS]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.MATERIALS_RECEIVED]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.READY_FOR_PRODUCTION]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.IN_PRODUCTION]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.CASTING]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.SETTING_STONES]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.POLISHING]: CLIENT_STATUSES.IN_PRODUCTION,
  [INTERNAL_STATUSES.QUALITY_CHECK]: CLIENT_STATUSES.IN_PRODUCTION,
  
  [INTERNAL_STATUSES.FINAL_PAYMENT_SENT]: CLIENT_STATUSES.PAYMENT_PENDING,
  [INTERNAL_STATUSES.PAID_IN_FULL]: CLIENT_STATUSES.READY_FOR_DELIVERY,
  [INTERNAL_STATUSES.READY_FOR_PICKUP]: CLIENT_STATUSES.READY_FOR_DELIVERY,
  [INTERNAL_STATUSES.SHIPPED]: CLIENT_STATUSES.READY_FOR_DELIVERY,
  [INTERNAL_STATUSES.DELIVERED]: CLIENT_STATUSES.COMPLETED,
  [INTERNAL_STATUSES.COMPLETED]: CLIENT_STATUSES.COMPLETED,
  
  [INTERNAL_STATUSES.ON_HOLD]: CLIENT_STATUSES.ON_HOLD,
  [INTERNAL_STATUSES.CANCELLED]: CLIENT_STATUSES.CANCELLED,
  [INTERNAL_STATUSES.REFUNDED]: CLIENT_STATUSES.CANCELLED
};

/**
 * STATUS DISPLAY INFORMATION
 * Human-readable labels, descriptions, colors, and icons
 */
export const STATUS_DISPLAY_INFO = {
  // Internal Status Display Info
  [INTERNAL_STATUSES.PENDING]: {
    label: 'Pending Review',
    description: 'Request received, awaiting initial review',
    color: 'warning',
    icon: '⏳',
    category: 'initial',
    requiresAction: true
  },
  [INTERNAL_STATUSES.REVIEWING_REQUEST]: {
    label: 'Reviewing Request',
    description: 'Admin reviewing request details',
    color: 'info',
    icon: '👀',
    category: 'initial',
    requiresAction: true
  },
  [INTERNAL_STATUSES.IN_CONSULTATION]: {
    label: 'In Consultation',
    description: 'Discussing requirements with client',
    color: 'info',
    icon: '💬',
    category: 'initial',
    requiresAction: false
  },
  [INTERNAL_STATUSES.AWAITING_CLIENT_INFO]: {
    label: 'Awaiting Client Info',
    description: 'Waiting for additional information from client',
    color: 'warning',
    icon: '❓',
    category: 'initial',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.SKETCHING]: {
    label: 'Sketching',
    description: 'Creating initial design sketches',
    color: 'primary',
    icon: '✏️',
    category: 'design',
    requiresAction: true
  },
  [INTERNAL_STATUSES.SKETCH_REVIEW]: {
    label: 'Sketch Review',
    description: 'Client reviewing sketches',
    color: 'warning',
    icon: '🎨',
    category: 'design',
    requiresAction: false
  },
  [INTERNAL_STATUSES.SKETCH_APPROVED]: {
    label: 'Sketch Approved',
    description: 'Sketches approved, moving to CAD',
    color: 'success',
    icon: '✅',
    category: 'design',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.CREATING_CAD]: {
    label: 'Creating CAD',
    description: 'Creating 3D CAD model',
    color: 'primary',
    icon: '🖥️',
    category: 'design',
    requiresAction: true
  },
  [INTERNAL_STATUSES.CAD_REVIEW]: {
    label: 'CAD Review',
    description: 'Client reviewing 3D model',
    color: 'warning',
    icon: '🔍',
    category: 'design',
    requiresAction: false
  },
  [INTERNAL_STATUSES.CAD_REVISION]: {
    label: 'CAD Revision',
    description: 'Making changes to CAD model',
    color: 'warning',
    icon: '🔄',
    category: 'design',
    requiresAction: true
  },
  [INTERNAL_STATUSES.CAD_APPROVED]: {
    label: 'CAD Approved',
    description: 'CAD model approved, ready for quote',
    color: 'success',
    icon: '✅',
    category: 'design',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.PREPARING_QUOTE]: {
    label: 'Preparing Quote',
    description: 'Creating price quotation',
    color: 'info',
    icon: '💰',
    category: 'quote',
    requiresAction: true
  },
  [INTERNAL_STATUSES.QUOTE_SENT]: {
    label: 'Quote Sent',
    description: 'Price quote sent to client',
    color: 'info',
    icon: '📨',
    category: 'quote',
    requiresAction: false
  },
  [INTERNAL_STATUSES.QUOTE_REVISION]: {
    label: 'Quote Revision',
    description: 'Revising price quote',
    color: 'warning',
    icon: '📝',
    category: 'quote',
    requiresAction: true
  },
  [INTERNAL_STATUSES.QUOTE_APPROVED]: {
    label: 'Quote Approved',
    description: 'Quote approved by client',
    color: 'success',
    icon: '✅',
    category: 'quote',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT]: {
    label: 'Deposit Invoice Sent',
    description: 'Deposit invoice sent to client',
    color: 'warning',
    icon: '💸',
    category: 'payment',
    requiresAction: false
  },
  [INTERNAL_STATUSES.DEPOSIT_RECEIVED]: {
    label: 'Deposit Received',
    description: 'Deposit payment received',
    color: 'success',
    icon: '💰',
    category: 'payment',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.ORDERING_MATERIALS]: {
    label: 'Ordering Materials',
    description: 'Ordering stones and metals',
    color: 'primary',
    icon: '📦',
    category: 'preparation',
    requiresAction: true
  },
  [INTERNAL_STATUSES.MATERIALS_RECEIVED]: {
    label: 'Materials Received',
    description: 'All materials have arrived',
    color: 'success',
    icon: '📥',
    category: 'preparation',
    requiresAction: false
  },
  [INTERNAL_STATUSES.READY_FOR_PRODUCTION]: {
    label: 'Ready for Production',
    description: 'All materials ready, can start production',
    color: 'success',
    icon: '🚀',
    category: 'preparation',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.IN_PRODUCTION]: {
    label: 'In Production',
    description: 'Actively creating the piece',
    color: 'primary',
    icon: '🔨',
    category: 'production',
    requiresAction: true
  },
  [INTERNAL_STATUSES.CASTING]: {
    label: 'Casting',
    description: 'Casting the metal components',
    color: 'primary',
    icon: '⚗️',
    category: 'production',
    requiresAction: true
  },
  [INTERNAL_STATUSES.SETTING_STONES]: {
    label: 'Setting Stones',
    description: 'Setting gemstones into piece',
    color: 'primary',
    icon: '💎',
    category: 'production',
    requiresAction: true
  },
  [INTERNAL_STATUSES.POLISHING]: {
    label: 'Polishing',
    description: 'Final polishing and finishing',
    color: 'primary',
    icon: '✨',
    category: 'production',
    requiresAction: true
  },
  [INTERNAL_STATUSES.QUALITY_CHECK]: {
    label: 'Quality Check',
    description: 'Final quality control inspection',
    color: 'warning',
    icon: '🔍',
    category: 'production',
    requiresAction: true
  },
  
  [INTERNAL_STATUSES.FINAL_PAYMENT_SENT]: {
    label: 'Final Payment Sent',
    description: 'Final invoice sent to client',
    color: 'warning',
    icon: '💳',
    category: 'completion',
    requiresAction: false
  },
  [INTERNAL_STATUSES.PAID_IN_FULL]: {
    label: 'Paid in Full',
    description: 'Full payment received',
    color: 'success',
    icon: '💰',
    category: 'completion',
    requiresAction: false
  },
  [INTERNAL_STATUSES.READY_FOR_PICKUP]: {
    label: 'Ready for Pickup',
    description: 'Piece ready for client pickup',
    color: 'success',
    icon: '📍',
    category: 'completion',
    requiresAction: false
  },
  [INTERNAL_STATUSES.SHIPPED]: {
    label: 'Shipped',
    description: 'Shipped to client',
    color: 'info',
    icon: '🚚',
    category: 'completion',
    requiresAction: false
  },
  [INTERNAL_STATUSES.DELIVERED]: {
    label: 'Delivered',
    description: 'Successfully delivered to client',
    color: 'success',
    icon: '📦',
    category: 'completion',
    requiresAction: false
  },
  [INTERNAL_STATUSES.COMPLETED]: {
    label: 'Completed',
    description: 'Project fully complete',
    color: 'success',
    icon: '🎉',
    category: 'completion',
    requiresAction: false
  },
  
  [INTERNAL_STATUSES.ON_HOLD]: {
    label: 'On Hold',
    description: 'Project temporarily paused',
    color: 'default',
    icon: '⏸️',
    category: 'special',
    requiresAction: false
  },
  [INTERNAL_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    description: 'Project cancelled',
    color: 'error',
    icon: '❌',
    category: 'special',
    requiresAction: false
  },
  [INTERNAL_STATUSES.REFUNDED]: {
    label: 'Refunded',
    description: 'Payment refunded to client',
    color: 'error',
    icon: '💸',
    category: 'special',
    requiresAction: false
  },

  // Client Status Display Info
  [CLIENT_STATUSES.PENDING_REVIEW]: {
    label: 'Pending Review',
    description: 'Your request is being reviewed',
    color: 'warning',
    icon: '⏳'
  },
  [CLIENT_STATUSES.IN_CONSULTATION]: {
    label: 'In Consultation',
    description: 'We are discussing your project',
    color: 'info',
    icon: '💬'
  },
  [CLIENT_STATUSES.AWAITING_YOUR_RESPONSE]: {
    label: 'Awaiting Your Response',
    description: 'We need your input to continue',
    color: 'warning',
    icon: '❓'
  },
  [CLIENT_STATUSES.IN_DESIGN]: {
    label: 'In Design',
    description: 'We are creating your design',
    color: 'primary',
    icon: '🎨'
  },
  [CLIENT_STATUSES.QUOTE_PENDING]: {
    label: 'Quote Pending',
    description: 'We are preparing your quote',
    color: 'info',
    icon: '💰'
  },
  [CLIENT_STATUSES.PAYMENT_PENDING]: {
    label: 'Payment Pending',
    description: 'Payment required to continue',
    color: 'warning',
    icon: '💳'
  },
  [CLIENT_STATUSES.IN_PRODUCTION]: {
    label: 'In Production',
    description: 'Your piece is being created',
    color: 'primary',
    icon: '🔨'
  },
  [CLIENT_STATUSES.READY_FOR_DELIVERY]: {
    label: 'Ready for Delivery',
    description: 'Your piece is ready!',
    color: 'success',
    icon: '📦'
  },
  [CLIENT_STATUSES.COMPLETED]: {
    label: 'Completed',
    description: 'Project complete!',
    color: 'success',
    icon: '🎉'
  },
  [CLIENT_STATUSES.ON_HOLD]: {
    label: 'On Hold',
    description: 'Project temporarily paused',
    color: 'default',
    icon: '⏸️'
  },
  [CLIENT_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    description: 'Project cancelled',
    color: 'error',
    icon: '❌'
  }
};

/**
 * WORKFLOW TRANSITIONS
 * Defines which statuses can transition to which other statuses
 */
export const VALID_TRANSITIONS = {
  [INTERNAL_STATUSES.PENDING]: [
    INTERNAL_STATUSES.REVIEWING_REQUEST,
    INTERNAL_STATUSES.IN_CONSULTATION,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.REVIEWING_REQUEST]: [
    INTERNAL_STATUSES.IN_CONSULTATION,
    INTERNAL_STATUSES.AWAITING_CLIENT_INFO,
    INTERNAL_STATUSES.SKETCHING,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.IN_CONSULTATION]: [
    INTERNAL_STATUSES.AWAITING_CLIENT_INFO,
    INTERNAL_STATUSES.SKETCHING,
    INTERNAL_STATUSES.PREPARING_QUOTE,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.AWAITING_CLIENT_INFO]: [
    INTERNAL_STATUSES.IN_CONSULTATION,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.SKETCHING]: [
    INTERNAL_STATUSES.SKETCH_REVIEW,
    INTERNAL_STATUSES.PREPARING_QUOTE,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.SKETCH_REVIEW]: [
    INTERNAL_STATUSES.SKETCH_APPROVED,
    INTERNAL_STATUSES.SKETCHING,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.SKETCH_APPROVED]: [
    INTERNAL_STATUSES.CREATING_CAD,
    INTERNAL_STATUSES.PREPARING_QUOTE,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.CREATING_CAD]: [
    INTERNAL_STATUSES.CAD_REVIEW,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.CAD_REVIEW]: [
    INTERNAL_STATUSES.CAD_APPROVED,
    INTERNAL_STATUSES.CAD_REVISION,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.CAD_REVISION]: [
    INTERNAL_STATUSES.CAD_REVIEW,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.CAD_APPROVED]: [
    INTERNAL_STATUSES.PREPARING_QUOTE,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.PREPARING_QUOTE]: [
    INTERNAL_STATUSES.QUOTE_SENT,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.QUOTE_SENT]: [
    INTERNAL_STATUSES.QUOTE_APPROVED,
    INTERNAL_STATUSES.QUOTE_REVISION,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.QUOTE_REVISION]: [
    INTERNAL_STATUSES.QUOTE_SENT,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.QUOTE_APPROVED]: [
    INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT,
    INTERNAL_STATUSES.ORDERING_MATERIALS,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT]: [
    INTERNAL_STATUSES.DEPOSIT_RECEIVED,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.DEPOSIT_RECEIVED]: [
    INTERNAL_STATUSES.ORDERING_MATERIALS,
    INTERNAL_STATUSES.READY_FOR_PRODUCTION,
    INTERNAL_STATUSES.IN_PRODUCTION,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.ORDERING_MATERIALS]: [
    INTERNAL_STATUSES.MATERIALS_RECEIVED,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.MATERIALS_RECEIVED]: [
    INTERNAL_STATUSES.READY_FOR_PRODUCTION,
    INTERNAL_STATUSES.IN_PRODUCTION,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.READY_FOR_PRODUCTION]: [
    INTERNAL_STATUSES.IN_PRODUCTION,
    INTERNAL_STATUSES.CASTING,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.IN_PRODUCTION]: [
    INTERNAL_STATUSES.CASTING,
    INTERNAL_STATUSES.SETTING_STONES,
    INTERNAL_STATUSES.POLISHING,
    INTERNAL_STATUSES.QUALITY_CHECK,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.CASTING]: [
    INTERNAL_STATUSES.SETTING_STONES,
    INTERNAL_STATUSES.POLISHING,
    INTERNAL_STATUSES.QUALITY_CHECK,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.SETTING_STONES]: [
    INTERNAL_STATUSES.POLISHING,
    INTERNAL_STATUSES.QUALITY_CHECK,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.POLISHING]: [
    INTERNAL_STATUSES.QUALITY_CHECK,
    INTERNAL_STATUSES.FINAL_PAYMENT_SENT,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.QUALITY_CHECK]: [
    INTERNAL_STATUSES.FINAL_PAYMENT_SENT,
    INTERNAL_STATUSES.PAID_IN_FULL,
    INTERNAL_STATUSES.READY_FOR_PICKUP,
    INTERNAL_STATUSES.POLISHING, // Back to polishing if issues found
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.FINAL_PAYMENT_SENT]: [
    INTERNAL_STATUSES.PAID_IN_FULL,
    INTERNAL_STATUSES.ON_HOLD,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.PAID_IN_FULL]: [
    INTERNAL_STATUSES.READY_FOR_PICKUP,
    INTERNAL_STATUSES.SHIPPED,
    INTERNAL_STATUSES.DELIVERED,
    INTERNAL_STATUSES.COMPLETED
  ],
  [INTERNAL_STATUSES.READY_FOR_PICKUP]: [
    INTERNAL_STATUSES.DELIVERED,
    INTERNAL_STATUSES.COMPLETED
  ],
  [INTERNAL_STATUSES.SHIPPED]: [
    INTERNAL_STATUSES.DELIVERED,
    INTERNAL_STATUSES.COMPLETED
  ],
  [INTERNAL_STATUSES.DELIVERED]: [
    INTERNAL_STATUSES.COMPLETED
  ],
  [INTERNAL_STATUSES.COMPLETED]: [],
  [INTERNAL_STATUSES.ON_HOLD]: [
    INTERNAL_STATUSES.IN_CONSULTATION,
    INTERNAL_STATUSES.SKETCHING,
    INTERNAL_STATUSES.CREATING_CAD,
    INTERNAL_STATUSES.PREPARING_QUOTE,
    INTERNAL_STATUSES.IN_PRODUCTION,
    INTERNAL_STATUSES.CANCELLED
  ],
  [INTERNAL_STATUSES.CANCELLED]: [
    INTERNAL_STATUSES.REFUNDED
  ],
  [INTERNAL_STATUSES.REFUNDED]: []
};

/**
 * STATUS MANAGEMENT CLASS
 * Provides all status-related functionality in one place
 */
export class CustomTicketStatusManager {
  /**
   * Get display information for any status
   */
  static getDisplayInfo(status, isInternal = true) {
    return STATUS_DISPLAY_INFO[status] || null;
  }

  /**
   * Convert internal status to client-facing status
   */
  static getClientStatus(internalStatus) {
    return INTERNAL_TO_CLIENT_MAPPING[internalStatus] || CLIENT_STATUSES.PENDING_REVIEW;
  }

  /**
   * Get all possible next statuses for a given current status (ENHANCED)
   * This provides more flexible transitions based on phases
   */
  static getNextPossibleStatuses(currentStatus) {
    const currentInfo = STATUS_DISPLAY_INFO[currentStatus];
    if (!currentInfo) return [];

    const currentPhase = currentInfo.category;
    const possibleStatuses = new Set();

    // 1. Add strict workflow transitions (original logic)
    const strictTransitions = VALID_TRANSITIONS[currentStatus] || [];
    strictTransitions.forEach(status => possibleStatuses.add(status));

    // 2. Add all statuses from the current phase
    Object.entries(STATUS_DISPLAY_INFO).forEach(([status, info]) => {
      if (info.category === currentPhase && status !== currentStatus) {
        possibleStatuses.add(status);
      }
    });

    // 3. Add general statuses (always available)
    const generalStatuses = [
      INTERNAL_STATUSES.AWAITING_CLIENT_INFO,
      INTERNAL_STATUSES.ON_HOLD,
      INTERNAL_STATUSES.CANCELLED
    ];
    generalStatuses.forEach(status => possibleStatuses.add(status));

    // 4. Add entry points to next phases
    const phaseEntryPoints = this.getPhaseEntryPoints(currentPhase);
    phaseEntryPoints.forEach(status => possibleStatuses.add(status));

    // 5. Add entry points to previous phases (for flexibility)
    const previousPhaseEntryPoints = this.getPreviousPhaseEntryPoints(currentPhase);
    previousPhaseEntryPoints.forEach(status => possibleStatuses.add(status));

    // Convert back to array and sort logically
    return Array.from(possibleStatuses).sort((a, b) => {
      const aInfo = STATUS_DISPLAY_INFO[a];
      const bInfo = STATUS_DISPLAY_INFO[b];
      
      // Sort by category order, then by status order within category
      const categoryOrder = ['initial', 'design', 'quote', 'payment', 'preparation', 'production', 'completion', 'special'];
      const aCategoryIndex = categoryOrder.indexOf(aInfo.category);
      const bCategoryIndex = categoryOrder.indexOf(bInfo.category);
      
      if (aCategoryIndex !== bCategoryIndex) {
        return aCategoryIndex - bCategoryIndex;
      }
      
      // Within same category, sort alphabetically
      return aInfo.label.localeCompare(bInfo.label);
    });
  }

  /**
   * Get entry point statuses for the next phases
   */
  static getPhaseEntryPoints(currentPhase) {
    const phaseProgression = {
      'initial': ['design', 'quote'], // Can jump to design or directly to quote
      'design': ['quote', 'payment'], // Can move to quote or skip to payment
      'quote': ['payment', 'preparation'], // Can move to payment or preparation
      'payment': ['preparation', 'production'], // Can move to prep or production
      'preparation': ['production'], // Can move to production
      'production': ['completion'], // Can move to completion
      'completion': [], // Final phase
      'special': [] // Special statuses don't progress
    };

    const nextPhases = phaseProgression[currentPhase] || [];
    const entryPoints = [];

    nextPhases.forEach(phase => {
      // Get the first/main status of each next phase
      const phaseStatuses = Object.entries(STATUS_DISPLAY_INFO)
        .filter(([_, info]) => info.category === phase)
        .map(([status]) => status);

      if (phaseStatuses.length > 0) {
        // Add the typical entry points for each phase
        switch (phase) {
          case 'design':
            entryPoints.push(INTERNAL_STATUSES.SKETCHING);
            break;
          case 'quote':
            entryPoints.push(INTERNAL_STATUSES.PREPARING_QUOTE);
            break;
          case 'payment':
            entryPoints.push(INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT);
            break;
          case 'preparation':
            entryPoints.push(INTERNAL_STATUSES.ORDERING_MATERIALS);
            break;
          case 'production':
            entryPoints.push(INTERNAL_STATUSES.IN_PRODUCTION);
            break;
          case 'completion':
            entryPoints.push(INTERNAL_STATUSES.FINAL_PAYMENT_SENT);
            break;
        }
      }
    });

    return entryPoints;
  }

  /**
   * Get entry point statuses for previous phases (for going back)
   */
  static getPreviousPhaseEntryPoints(currentPhase) {
    const phaseProgression = {
      'design': ['initial'],
      'quote': ['initial', 'design'],
      'payment': ['quote'],
      'preparation': ['payment'],
      'production': ['preparation'],
      'completion': ['production'],
      'initial': [],
      'special': []
    };

    const previousPhases = phaseProgression[currentPhase] || [];
    const entryPoints = [];

    previousPhases.forEach(phase => {
      switch (phase) {
        case 'initial':
          entryPoints.push(INTERNAL_STATUSES.IN_CONSULTATION);
          break;
        case 'design':
          entryPoints.push(INTERNAL_STATUSES.SKETCHING);
          break;
        case 'quote':
          entryPoints.push(INTERNAL_STATUSES.PREPARING_QUOTE);
          break;
        case 'payment':
          entryPoints.push(INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT);
          break;
        case 'preparation':
          entryPoints.push(INTERNAL_STATUSES.ORDERING_MATERIALS);
          break;
        case 'production':
          entryPoints.push(INTERNAL_STATUSES.IN_PRODUCTION);
          break;
      }
    });

    return entryPoints;
  }

  /**
   * Check if a status transition is valid (ENHANCED)
   * More permissive than before - allows phase-based transitions
   */
  static isValidTransition(fromStatus, toStatus) {
    // Allow any transition that appears in the possible statuses
    const possibleStatuses = this.getNextPossibleStatuses(fromStatus);
    return possibleStatuses.includes(toStatus);
  }

  /**
   * Get statuses grouped by phases for organized display
   */
  static getStatusesByPhases() {
    const phases = {
      initial: [],
      design: [],
      quote: [],
      payment: [],
      preparation: [],
      production: [],
      completion: [],
      special: []
    };

    Object.entries(STATUS_DISPLAY_INFO).forEach(([status, info]) => {
      if (phases[info.category]) {
        phases[info.category].push({
          status,
          label: info.label,
          description: info.description,
          requiresAction: info.requiresAction
        });
      }
    });

    return phases;
  }

  /**
   * Get all statuses by category
   */
  static getStatusesByCategory(category) {
    return Object.entries(STATUS_DISPLAY_INFO)
      .filter(([_, info]) => info.category === category)
      .map(([status]) => status);
  }

  /**
   * Get all statuses that require action
   */
  static getActionRequiredStatuses() {
    return Object.entries(STATUS_DISPLAY_INFO)
      .filter(([_, info]) => info.requiresAction)
      .map(([status]) => status);
  }

  /**
   * Get all internal statuses as array
   */
  static getAllInternalStatuses() {
    return Object.values(INTERNAL_STATUSES);
  }

  /**
   * Get all client statuses as array
   */
  static getAllClientStatuses() {
    return Object.values(CLIENT_STATUSES);
  }

  /**
   * Get workflow categories in order
   */
  static getWorkflowCategories() {
    return ['initial', 'design', 'quote', 'payment', 'preparation', 'production', 'completion', 'special'];
  }

  /**
   * Get current workflow stage from status
   */
  static getWorkflowStage(status) {
    const info = this.getDisplayInfo(status);
    return info?.category || 'unknown';
  }

  /**
   * Get phase-friendly name
   */
  static getPhaseName(category) {
    const phaseNames = {
      'initial': 'Initial Review',
      'design': 'Design Process',
      'quote': 'Quote & Approval',
      'payment': 'Payment Processing',
      'preparation': 'Production Preparation',
      'production': 'Production',
      'completion': 'Completion',
      'special': 'Special Actions'
    };
    return phaseNames[category] || category;
  }
}

// Export everything for easy importing
export default CustomTicketStatusManager;