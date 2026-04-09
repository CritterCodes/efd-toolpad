import { INTERNAL_STATUSES } from '../internalStatuses.js';
import { STATUS_CATEGORIES } from '../statusCategories.js';

export const generalStatuses = {
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
