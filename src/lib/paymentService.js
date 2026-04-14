/**
 * Payment Service - Stub for future payment processor integration
 * Constitutional Architecture: Library Layer
 * 
 * This is a placeholder service that will be replaced when a payment 
 * processor is selected. All payment-related operations should go 
 * through this service so the swap is seamless.
 * 
 * TODO: Replace stub methods with real payment processor SDK calls
 */

export const PAYMENT_STATUS = {
  PENDING: 'pending_payment',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

export const INVOICE_TYPES = {
  DEPOSIT: 'deposit',
  PROGRESS: 'progress',
  FINAL: 'final',
  PARTIAL: 'partial',
};

export class PaymentService {
  /**
   * Create a payment link/checkout session for an invoice
   * @param {Object} invoiceData - Invoice details
   * @param {number} invoiceData.amount - Amount in dollars
   * @param {string} invoiceData.customerEmail - Customer email
   * @param {string} invoiceData.invoiceNumber - Invoice reference number
   * @param {string} invoiceData.description - Payment description
   * @returns {Object} { paymentUrl, paymentId, status }
   * 
   * TODO: Integrate with payment processor to generate checkout URL
   */
  static async createPaymentLink(invoiceData) {
    console.warn('⚠️ PaymentService.createPaymentLink is a stub — no payment processor configured');
    return {
      paymentUrl: null,
      paymentId: null,
      status: PAYMENT_STATUS.PENDING,
      message: 'Payment processor not yet configured. Mark payments manually.',
    };
  }

  /**
   * Check the status of a payment
   * @param {string} paymentId - Payment processor transaction ID
   * @returns {Object} { status, paidAt, amount }
   * 
   * TODO: Query payment processor API for real-time status
   */
  static async getPaymentStatus(paymentId) {
    console.warn('⚠️ PaymentService.getPaymentStatus is a stub — no payment processor configured');
    return {
      status: PAYMENT_STATUS.PENDING,
      paidAt: null,
      amount: 0,
    };
  }

  /**
   * Process a refund for a payment
   * @param {string} paymentId - Original payment ID
   * @param {number} amount - Refund amount (null = full refund)
   * @returns {Object} { refundId, status, amount }
   * 
   * TODO: Call payment processor refund API
   */
  static async processRefund(paymentId, amount = null) {
    console.warn('⚠️ PaymentService.processRefund is a stub — no payment processor configured');
    return {
      refundId: null,
      status: 'not_available',
      amount: amount || 0,
      message: 'Payment processor not yet configured. Process refunds manually.',
    };
  }

  /**
   * Verify a webhook signature from the payment processor
   * @param {Object} headers - Request headers
   * @param {string} body - Raw request body
   * @returns {boolean} Whether the webhook is valid
   * 
   * TODO: Implement webhook verification for chosen processor
   */
  static async verifyWebhook(headers, body) {
    console.warn('⚠️ PaymentService.verifyWebhook is a stub — no payment processor configured');
    return false;
  }
}
