import { INTERNAL_STATUSES } from '../internalStatuses.config';

export const fulfillmentDisplayConfig = {
  // completion
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
  
  // special
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
  }
};
