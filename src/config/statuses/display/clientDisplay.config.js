import { CLIENT_STATUSES } from '../clientStatuses.config';

export const clientDisplayConfig = {
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
