import { db } from '@/lib/database';
import Constants from '@/lib/constants';

export function customerContactFromUser(user = {}) {
  const personalName = [user.firstName, user.lastName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

  return {
    customerName: personalName
      || String(user.businessName || user.business || user.name || '').trim(),
    customerEmail: String(user.email || '').trim(),
    customerPhone: String(user.phoneNumber || user.phone || '').trim(),
  };
}

export async function syncLinkedCustomOrderContact(user) {
  const clientID = String(user?.userID || '').trim();
  if (!clientID) return { matchedOrders: 0, updatedOrders: 0, updatedInvoiceDrafts: 0 };

  const dbInstance = await db.connect();
  const orders = dbInstance.collection(Constants.CUSTOM_ORDERS_COLLECTION);
  const invoices = dbInstance.collection('customInvoices');
  const contact = customerContactFromUser(user);
  const now = new Date();
  const linkedOrders = await orders
    .find({ clientID }, { projection: { _id: 0, customID: 1 } })
    .toArray();
  const customIDs = linkedOrders.map((order) => order.customID).filter(Boolean);

  const orderResult = await orders.updateMany(
    { clientID },
    { $set: { ...contact, updatedAt: now } },
  );

  let updatedInvoiceDrafts = 0;
  if (customIDs.length > 0) {
    const invoiceResult = await invoices.updateMany(
      {
        customID: { $in: customIDs },
        status: 'pending_payment',
        $or: [
          { stripeInvoiceID: { $exists: false } },
          { stripeInvoiceID: null },
          { stripeInvoiceID: '' },
        ],
      },
      { $set: { customerEmail: contact.customerEmail, updatedAt: now } },
    );
    updatedInvoiceDrafts = invoiceResult.modifiedCount || 0;
  }

  return {
    matchedOrders: orderResult.matchedCount || 0,
    updatedOrders: orderResult.modifiedCount || 0,
    updatedInvoiceDrafts,
  };
}
