import { db } from '@/lib/database';

export default class CustomTicketInvoicesModel {
  static async getTicketById(ticketId) {
    await db.connect();
    return await db._instance
      .collection('customTickets')
      .findOne({ ticketID: ticketId });
  }

  static async getExistingInvoices(ticketId) {
    await db.connect();
    return await db._instance
      .collection('invoices')
      .find({ ticketId: ticketId })
      .toArray();
  }

  static async createInvoiceRecord(invoice) {
    await db.connect();
    const result = await db._instance.collection('invoices').insertOne(invoice);
    return result;
  }

  static async addInvoiceToTicket(ticketId, invoiceData) {
    await db.connect();
    return await db._instance.collection('customTickets').updateOne(
      { ticketID: ticketId },
      {
        $push: {
          invoices: invoiceData
        }
      }
    );
  }

  static async getTicketInvoices(ticketId) {
    await db.connect();
    return await db._instance
      .collection('customTickets')
      .findOne(
        { ticketID: ticketId },
        { projection: { invoices: 1, ticketID: 1 } }
      );
  }
}
