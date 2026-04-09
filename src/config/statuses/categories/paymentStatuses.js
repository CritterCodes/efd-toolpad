import { INTERNAL_STATUSES } from '../internalStatuses.js';
import { STATUS_CATEGORIES } from '../statusCategories.js';

export const paymentStatuses = {
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
  }
};
