function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function normalizeStullerProductResponse(payload = {}) {
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.Products)) return payload.Products[0] || null;
  if (Array.isArray(payload?.products)) return payload.products[0] || null;
  return payload || null;
}

export function normalizeStullerOrder(order = {}) {
  const details = Array.isArray(order.OrderStatusDetails) ? order.OrderStatusDetails : [];
  return {
    stullerOrderID: String(order.OrderNumber || order.PurchaseOrderNumber || ''),
    orderNumber: order.OrderNumber || '',
    purchaseOrderNumber: order.PurchaseOrderNumber || '',
    status: order.Status || '',
    orderDate: order.OrderDate || null,
    scheduledShipDate: order.ScheduledShipDate || null,
    actualShipDate: order.ActualShipDate || null,
    invoiceDate: order.InvoiceDate || null,
    shipMethod: order.ShipMethod || '',
    trackingNumber: order.TrackingNumber || '',
    trackingLink: order.TrackingLink || '',
    subtotal: roundMoney(Number(order.OrderTotal || 0) - Number(order.SalesTax || 0) - Number(order.PostageAndHandling || 0)),
    shipping: roundMoney(order.PostageAndHandling || 0),
    tax: roundMoney(order.SalesTax || 0),
    total: roundMoney(order.OrderTotal || 0),
    invoiceTotal: roundMoney(order.InvoiceTotal || 0),
    items: details.map((detail) => ({
      lineNumber: detail.LineNumber,
      itemNumber: detail.ItemNumber || '',
      orderQuantity: Number(detail.OrderQuantity || 0),
      orderQuantityUnitOfMeasure: detail.OrderQuantityUnitOfMeasure || '',
      shipQuantity: Number(detail.ShipQuantity || 0),
      shipQuantityUnitOfMeasure: detail.ShipQuantityUnitOfMeasure || '',
      unitPrice: roundMoney(detail.UnitPrice || 0),
      unitPriceUnitOfMeasure: detail.UnitPriceUnitOfMeasure || '',
    })),
    raw: order,
  };
}

export function normalizeStullerInvoice(invoice = {}) {
  const details = Array.isArray(invoice.InvoiceDetails) ? invoice.InvoiceDetails : [];
  return {
    stullerInvoiceID: String(invoice.InvoiceNumber || invoice.OrderNumber || ''),
    invoiceNumber: invoice.InvoiceNumber || '',
    orderNumber: invoice.OrderNumber || '',
    purchaseOrderNumber: invoice.PurchaseOrderNumber || '',
    status: invoice.Status || '',
    invoiceDate: invoice.InvoiceDate || null,
    orderDate: invoice.OrderDate || null,
    shipMethod: invoice.ShipMethod || '',
    trackingNumber: invoice.TrackingNumber || '',
    trackingLink: invoice.TrackingLink || '',
    subtotal: roundMoney(Number(invoice.InvoiceTotal || 0) - Number(invoice.SalesTax || 0) - Number(invoice.PostageAndHandling || 0)),
    shipping: roundMoney(invoice.PostageAndHandling || 0),
    tax: roundMoney(invoice.SalesTax || 0),
    total: roundMoney(invoice.InvoiceTotal || 0),
    orderTotal: roundMoney(invoice.OrderTotal || 0),
    totalDue: roundMoney(invoice.TotalDue || 0),
    items: details.map((detail) => ({
      lineNumber: detail.LineNumber,
      customerLineReference: detail.CustomerLineReference || '',
      itemNumber: detail.ItemNumber || '',
      itemDescription: detail.ItemDescription || '',
      shipQuantity: Number(detail.ShipQuantity || 0),
      backOrderedQuantity: Number(detail.BackOrderedQuantity || 0),
      unitPrice: roundMoney(detail.UnitPrice || 0),
      lineTotal: roundMoney(detail.LineTotal || 0),
      customerNotes: detail.CustomerNotes || '',
      unitPriceUnitOfMeasure: detail.UnitPriceUnitOfMeasure || '',
    })),
    raw: invoice,
  };
}
