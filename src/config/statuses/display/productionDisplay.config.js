import { INTERNAL_STATUSES } from '../internalStatuses.config';

export const productionDisplayConfig = {
  // preparation
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
  
  // production
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
  }
};
