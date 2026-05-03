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

function parseInvoiceDate(invoice = {}) {
  if (!invoice.InvoiceDate) return null;
  const parsed = new Date(invoice.InvoiceDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function filterInvoicesByRecentDays(invoices = [], recentDays = 30) {
  const days = Number(recentDays);
  if (!Number.isFinite(days) || days <= 0) {
    return invoices;
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  return invoices.filter((invoice) => {
    const invoiceDate = parseInvoiceDate(invoice);
    return invoiceDate && invoiceDate >= cutoff && invoiceDate <= now;
  });
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

export async function syncStullerInvoices({
  purchaseOrderNumbers = [],
  invoiceNumbers = [],
  recentDays = null,
  syncAll = false,
} = {}) {
  const identifiers = normalizeStullerSyncIdentifiers({ purchaseOrderNumbers, invoiceNumbers });

  let invoices = [];
  let sourceMode = 'targeted';

  if (identifiers.purchaseOrderNumbers.length || identifiers.invoiceNumbers.length) {
    const payload = await stullerRequest('/v2/invoice', {
      method: 'POST',
      body: {
        PurchaseOrderNumber: identifiers.purchaseOrderNumbers,
        InvoiceNumber: identifiers.invoiceNumbers,
      },
    });
    invoices = Array.isArray(payload?.Invoices) ? payload.Invoices : [];
  } else if (syncAll || recentDays != null) {
    sourceMode = syncAll ? 'all' : 'recent';
    const payload = await stullerRequest('/v2/invoice', { method: 'GET' });
    const allInvoices = Array.isArray(payload?.Invoices) ? payload.Invoices : [];
    invoices = syncAll ? allInvoices : filterInvoicesByRecentDays(allInvoices, recentDays);
  } else {
    const err = new Error('Provide purchase order numbers, invoice numbers, a recent day range, or request a full invoice sync.');
    err.status = 400;
    throw err;
  }

  const synced = [];
  for (const invoice of invoices) {
    const normalized = normalizeStullerInvoice(invoice);
    synced.push(await StullerInvoicesModel.upsert(normalized));
  }

  return {
    ...identifiers,
    sourceMode,
    recentDays: recentDays != null ? Number(recentDays) : null,
    fetchedCount: invoices.length,
    syncedCount: synced.length,
    invoices: synced,
  };
}
