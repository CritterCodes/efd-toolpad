import { qrSrc } from '@/lib/qr';
export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const CLOSEOUT_ACTIVE_REPAIR_KEY = "paymentPickupActiveRepairID";
export const CLOSEOUT_PHOTO_DB = "efd-closeout-photos";
export const CLOSEOUT_PHOTO_STORE = "pendingPhotos";
export const CARD_SURCHARGE_RATE = 0.03;
export const EFD_LOGO_SRC = "/logos/%5Befd%5DLogoBlack.png";
export const ZELLE_QR_SRC = "/logos/zelle-qr.jpg";
export const INVOICE_QR_SIZE = 96;
export const INVOICES_PER_PAGE = 12;

export function getSessionValue(key) {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(key) || "";
}

export function setSessionValue(key, value) {
  if (typeof window === "undefined") return;
  if (value) {
    window.sessionStorage.setItem(key, value);
  } else {
    window.sessionStorage.removeItem(key);
  }
}

export function openCloseoutPhotoDB() {
  return new Promise((resolve, reject) => {
    const indexedDBRef = globalThis.indexedDB;
    if (!indexedDBRef) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDBRef.open(CLOSEOUT_PHOTO_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(CLOSEOUT_PHOTO_STORE, { keyPath: "repairID" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open photo storage."));
  });
}

export async function savePendingCloseoutPhoto(repairID, file) {
  const db = await openCloseoutPhotoDB();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(CLOSEOUT_PHOTO_STORE, "readwrite");
    transaction.objectStore(CLOSEOUT_PHOTO_STORE).put({
      repairID,
      file,
      name: file.name || "after-photo.jpg",
      size: file.size || 0,
      type: file.type || "image/jpeg",
      updatedAt: Date.now(),
    });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Unable to save pending photo."));
  });
  db.close();
}

export async function loadPendingCloseoutPhoto(repairID) {
  const db = await openCloseoutPhotoDB();
  const record = await new Promise((resolve, reject) => {
    const transaction = db.transaction(CLOSEOUT_PHOTO_STORE, "readonly");
    const request = transaction.objectStore(CLOSEOUT_PHOTO_STORE).get(repairID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Unable to load pending photo."));
  });
  db.close();
  return record;
}

export async function clearPendingCloseoutPhoto(repairID) {
  const db = await openCloseoutPhotoDB();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(CLOSEOUT_PHOTO_STORE, "readwrite");
    transaction.objectStore(CLOSEOUT_PHOTO_STORE).delete(repairID);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Unable to clear pending photo."));
  });
  db.close();
}

export function formatCurrency(amount) {
  return currency.format(parseFloat(amount || 0));
}

// CASH DISCOUNT REMOVED (owner, 2026-09-04): cash pays the same total as everything
// else — no more rounding down to the nearest $5.
export function getCashPaymentSummary(invoice) {
  const amountPaid = parseFloat(invoice.amountPaid || 0);
  const total = parseFloat(invoice.total || 0);
  return {
    cashTotal: Math.max(total - amountPaid, 0),
  };
}

export function getCardPaymentSummary(invoice) {
  const remainingBalance = parseFloat(invoice.remainingBalance || 0);
  if (!(remainingBalance > 0)) {
    return {
      baseTotal: 0,
      processingFee: 0,
      cardTotal: 0,
    };
  }

  const processingFee = Math.round((remainingBalance * CARD_SURCHARGE_RATE) * 100) / 100;
  return {
    baseTotal: remainingBalance,
    processingFee,
    cardTotal: remainingBalance + processingFee,
  };
}

export function getInvoiceGrossTotal(invoice) {
  return parseFloat(invoice.subtotal || 0)
    + parseFloat(invoice.taxAmount || 0)
    + parseFloat(invoice.deliveryFee || 0)
    + parseFloat(invoice.shippingFee || 0);
}

export function getFullInvoiceCardSummary(invoice) {
  const baseTotal = getInvoiceGrossTotal(invoice);
  const processingFee = Math.round((baseTotal * CARD_SURCHARGE_RATE) * 100) / 100;

  return {
    baseTotal,
    processingFee,
    cardTotal: baseTotal + processingFee,
  };
}

export function summarizeInvoices(invoiceList = []) {
  return invoiceList.reduce((summary, invoice) => {
    const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
    const completedPayments = payments.filter((payment) => payment.status === "completed");

    summary.count += 1;
    summary.total += parseFloat(invoice.total || 0);
    summary.remaining += parseFloat(invoice.remainingBalance || 0);
    summary.collected += parseFloat(invoice.amountPaid || 0);
    summary.repairs += Array.isArray(invoice.repairIDs) ? invoice.repairIDs.length : 0;
    summary.completedPayments += completedPayments.length;

    for (const payment of completedPayments) {
      const amount = parseFloat(payment.amount || 0);
      const method = payment.type || "other";
      if (method === "cash") summary.cash += amount;
      else if (["credit_card", "stripe", "terminal"].includes(method)) summary.card += amount;
      else if (method === "zelle") summary.zelle += amount;
      else summary.other += amount;
    }

    return summary;
  }, {
    count: 0,
    total: 0,
    remaining: 0,
    collected: 0,
    repairs: 0,
    completedPayments: 0,
    cash: 0,
    card: 0,
    zelle: 0,
    other: 0,
  });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getPrintAssetSrc(src) {
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

export function getInvoiceQrSrc(invoiceID) {
  return qrSrc(`invoice:${invoiceID || ""}`, { size: INVOICE_QR_SIZE, margin: 1 });
}

export function normalizeScannedInvoiceID(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    const parsedUrl = new URL(rawValue);
    return parsedUrl.searchParams.get("invoiceID")
      || parsedUrl.searchParams.get("invoice")
      || parsedUrl.pathname.split("/").filter(Boolean).pop()
      || rawValue;
  } catch {
    return rawValue
      .replace(/^invoice:/i, "")
      .replace(/^inv:/i, "")
      .trim();
  }
}

