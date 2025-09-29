/**
 * Internal Status Definitions
 * Core status enumeration for custom ticket workflow
 */

export const INTERNAL_STATUSES = {
  // Initial consultation & design phase
  PENDING: 'pending',
  REVIEWING_REQUEST: 'reviewing-request',
  IN_CONSULTATION: 'in-consultation',
  CLIENT_CONSULTATION: 'client-consultation',
  SKETCHING: 'sketching',
  SKETCH_REVIEW: 'sketch-review',
  SKETCH_APPROVED: 'sketch-approved',
  
  // Image generation phase
  GENERATING_IMAGE: 'generating-image',
  IMAGE_REVIEW: 'image-review',
  IMAGE_APPROVED: 'image-approved',
  
  // CAD design phase
  IN_CAD: 'in-cad',
  CAD_REVIEW: 'cad-review',
  CAD_APPROVED: 'cad-approved',
  CAD_REVISION: 'cad-revision',
  
  // Quoting & approval phase
  PREPARING_QUOTE: 'preparing-quote',
  QUOTE_SENT: 'quote-sent',
  QUOTE_APPROVED: 'quote-approved',
  
  // Payment & ordering phase
  DEPOSIT_INVOICE_SENT: 'deposit-invoice-sent',
  DEPOSIT_RECEIVED: 'deposit-received',
  ORDERING_PARTS: 'ordering-parts',
  PARTS_ORDERED: 'parts-ordered',
  PARTS_RECEIVED: 'parts-received',
  
  // Production phase
  IN_PRODUCTION: 'in-production',
  CASTING: 'casting',
  SETTING_STONES: 'setting-stones',
  FINISHING: 'finishing',
  QUALITY_CONTROL: 'quality-control',
  
  // Final completion phase  
  FINAL_INVOICE_SENT: 'final-invoice-sent',
  FINAL_PAYMENT_RECEIVED: 'final-payment-received',
  READY_FOR_PICKUP: 'ready-for-pickup',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  
  // Special states
  ON_HOLD: 'on-hold',
  CANCELLED: 'cancelled',
  WAITING_FOR_CLIENT: 'waiting-for-client',
  DEAD_LEAD: 'dead-lead',

  // Legacy statuses for compatibility
  NEEDS_QUOTE: 'needs-quote',
  AWAITING_APPROVAL: 'awaiting-approval',
  DEPOSIT_REQUIRED: 'deposit-required',
  UPDATED_BY_CLIENT: 'updated-by-client',
  GATHERING_MATERIALS: 'gathering-materials',
  NEEDS_PARTS: 'needs-parts',
  READY_FOR_WORK: 'ready-for-work',
  QC_FAILED: 'qc-failed'
};

export default INTERNAL_STATUSES;