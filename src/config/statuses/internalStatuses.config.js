export const INTERNAL_STATUSES = {
  // === INITIAL PHASE ===
  PENDING: 'pending',                           // Just received, needs first review
  REVIEWING_REQUEST: 'reviewing-request',       // Admin reviewing initial request
  IN_CONSULTATION: 'in-consultation',           // Actively discussing with client
  AWAITING_CLIENT_INFO: 'awaiting-client-info', // Need more info from client
  
  // === DESIGN PHASE ===
  SKETCHING: 'sketching',                       // Creating initial sketches
  SKETCH_REVIEW: 'sketch-review',               // Client reviewing sketches
  SKETCH_APPROVED: 'sketch-approved',           // Sketches approved, moving to CAD
  
  CREATING_CAD: 'creating-cad',                 // Creating 3D CAD model
  CAD_REVIEW: 'cad-review',                     // Client reviewing CAD
  CAD_REVISION: 'cad-revision',                 // Making CAD changes
  CAD_APPROVED: 'cad-approved',                 // CAD approved, ready for quote
  
  // === QUOTING & APPROVAL PHASE ===
  PREPARING_QUOTE: 'preparing-quote',           // Creating price quote
  QUOTE_SENT: 'quote-sent',                     // Quote sent to client
  QUOTE_REVISION: 'quote-revision',             // Revising quote
  QUOTE_APPROVED: 'quote-approved',             // Quote approved by client
  
  // === PAYMENT PHASE ===
  DEPOSIT_INVOICE_SENT: 'deposit-invoice-sent', // Deposit invoice sent
  DEPOSIT_RECEIVED: 'deposit-received',         // Deposit payment received
  
  // === PRODUCTION PREPARATION ===
  ORDERING_MATERIALS: 'ordering-materials',     // Ordering stones/metals
  MATERIALS_RECEIVED: 'materials-received',     // Materials arrived
  READY_FOR_PRODUCTION: 'ready-for-production', // Ready to start making
  
  // === PRODUCTION PHASE ===
  IN_PRODUCTION: 'in-production',               // General production status
  CASTING: 'casting',                           // Casting metal
  SETTING_STONES: 'setting-stones',             // Setting gemstones
  POLISHING: 'polishing',                       // Final polishing
  QUALITY_CHECK: 'quality-check',               // Quality control check
  
  // === FINAL PAYMENT & COMPLETION ===
  FINAL_PAYMENT_SENT: 'final-payment-sent',    // Final invoice sent
  PAID_IN_FULL: 'paid-in-full',                // Full payment received
  READY_FOR_PICKUP: 'ready-for-pickup',        // Ready for client pickup
  SHIPPED: 'shipped',                           // Shipped to client
  DELIVERED: 'delivered',                       // Delivered to client
  COMPLETED: 'completed',                       // Project fully complete
  
  // === SPECIAL STATUSES ===
  ON_HOLD: 'on-hold',                          // Project paused
  CANCELLED: 'cancelled',                       // Project cancelled
  REFUNDED: 'refunded'                         // Refund processed
};