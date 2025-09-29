/**
 * Status Definitions Configuration
 * Detailed metadata for each internal status
 */

import { INTERNAL_STATUSES } from './internalStatuses.js';

export const STATUS_CATEGORIES = {
  INITIAL: 'initial',
  DESIGN: 'design',
  APPROVAL: 'approval', 
  PAYMENT: 'payment',
  PREPARATION: 'preparation',
  PRODUCTION: 'production',
  COMPLETION: 'completion',
  SPECIAL: 'special'
};

export const STATUS_DEFINITIONS = {
  [INTERNAL_STATUSES.PENDING]: {
    label: 'Pending Review',
    description: 'Request received, needs initial review',
    category: STATUS_CATEGORIES.INITIAL,
    color: 'warning',
    icon: '⏳',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.REVIEWING_REQUEST]: {
    label: 'Reviewing Request',
    description: 'Reviewing client info and requirements',
    category: STATUS_CATEGORIES.INITIAL,
    color: 'info',
    icon: '🔍',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.IN_CONSULTATION]: {
    label: 'In Consultation',
    description: 'Currently discussing requirements with client',
    category: STATUS_CATEGORIES.INITIAL,
    color: 'info',
    icon: '💬',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.CLIENT_CONSULTATION]: {
    label: 'Client Consultation',
    description: 'Speaking with client about request',
    category: STATUS_CATEGORIES.INITIAL,
    color: 'primary',
    icon: '💬',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.SKETCHING]: {
    label: 'Creating Sketch',
    description: 'Creating initial design sketch',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'primary',
    icon: '✏️',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.SKETCH_REVIEW]: {
    label: 'Sketch Review',
    description: 'Client reviewing sketch',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '👀',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.SKETCH_APPROVED]: {
    label: 'Sketch Approved',
    description: 'Sketch approved, ready for next phase',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.GENERATING_IMAGE]: {
    label: 'Generating Image',
    description: 'Creating detailed image from sketch',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'primary',
    icon: '🖼️',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.IMAGE_REVIEW]: {
    label: 'Image Review',
    description: 'Client reviewing generated image',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '🔍',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.IMAGE_APPROVED]: {
    label: 'Image Approved',
    description: 'Image approved, ready for CAD',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.IN_CAD]: {
    label: 'CAD Design',
    description: 'Creating CAD design',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'primary',
    icon: '🎨',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.CAD_REVIEW]: {
    label: 'CAD Review',
    description: 'Client reviewing CAD design',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '👀',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.CAD_APPROVED]: {
    label: 'CAD Approved',
    description: 'CAD design approved',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.CAD_REVISION]: {
    label: 'CAD Revision',
    description: 'Making CAD revisions',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'warning',
    icon: '🔄',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.PREPARING_QUOTE]: {
    label: 'Preparing Quote',
    description: 'Creating price quote',
    category: STATUS_CATEGORIES.INITIAL,
    color: 'info',
    icon: '💰',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.QUOTE_SENT]: {
    label: 'Quote Sent',
    description: 'Quote sent to client',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '📨',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.QUOTE_APPROVED]: {
    label: 'Quote Approved',
    description: 'Client approved quote',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT]: {
    label: 'Deposit Invoice Sent',
    description: 'Deposit invoice sent to client',
    category: STATUS_CATEGORIES.PAYMENT,
    color: 'warning',
    icon: '💸',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.DEPOSIT_RECEIVED]: {
    label: 'Deposit Received',
    description: 'Deposit payment received',
    category: STATUS_CATEGORIES.PAYMENT,
    color: 'success',
    icon: '💰',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.ORDERING_PARTS]: {
    label: 'Ordering Parts',
    description: 'Ordering required materials',
    category: STATUS_CATEGORIES.PREPARATION,
    color: 'primary',
    icon: '📦',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.PARTS_ORDERED]: {
    label: 'Parts Ordered',
    description: 'Parts ordered, waiting for delivery',
    category: STATUS_CATEGORIES.PREPARATION,
    color: 'info',
    icon: '🚚',
    requiresAction: false,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.PARTS_RECEIVED]: {
    label: 'Parts Received',
    description: 'All parts received, ready for production',
    category: STATUS_CATEGORIES.PREPARATION,
    color: 'success',
    icon: '📦',
    requiresAction: false,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.IN_PRODUCTION]: {
    label: 'In Production',
    description: 'Item being manufactured',
    category: STATUS_CATEGORIES.PRODUCTION,
    color: 'primary',
    icon: '🔨',
    requiresAction: true,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.CASTING]: {
    label: 'Casting',
    description: 'Casting process in progress',
    category: STATUS_CATEGORIES.PRODUCTION,
    color: 'primary',
    icon: '🔥',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.SETTING_STONES]: {
    label: 'Setting Stones',
    description: 'Stone setting in progress',
    category: STATUS_CATEGORIES.PRODUCTION,
    color: 'primary',
    icon: '💎',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.FINISHING]: {
    label: 'Finishing',
    description: 'Final finishing work',
    category: STATUS_CATEGORIES.PRODUCTION,
    color: 'primary',
    icon: '✨',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.QUALITY_CONTROL]: {
    label: 'Quality Control',
    description: 'Quality inspection',
    category: STATUS_CATEGORIES.PRODUCTION,
    color: 'warning',
    icon: '🔍',
    requiresAction: true,
    internalOnly: true
  },
  
  [INTERNAL_STATUSES.FINAL_INVOICE_SENT]: {
    label: 'Final Invoice Sent',
    description: 'Final invoice sent to client',
    category: STATUS_CATEGORIES.PAYMENT,
    color: 'warning',
    icon: '💸',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.FINAL_PAYMENT_RECEIVED]: {
    label: 'Final Payment Received',
    description: 'Final payment received',
    category: STATUS_CATEGORIES.PAYMENT,
    color: 'success',
    icon: '💰',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.READY_FOR_PICKUP]: {
    label: 'Ready for Pickup',
    description: 'Ready for client pickup',
    category: STATUS_CATEGORIES.COMPLETION,
    color: 'success',
    icon: '📦',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.SHIPPED]: {
    label: 'Shipped',
    description: 'Item shipped to client',
    category: STATUS_CATEGORIES.COMPLETION,
    color: 'success',
    icon: '🚚',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.COMPLETED]: {
    label: 'Completed',
    description: 'Job completed and archived',
    category: STATUS_CATEGORIES.COMPLETION,
    color: 'default',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.ON_HOLD]: {
    label: 'On Hold',
    description: 'Temporarily paused',
    category: STATUS_CATEGORIES.SPECIAL,
    color: 'secondary',
    icon: '⏸️',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    description: 'Job cancelled',
    category: STATUS_CATEGORIES.SPECIAL,
    color: 'error',
    icon: '❌',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.WAITING_FOR_CLIENT]: {
    label: 'Waiting for Client',
    description: 'Waiting for client response',
    category: STATUS_CATEGORIES.SPECIAL,
    color: 'warning',
    icon: '⏳',
    requiresAction: false,
    internalOnly: false
  },
  
  [INTERNAL_STATUSES.DEAD_LEAD]: {
    label: 'Dead Lead',
    description: 'Client ghosted/unresponsive',
    category: STATUS_CATEGORIES.SPECIAL,
    color: 'error',
    icon: '👻',
    requiresAction: false,
    internalOnly: true
  }
};

export default STATUS_DEFINITIONS;