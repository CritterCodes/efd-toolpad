import CustomTicketInvoicesModel from './model.js';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';

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

    const paidInvoices = existingInvoices.filter(inv => inv.paidAt || inv.status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const projectTotal = projectTotalAmount || ticket.quote?.totalAmount || ticket.estimatedPrice || 0;
    const paymentProgress = projectTotal > 0 ? (totalPaid / projectTotal) * 100 : 0;

    const newTotalPaid = totalPaid + parseFloat(amount);
    const newPaymentProgress = projectTotal > 0 ? (newTotalPaid / projectTotal) * 100 : 0;
    const willStartProduction = paymentProgress < 50 && newPaymentProgress >= 50;

    const invoice = {
      ticketId,
      type,
      amount: parseFloat(amount),
      description,
      customerEmail,
      createdAt: new Date(),
      status: 'pending_payment',
      invoiceNumber: `INV-${ticketId}-${Date.now()}`,
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
      invoiceNumber: invoice.invoiceNumber
    });

    if (!ticketUpdateResult.acknowledged) {
      console.warn('⚠️ Failed to update ticket with invoice reference');
    }

    // Send invoice created notification to customer
    try {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.engelsfinedesign.com';
      await NotificationService.createNotification({
        userId: ticket.clientId || ticket.userId,
        type: NOTIFICATION_TYPES.INVOICE_CREATED,
        title: 'New Invoice Created',
        message: `Invoice ${invoice.invoiceNumber} for $${parseFloat(amount).toFixed(2)} has been created.`,
        channels: ['inApp', 'email'],
        templateName: 'invoice-created',
        recipientEmail: customerEmail,
        data: {
          ticketId,
          invoiceNumber: invoice.invoiceNumber,
          amount: parseFloat(amount).toFixed(2),
          type,
          description,
          ticketUrl: `${adminUrl}/dashboard/custom-tickets/${ticketId}`,
        },
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send invoice notification:', notifError.message);
    }

    return {
      success: true,
      invoice: invoice,
      invoiceNumber: invoice.invoiceNumber,
      message: `Invoice ${invoice.invoiceNumber} created successfully`
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

  static async updateInvoiceStatus(invoiceId, status, ticketId) {
    const invoice = await CustomTicketInvoicesModel.getInvoiceById(invoiceId);
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.status = 404;
      throw error;
    }

    const validStatuses = ['pending_payment', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const paidAt = status === 'paid' ? new Date() : null;
    const resolvedTicketId = ticketId || invoice.ticketId;

    const result = await CustomTicketInvoicesModel.updateInvoiceStatus(invoiceId, status, paidAt);
    if (!result.acknowledged) {
      const error = new Error('Failed to update invoice');
      error.status = 500;
      throw error;
    }

    // Keep embedded ticket invoice in sync
    if (resolvedTicketId) {
      await CustomTicketInvoicesModel.updateTicketInvoiceStatus(resolvedTicketId, invoiceId, status, paidAt);
    }

    // Send payment received notification when marked paid
    if (status === 'paid') {
      try {
        const ticket = await CustomTicketInvoicesModel.getTicketById(resolvedTicketId);
        const existingInvoices = await CustomTicketInvoicesModel.getExistingInvoices(resolvedTicketId);
        const paidInvoices = existingInvoices.filter(inv =>
          inv.paidAt || inv.status === 'paid' || inv._id.toString() === invoiceId
        );
        const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const projectTotal = ticket?.quote?.quoteTotal || ticket?.quote?.totalAmount || ticket?.estimatedPrice || 0;
        const progressPct = projectTotal > 0 ? ((totalPaid / projectTotal) * 100).toFixed(1) : 0;
        const remaining = Math.max(0, projectTotal - totalPaid).toFixed(2);
        const reachedThreshold = totalPaid >= projectTotal * 0.5;
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.engelsfinedesign.com';

        // Notify customer of payment received
        await NotificationService.createNotification({
          userId: ticket?.clientId || ticket?.userId,
          type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          title: 'Payment Received',
          message: `Payment of $${invoice.amount?.toFixed(2)} received for ticket #${resolvedTicketId}.`,
          channels: ['inApp', 'email'],
          templateName: 'payment-received',
          recipientEmail: invoice.customerEmail,
          data: {
            ticketId: resolvedTicketId,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount?.toFixed(2),
            progressPercentage: progressPct,
            remainingAmount: remaining,
            productionReady: reachedThreshold,
            ticketUrl: `${adminUrl}/dashboard/custom-tickets/${resolvedTicketId}`,
          },
        });

        // Notify admins when 50% threshold is reached
        if (reachedThreshold) {
          await NotificationService.createNotification({
            type: NOTIFICATION_TYPES.PAYMENT_THRESHOLD_REACHED,
            title: 'Payment Threshold Reached',
            message: `Ticket #${resolvedTicketId} has reached 50% payment — production ready.`,
            channels: ['inApp', 'email'],
            templateName: 'payment-threshold-reached',
            recipientEmail: process.env.EMAIL_USER,
            data: {
              ticketId: resolvedTicketId,
              customerName: ticket?.customerName || 'Customer',
              totalPaid: totalPaid.toFixed(2),
              projectTotal: projectTotal.toFixed(2),
              progressPercentage: progressPct,
              ticketUrl: `${adminUrl}/dashboard/custom-tickets/${resolvedTicketId}`,
            },
          });
        }
      } catch (notifError) {
        console.error('⚠️ Failed to send payment notification:', notifError.message);
      }
    }

    return {
      success: true,
      invoiceId,
      status,
      paidAt,
      message: `Invoice marked as ${status}`,
    };
  }
}
