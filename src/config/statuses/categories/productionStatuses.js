import { INTERNAL_STATUSES } from '../internalStatuses.js';
import { STATUS_CATEGORIES } from '../statusCategories.js';

export const productionStatuses = {
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
  }
};
