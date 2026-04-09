import { INTERNAL_STATUSES } from '../internalStatuses.config';

export const workflowDisplayConfig = {
  // initial
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
  
  // design
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

  // quote
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

  // payment
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
  }
};
