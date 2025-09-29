/**
 * Client Status Mapping Configuration
 * Maps internal statuses to client-friendly display statuses
 */

import { INTERNAL_STATUSES } from './internalStatuses.js';

export const CLIENT_STATUS_MAPPING = {
  // Shows as "Pending Review"
  [INTERNAL_STATUSES.PENDING]: 'pending-review',
  [INTERNAL_STATUSES.REVIEWING_REQUEST]: 'pending-review',
  [INTERNAL_STATUSES.NEEDS_QUOTE]: 'pending-review',
  [INTERNAL_STATUSES.PREPARING_QUOTE]: 'pending-review',
  [INTERNAL_STATUSES.QUOTE_SENT]: 'pending-review',
  
  // Shows as "In Consultation"
  [INTERNAL_STATUSES.IN_CONSULTATION]: 'in-consultation',
  
  // Shows as "Awaiting Your Response"
  [INTERNAL_STATUSES.CLIENT_CONSULTATION]: 'awaiting-response',
  [INTERNAL_STATUSES.SKETCH_REVIEW]: 'awaiting-response',
  [INTERNAL_STATUSES.IMAGE_REVIEW]: 'awaiting-response',
  [INTERNAL_STATUSES.CAD_REVIEW]: 'awaiting-response',
  [INTERNAL_STATUSES.CAD_REVISION]: 'awaiting-response',
  [INTERNAL_STATUSES.AWAITING_APPROVAL]: 'awaiting-response',
  [INTERNAL_STATUSES.DEPOSIT_REQUIRED]: 'awaiting-response',
  [INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT]: 'awaiting-response',
  [INTERNAL_STATUSES.FINAL_INVOICE_SENT]: 'awaiting-response',
  [INTERNAL_STATUSES.UPDATED_BY_CLIENT]: 'awaiting-response',
  [INTERNAL_STATUSES.WAITING_FOR_CLIENT]: 'awaiting-response',
  
  // Shows as "In Progress"
  [INTERNAL_STATUSES.SKETCHING]: 'in-progress',
  [INTERNAL_STATUSES.SKETCH_APPROVED]: 'in-progress',
  [INTERNAL_STATUSES.GENERATING_IMAGE]: 'in-progress',
  [INTERNAL_STATUSES.IMAGE_APPROVED]: 'in-progress',
  [INTERNAL_STATUSES.IN_CAD]: 'in-progress',
  [INTERNAL_STATUSES.CAD_APPROVED]: 'in-progress',
  [INTERNAL_STATUSES.QUOTE_APPROVED]: 'in-progress',
  [INTERNAL_STATUSES.DEPOSIT_RECEIVED]: 'in-progress',
  [INTERNAL_STATUSES.ORDERING_PARTS]: 'in-progress',
  [INTERNAL_STATUSES.PARTS_ORDERED]: 'in-progress',
  [INTERNAL_STATUSES.PARTS_RECEIVED]: 'in-progress',
  [INTERNAL_STATUSES.GATHERING_MATERIALS]: 'in-progress',
  [INTERNAL_STATUSES.NEEDS_PARTS]: 'in-progress',
  [INTERNAL_STATUSES.READY_FOR_WORK]: 'in-progress',
  [INTERNAL_STATUSES.IN_PRODUCTION]: 'in-progress',
  [INTERNAL_STATUSES.CASTING]: 'in-progress',
  [INTERNAL_STATUSES.SETTING_STONES]: 'in-progress',
  [INTERNAL_STATUSES.FINISHING]: 'in-progress',
  [INTERNAL_STATUSES.QUALITY_CONTROL]: 'in-progress',
  [INTERNAL_STATUSES.QC_FAILED]: 'in-progress',
  [INTERNAL_STATUSES.FINAL_PAYMENT_RECEIVED]: 'in-progress',
  
  // Shows as "Ready for Pickup"
  [INTERNAL_STATUSES.READY_FOR_PICKUP]: 'ready-pickup',
  [INTERNAL_STATUSES.SHIPPED]: 'ready-pickup',
  
  // Shows as "Completed"
  [INTERNAL_STATUSES.COMPLETED]: 'completed',
  
  // Special states remain the same
  [INTERNAL_STATUSES.ON_HOLD]: 'on-hold',
  [INTERNAL_STATUSES.CANCELLED]: 'cancelled',
  [INTERNAL_STATUSES.DEAD_LEAD]: 'dead-lead'
};

export const CLIENT_STATUS_LABELS = {
  'pending-review': 'Pending Review',
  'in-consultation': 'In Consultation',
  'awaiting-response': 'Awaiting Your Response',
  'in-progress': 'In Progress',
  'ready-pickup': 'Ready for Pickup',
  'completed': 'Completed',
  'on-hold': 'On Hold',
  'cancelled': 'Cancelled',
  'dead-lead': 'Inactive'
};

export const CLIENT_STATUS_COLORS = {
  'pending-review': 'warning',
  'in-consultation': 'info',
  'awaiting-response': 'info',
  'in-progress': 'primary',
  'ready-pickup': 'success',
  'completed': 'default',
  'on-hold': 'secondary',
  'cancelled': 'error',
  'dead-lead': 'error'
};

export default CLIENT_STATUS_MAPPING;