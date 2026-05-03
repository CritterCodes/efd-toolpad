import StullerInvoicesModel from '@/app/api/stullerInvoices/model';
import StullerOrdersModel from '@/app/api/stullerOrders/model';
import { normalizeStullerInvoice, normalizeStullerOrder } from './stullerMappers';
import { stullerRequest } from './stullerClient';

function toIdentifierList(input = []) {
  const values = Array.isArray(input) ? input : [input];
  return values
    .flatMap((entry) => String(entry || '').split(/[\n,]+/))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeStullerSyncIdentifiers({ purchaseOrderNumbers = [], invoiceNumbers = [] } = {}) {
  return {
    purchaseOrderNumbers: Array.from(new Set(toIdentifierList(purchaseOrderNumbers))),
    invoiceNumbers: Array.from(new Set(toIdentifierList(invoiceNumbers))),
  };
}

export async function syncStullerOrdersByPurchaseOrderNumbers(purchaseOrderNumbers = []) {
  const identifiers = Array.from(new Set(toIdentifierList(purchaseOrderNumbers)));
  if (!identifiers.length) {
    const err = new Error('At least one purchase order number is required.');
    err.status = 400;
    throw err;
  }

  const payload = await stullerRequest('/v2/orders', {
    method: 'POST',
    body: {
      PurchaseOrderNumber: identifiers,
    },
  });

  const orders = Array.isArray(payload?.OrderStatuses) ? payload.OrderStatuses : [];
  const synced = [];
  for (const order of orders) {
    const normalized = normalizeStullerOrder(order);
    synced.push(await StullerOrdersModel.upsert(normalized));
  }

  return {
    requestedPurchaseOrderNumbers: identifiers,
    syncedCount: synced.length,
    orders: synced,
  };
}

export async function syncStullerInvoices({ purchaseOrderNumbers = [], invoiceNumbers = [] } = {}) {
  const identifiers = normalizeStullerSyncIdentifiers({ purchaseOrderNumbers, invoiceNumbers });
  if (!identifiers.purchaseOrderNumbers.length && !identifiers.invoiceNumbers.length) {
    const err = new Error('At least one purchase order number or invoice number is required.');
    err.status = 400;
    throw err;
  }

  const payload = await stullerRequest('/v2/invoice', {
    method: 'POST',
    body: {
      PurchaseOrderNumber: identifiers.purchaseOrderNumbers,
      InvoiceNumber: identifiers.invoiceNumbers,
    },
  });

  const invoices = Array.isArray(payload?.Invoices) ? payload.Invoices : [];
  const synced = [];
  for (const invoice of invoices) {
    const normalized = normalizeStullerInvoice(invoice);
    synced.push(await StullerInvoicesModel.upsert(normalized));
  }

  return {
    ...identifiers,
    syncedCount: synced.length,
    invoices: synced,
  };
}
