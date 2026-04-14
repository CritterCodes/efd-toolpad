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

  static async updateInvoiceStatus(invoiceId, status, paidAt = null) {
    await db.connect();
    const { ObjectId } = await import('mongodb');
    const update = { $set: { status } };
    if (paidAt) update.$set.paidAt = paidAt;

    const result = await db._instance
      .collection('invoices')
      .updateOne({ _id: new ObjectId(invoiceId) }, update);

    return result;
  }

  static async updateTicketInvoiceStatus(ticketId, invoiceId, status, paidAt = null) {
    await db.connect();
    const { ObjectId } = await import('mongodb');
    const setFields = { 'invoices.$.status': status };
    if (paidAt) setFields['invoices.$.paidAt'] = paidAt;

    return await db._instance
      .collection('customTickets')
      .updateOne(
        { ticketID: ticketId, 'invoices._id': new ObjectId(invoiceId) },
        { $set: setFields }
      );
  }

  static async getInvoiceById(invoiceId) {
    await db.connect();
    const { ObjectId } = await import('mongodb');
    return await db._instance
      .collection('invoices')
      .findOne({ _id: new ObjectId(invoiceId) });
  }
}
