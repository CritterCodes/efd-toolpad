/**
 * Status Constants
 * Defines all internal status values
 */

export const INTERNAL_STATUSES = {
  // Initial consultation & design phase
  PENDING: 'pending',
  REVIEWING_REQUEST: 'reviewing-request',
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
  DEAD_LEAD: 'dead-lead'
};

export const CLIENT_STATUSES = {
  PENDING_REVIEW: 'pending-review',
  AWAITING_YOUR_RESPONSE: 'awaiting-your-response',
  IN_PROGRESS: 'in-progress',
  READY_FOR_PICKUP: 'ready-for-pickup',
  COMPLETED: 'completed',
  ON_HOLD: 'on-hold',
  CANCELLED_NO_RESPONSE: 'cancelled-no-response'
};