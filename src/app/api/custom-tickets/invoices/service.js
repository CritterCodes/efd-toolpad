import CustomTicketInvoicesModel from './model.js';
import ShopifyInvoiceService from './shopify.service.js';

export default class CustomTicketInvoicesService {
  static async createInvoice(invoiceData) {
    const {
      ticketId,
      type,
      amount,
      customerEmail,
      description,
      isPartialPayment = false,
      projectTotalAmount = null
    } = invoiceData;

    const ticket = await CustomTicketInvoicesModel.getTicketById(ticketId);
    if (!ticket) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }

    const existingInvoices = await CustomTicketInvoicesModel.getExistingInvoices(ticketId);

    const paidInvoices = existingInvoices.filter(inv => inv.paidAt || inv.shopifyOrderStatus === 'paid');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const projectTotal = projectTotalAmount || ticket.quote?.totalAmount || ticket.estimatedPrice || 0;
    const paymentProgress = projectTotal > 0 ? (totalPaid / projectTotal) * 100 : 0;

    const newTotalPaid = totalPaid + parseFloat(amount);
    const newPaymentProgress = projectTotal > 0 ? (newTotalPaid / projectTotal) * 100 : 0;
    const willStartProduction = paymentProgress < 50 && newPaymentProgress >= 50;

    let shopifyResult = null;
    try {
      shopifyResult = await ShopifyInvoiceService.createShopifyInvoice(
        ticket, type, amount, customerEmail, description, projectTotal,
        totalPaid, newTotalPaid, paymentProgress, newPaymentProgress, willStartProduction
      );
    } catch (err) {
      console.error('⚠️ Shopify integration error:', err.message);
    }

    const shopifyOrder = shopifyResult?.order;
    const shopifyOrderNumber = shopifyResult?.orderNumber;
    const shopifyOrderUrl = shopifyResult?.orderUrl;
    const useDraftOrders = true;

    const invoice = {
      ticketId,
      type,
      amount: parseFloat(amount),
      description,
      customerEmail,
      createdAt: new Date(),
      status: shopifyOrder ? 'pending_payment' : 'created',
      shopifyOrderId: shopifyOrder?.id?.toString() || null,
      shopifyOrderNumber: shopifyOrderNumber,
      shopifyOrderUrl: shopifyOrderUrl,
      shopifyOrderStatus: shopifyOrder?.financial_status || null,
      shopifyFulfillmentStatus: shopifyOrder?.fulfillment_status || null,
      isDraftOrder: useDraftOrders && !!shopifyOrder,
      invoiceMethod: useDraftOrders ? 'draft_order_invoice' : 'order_with_invoice',
      paymentProgress: {
        projectTotal: projectTotal,
        previousPaid: totalPaid,
        thisPayment: parseFloat(amount),
        newTotalPaid: newTotalPaid,
        progressPercentage: newPaymentProgress,
        willTriggerProduction: willStartProduction
      },
      isPartialPayment
    };

    const result = await CustomTicketInvoicesModel.createInvoiceRecord(invoice);

    if (!result.acknowledged || !result.insertedId) {
      const error = new Error('Failed to create invoice record');
      error.status = 500;
      throw error;
    }

    const invoiceId = result.insertedId;
    const ticketUpdateResult = await CustomTicketInvoicesModel.addInvoiceToTicket(ticketId, {
      _id: invoiceId,
      type: type,
      amount: parseFloat(amount),
      description: description,
      createdAt: new Date(),
      status: invoice.status,
      shopifyOrderNumber: shopifyOrderNumber,
      shopifyOrderUrl: shopifyOrderUrl,
      shopifyOrderId: shopifyOrder?.id?.toString() || null
    });

    if (!ticketUpdateResult.acknowledged) {
      console.warn('⚠️ Failed to update ticket with invoice reference');
    }

    const successMessage = shopifyOrder
      ? `Invoice created with Shopify order #${shopifyOrderNumber}`
      : 'Invoice created locally (Shopify integration not configured or failed)';

    return {
      success: true,
      invoice: invoice,
      shopifyOrderNumber: shopifyOrderNumber,
      shopifyOrderUrl: shopifyOrderUrl,
      message: successMessage
    };
  }

  static async getInvoices(ticketId) {
    const ticket = await CustomTicketInvoicesModel.getTicketInvoices(ticketId);
    
    if (!ticket) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }

    return { invoices: ticket.invoices || [] };
  }
}
