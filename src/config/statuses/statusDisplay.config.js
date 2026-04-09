import { INTERNAL_STATUSES } from './internalStatuses.config';
import { CLIENT_STATUSES } from './clientStatuses.config';

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