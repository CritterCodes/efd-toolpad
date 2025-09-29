/**
 * Status Categories
 * Defines workflow categories for organization
 */

export const STATUS_CATEGORIES = {
  consultation: {
    label: 'Initial Consultation',
    order: 1,
    color: 'warning'
  },
  design: {
    label: 'Design Phase',
    order: 2,
    color: 'primary'
  },
  quoting: {
    label: 'Quoting & Approval',
    order: 3,
    color: 'info'
  },
  payment: {
    label: 'Payment Processing',
    order: 4,
    color: 'secondary'
  },
  preparation: {
    label: 'Parts & Preparation',
    order: 5,
    color: 'secondary'
  },
  production: {
    label: 'Production',
    order: 6,
    color: 'primary'
  },
  completion: {
    label: 'Completion & Delivery',
    order: 7,
    color: 'success'
  },
  special: {
    label: 'Special Status',
    order: 8,
    color: 'error'
  }
};