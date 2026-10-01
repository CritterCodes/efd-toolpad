import { EFD_LOGO_SRC, ZELLE_QR_SRC, escapeHtml, formatCurrency, getCardPaymentSummary, getCashPaymentSummary, getInvoiceQrSrc, getPrintAssetSrc } from './pickupHelpers';
export function buildInvoicePrintHtml(invoice) {
  const cashSummary = getCashPaymentSummary(invoice);
  const cardSummary = getCardPaymentSummary(invoice);
  const logoSrc = getPrintAssetSrc(EFD_LOGO_SRC);
  const zelleQrSrc = getPrintAssetSrc(ZELLE_QR_SRC);
  const invoiceQrSrc = getInvoiceQrSrc(invoice.invoiceID);
  const repairRows = (invoice.repairSnapshots || []).map((repair) => `
    <tr>
      <td>
        <div class="mono">${escapeHtml(repair.repairID)}</div>
        <div class="muted">${escapeHtml(repair.customerName || "")}</div>
      </td>
      <td class="money">${formatCurrency(repair.subtotal)}</td>
      <td class="money">${formatCurrency(repair.taxAmount)}</td>
      <td class="money strong">${formatCurrency(repair.total)}</td>
    </tr>
  `).join("");
  const paymentRows = (invoice.payments || []).map((payment) => `
    <tr>
      <td>${escapeHtml(String(payment.type || "").toUpperCase())}</td>
      <td>${escapeHtml(payment.status || "")}</td>
      <td class="money">${formatCurrency(payment.amount)}</td>
      <td>${escapeHtml(formatDate(payment.receivedAt || payment.createdAt || payment.syncedAt))}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(invoice.invoiceID)} Invoice</title>
    <style>
      @page { size: letter; margin: 0.35in; }
      * { box-sizing: border-box; }
      body { margin: 0; padding-bottom: 1.25in; font-family: Arial, sans-serif; color: #111827; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
      .brand-row { display: flex; align-items: flex-start; gap: 12px; }
      .logo { width: 62px; height: auto; object-fit: contain; }
      .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
      .contact { line-height: 1.35; margin-top: 4px; color: #374151; }
      .header-right { display: flex; align-items: flex-start; gap: 12px; }
      .title { font-size: 18px; font-weight: 700; text-align: right; }
      .zelle-header { display: grid; grid-template-columns: 0.78in 1fr; gap: 7px; align-items: center; border: 1px solid #D1D5DB; padding: 6px; min-width: 2.25in; }
      .zelle-header img { width: 0.78in; height: 0.78in; object-fit: contain; display: block; }
      .muted { color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 3px; }
      .mono { font-family: "Courier New", monospace; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
      .box { border: 1px solid #D1D5DB; padding: 8px; min-height: 48px; }
      .label { color: rgba(255,255,255,0.5); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
      .value { font-size: 13px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { text-align: left; color: #374151; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid rgba(255,255,255,0.66); padding: 7px 6px; }
      td { border-bottom: 1px solid #E5E7EB; padding: 7px 6px; vertical-align: top; }
      .money { text-align: right; white-space: nowrap; }
      .strong { font-weight: 700; }
      .totals { width: 280px; margin-left: auto; margin-top: 14px; }
      .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #E5E7EB; }
      .grand { font-size: 16px; font-weight: 800; border-bottom: 2px solid #111827; }
      .section { margin-top: 16px; }
      .payment-options { margin-top: 16px; border: 1px solid #D1D5DB; padding: 10px; break-inside: avoid; }
      .invoice-sticker { position: fixed; right: 0.35in; bottom: 0.28in; display: grid; grid-template-columns: 0.96in 1.25in; gap: 8px; align-items: center; border: 1px solid #111827; background: #FFFFFF; padding: 6px; break-inside: avoid; }
      .invoice-sticker img { width: 0.96in; height: 0.96in; object-fit: contain; display: block; }
      .notes { border: 1px solid #D1D5DB; padding: 10px; min-height: 44px; white-space: pre-wrap; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand-row">
        <img class="logo" src="${logoSrc}" alt="Engel Fine Design logo" />
        <div>
          <div class="brand">Engel Fine Design</div>
          <div class="contact">
            115 N 10th St #A107, Fort Smith, AR 72901<br />
            (479) 546-6740
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="zelle-header">
          <img src="${zelleQrSrc}" alt="Zelle payment QR" onerror="this.style.display='none';" />
          <div>
            <div class="label">Zelle</div>
            <div><strong>Memo:</strong> ${escapeHtml(invoice.invoiceID)}</div>
            <div class="muted">Cash/check total: ${formatCurrency(cashSummary.cashTotal)}</div>
          </div>
        </div>
        <div class="title">
          Repair Invoice<br />
          ${escapeHtml(invoice.invoiceID)}
          <div class="muted">${escapeHtml(new Date().toLocaleDateString())}</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="box"><div class="label">Customer</div><div class="value">${escapeHtml(invoice.customerName || invoice.accountID)}</div></div>
      <div class="box"><div class="label">Payment</div><div class="value">${escapeHtml(invoice.paymentStatus)}</div></div>
      <div class="box"><div class="label">Fulfillment</div><div class="value">${invoice.deliveryMethod === "ship" ? "Ship" : invoice.deliveryMethod === "delivery" ? "Delivery" : "Pickup"}</div></div>
    </div>

    <div class="section">
      <div class="label">Repairs</div>
      <table>
        <thead><tr><th>Repair</th><th class="money">Subtotal</th><th class="money">Tax</th><th class="money">Total</th></tr></thead>
        <tbody>${repairRows || '<tr><td colspan="4">No repairs on invoice.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
      <div class="totals-row"><span>Tax</span><span>${formatCurrency(invoice.taxAmount)}</span></div>
      ${parseFloat(invoice.deliveryFee || 0) > 0 ? `<div class="totals-row"><span>Delivery</span><span>${formatCurrency(invoice.deliveryFee)}</span></div>` : ""}
      ${parseFloat(invoice.shippingFee || 0) > 0 ? `<div class="totals-row"><span>Shipping${invoice.fulfillment?.shipping?.rate ? ` (${escapeHtml(invoice.fulfillment.shipping.rate.carrier || "")} ${escapeHtml(String(invoice.fulfillment.shipping.rate.service || "").replace(/_/g, " ").toLowerCase())})` : ""}</span><span>${formatCurrency(invoice.shippingFee)}</span></div>` : ""}
      <div class="totals-row grand"><span>Cash/Check Total</span><span>${formatCurrency(cashSummary.cashTotal)}</span></div>
      <div class="totals-row"><span>Card Processing Fee</span><span>${formatCurrency(cardSummary.processingFee)}</span></div>
      <div class="totals-row grand"><span>Card Total</span><span>${formatCurrency(cardSummary.cardTotal)}</span></div>
    </div>

    <div class="payment-options">
      <div>
        <div class="label">Payment Options</div>
        <div><strong>Zelle:</strong> Scan the header QR code and include invoice ${escapeHtml(invoice.invoiceID)} in the memo.</div>
        <div class="muted">Cash/check total: ${formatCurrency(cashSummary.cashTotal)}</div>
        <div class="muted">Card total includes Stripe processing fee: ${formatCurrency(cardSummary.cardTotal)}</div>
      </div>
    </div>

    ${paymentRows ? `
      <div class="section">
        <div class="label">Payments</div>
        <table>
          <thead><tr><th>Type</th><th>Status</th><th class="money">Amount</th><th>Date</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>
      </div>` : ""}

    ${invoice.closeoutNotes ? `
      <div class="section">
        <div class="label">Notes</div>
        <div class="notes">${escapeHtml(invoice.closeoutNotes)}</div>
      </div>` : ""}

    <div class="invoice-sticker">
      <img src="${invoiceQrSrc}" alt="Scan to find invoice ${escapeHtml(invoice.invoiceID)}" />
      <div>
        <div class="label">Scan to Find Invoice</div>
        <div class="mono strong">${escapeHtml(invoice.invoiceID)}</div>
        <div class="muted">Use Payment & Pickup invoice scan.</div>
      </div>
    </div>
  </body>
</html>`;
}

export function printInvoice(invoice) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildInvoicePrintHtml(invoice));
  printWindow.document.close();
  printWindow.focus();

  const printAfterAssetsLoad = () => {
    const images = Array.from(printWindow.document.images);
    const imagePromises = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    });

    Promise.all(imagePromises).then(() => {
      printWindow.print();
    });
  };

  if (printWindow.document.readyState === "complete") {
    printAfterAssetsLoad();
  } else {
    printWindow.onload = printAfterAssetsLoad;
  }
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function getRepairDisplayTotal(repair) {
  if (repair.compRepair === true || repair.includedWithSale === true) return 0;

  const storedTotal = parseFloat(repair.totalCost || 0);
  if (storedTotal > 0) return storedTotal;

  const lineItemSubtotal = [
    ...(repair.tasks || []),
    ...(repair.materials || []),
    ...(repair.customLineItems || []),
  ].reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseFloat(item.quantity || 1) || 1)), 0);
  const subtotal = parseFloat(repair.subtotal || 0) > 0
    ? parseFloat(repair.subtotal || 0) + parseFloat(repair.rushFee || 0)
    : lineItemSubtotal + parseFloat(repair.rushFee || 0);

  return subtotal + parseFloat(repair.taxAmount || 0) + parseFloat(repair.deliveryFee || 0);
}

/**
 * After photos NO LONGER GATE INVOICING (owner, 2026-07-31). This is now purely a display signal —
 * staff still see at a glance whether a photo is on file, because they're still worth capturing, but a
 * missing one no longer stops a finished repair from being billed. The server-side twin of this gate
 * came out of ensureRepairsCanBatch in api/repair-invoices/service.js; both halves were needed, since
 * this one alone kept the Create Invoice button refusing.
 */
export function hasAfterPhoto(repair) {
  const afterPhotoCount = Array.isArray(repair.afterPhotos) ? repair.afterPhotos.length : 0;
  return afterPhotoCount > 0;
}

