"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  Pagination,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  Payment as PaymentIcon,
  PhotoCamera as PhotoCameraIcon,
  QrCodeScanner as ScanIcon,
} from "@mui/icons-material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import RepairThumbnail from "@/app/dashboard/repairs/components/RepairThumbnail";
import ContinuousBarcodeScanner from "@/components/repairs/ContinuousBarcodeScanner";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CLOSEOUT_ACTIVE_REPAIR_KEY = "paymentPickupActiveRepairID";
const CLOSEOUT_PHOTO_DB = "efd-closeout-photos";
const CLOSEOUT_PHOTO_STORE = "pendingPhotos";
const CARD_SURCHARGE_RATE = 0.03;
const EFD_LOGO_SRC = "/logos/%5Befd%5DLogoBlack.png";
const ZELLE_QR_SRC = "/logos/zelle-qr.jpg";
const INVOICE_QR_SIZE = 96;
const INVOICES_PER_PAGE = 12;

function getSessionValue(key) {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(key) || "";
}

function setSessionValue(key, value) {
  if (typeof window === "undefined") return;
  if (value) {
    window.sessionStorage.setItem(key, value);
  } else {
    window.sessionStorage.removeItem(key);
  }
}

function openCloseoutPhotoDB() {
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

async function savePendingCloseoutPhoto(repairID, file) {
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

async function loadPendingCloseoutPhoto(repairID) {
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

async function clearPendingCloseoutPhoto(repairID) {
  const db = await openCloseoutPhotoDB();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(CLOSEOUT_PHOTO_STORE, "readwrite");
    transaction.objectStore(CLOSEOUT_PHOTO_STORE).delete(repairID);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Unable to clear pending photo."));
  });
  db.close();
}

function formatCurrency(amount) {
  return currency.format(parseFloat(amount || 0));
}

function getCashDiscountSummary(invoice) {
  const grossTotal = parseFloat(invoice.subtotal || 0)
    + parseFloat(invoice.taxAmount || 0)
    + parseFloat(invoice.deliveryFee || 0);
  const roundedCashTotal = Math.floor(grossTotal / 5) * 5;
  const cashDiscountAmount = Math.max(grossTotal - roundedCashTotal, 0);
  const amountPaid = parseFloat(invoice.amountPaid || 0);

  return {
    grossTotal,
    cashDiscountAmount,
    cashTotal: Math.max(roundedCashTotal - amountPaid, 0),
  };
}

function getCardPaymentSummary(invoice) {
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

function getInvoiceGrossTotal(invoice) {
  return parseFloat(invoice.subtotal || 0)
    + parseFloat(invoice.taxAmount || 0)
    + parseFloat(invoice.deliveryFee || 0);
}

function getFullInvoiceCardSummary(invoice) {
  const baseTotal = getInvoiceGrossTotal(invoice);
  const processingFee = Math.round((baseTotal * CARD_SURCHARGE_RATE) * 100) / 100;

  return {
    baseTotal,
    processingFee,
    cardTotal: baseTotal + processingFee,
  };
}

function summarizeInvoices(invoiceList = []) {
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPrintAssetSrc(src) {
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

function getInvoiceQrSrc(invoiceID) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${INVOICE_QR_SIZE}x${INVOICE_QR_SIZE}&margin=1&data=${encodeURIComponent(`invoice:${invoiceID || ""}`)}`;
}

function normalizeScannedInvoiceID(value) {
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

function buildInvoicePrintHtml(invoice) {
  const cashSummary = getCashDiscountSummary(invoice);
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
      .muted { color: #6B7280; font-size: 11px; margin-top: 3px; }
      .mono { font-family: "Courier New", monospace; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
      .box { border: 1px solid #D1D5DB; padding: 8px; min-height: 48px; }
      .label { color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
      .value { font-size: 13px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { text-align: left; color: #374151; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #9CA3AF; padding: 7px 6px; }
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
      <div class="box"><div class="label">Fulfillment</div><div class="value">${invoice.deliveryMethod === "delivery" ? "Delivery" : "Pickup"}</div></div>
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
      <div class="totals-row"><span>Delivery</span><span>${formatCurrency(invoice.deliveryFee)}</span></div>
      <div class="totals-row"><span>Cash Discount</span><span>-${formatCurrency(cashSummary.cashDiscountAmount)}</span></div>
      <div class="totals-row grand"><span>Cash Total</span><span>${formatCurrency(cashSummary.cashTotal)}</span></div>
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

function printInvoice(invoice) {
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

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getRepairDisplayTotal(repair) {
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

function isReadyForInvoice(repair) {
  const afterPhotoCount = Array.isArray(repair.afterPhotos) ? repair.afterPhotos.length : 0;
  return afterPhotoCount > 0;
}

function canAccessCloseout(session) {
  if (session?.user?.role === "admin") return true;
  return session?.user?.role === "artisan"
    && session?.user?.employment?.isOnsite === true
    && session?.user?.staffCapabilities?.repairOps === true
    && (
      session?.user?.staffCapabilities?.closeoutBilling === true
      || session?.user?.staffCapabilities?.qualityControl === true
    );
}

function RepairCloseoutCard({
  repair,
  isSelected,
  onToggleSelect,
  noteValue,
  onNoteChange,
  photoState,
  onConfirmCloseout,
  onEditRepair,
  highlighted,
}) {
  const [inputKey, setInputKey] = useState(0);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState("");
  const fileInputRef = useRef(null);
  const afterPhotoCount = Array.isArray(repair.afterPhotos) ? repair.afterPhotos.length : 0;
  const flaggedForReview = repair.requiresLaborReview === true;
  const batchReady = isReadyForInvoice(repair);

  useEffect(() => {
    return () => {
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview);
    };
  }, [pendingPhotoPreview]);

  useEffect(() => {
    let cancelled = false;

    const restorePendingPhoto = async () => {
      try {
        const record = await loadPendingCloseoutPhoto(repair.repairID);
        if (cancelled || !record?.file) return;

        setPendingPhoto(record.file);
        setPendingPhotoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(record.file);
        });
      } catch (error) {
        console.warn("Unable to restore pending closeout photo:", error);
      }
    };

    restorePendingPhoto();

    return () => {
      cancelled = true;
    };
  }, [repair.repairID]);

  const handlePhotoTaken = (event) => {
    const file = event.target.files?.[0];
    setInputKey((k) => k + 1);
    if (!file) return;
    setPendingPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPendingPhoto(file);
    savePendingCloseoutPhoto(repair.repairID, file).catch((error) => {
      console.warn("Unable to persist pending closeout photo:", error);
    });
  };

  const openCamera = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleConfirmCloseout = async () => {
    if (!pendingPhoto || photoState.loading) return;
    const saved = await onConfirmCloseout(repair.repairID, pendingPhoto, noteValue);
    if (saved) {
      clearPendingCloseoutPhoto(repair.repairID).catch((error) => {
        console.warn("Unable to clear pending closeout photo:", error);
      });
      setPendingPhoto(null);
      setPendingPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    }
  };

  return (
    <Card
      sx={{
        backgroundColor: REPAIRS_UI.bgPanel,
        border: `1px solid ${highlighted ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
        boxShadow: highlighted ? `0 0 0 2px ${REPAIRS_UI.accent}33` : REPAIRS_UI.shadow,
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
            <Box sx={{ display: "flex", gap: 1.5, minWidth: 0, flex: 1 }}>
              <RepairThumbnail repair={repair} size={76} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>
                  {repair.clientName || repair.businessName || repair.repairID}
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textMuted, fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {repair.repairID}
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox checked={isSelected} onChange={() => onToggleSelect(repair.repairID)} />
              <Chip label={repair.isWholesale ? "Wholesale" : "Retail"} size="small" />
            </Stack>
          </Box>

          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: "0.92rem" }}>
            {repair.description || "No description"}
          </Typography>

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Current total</Typography>
              <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600 }}>{formatCurrency(getRepairDisplayTotal(repair))}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>After photos</Typography>
              <Typography sx={{ color: afterPhotoCount > 0 ? REPAIRS_UI.textPrimary : "#F59E0B", fontWeight: 600 }}>{afterPhotoCount}</Typography>
            </Grid>
          </Grid>

          {flaggedForReview && (
            <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              Labor review is flagged for weekly review. This repair can still be batched into an invoice now.
            </Alert>
          )}

          {afterPhotoCount === 0 && (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              Take an after photo, add any closeout notes, then confirm to move this repair to an invoice.
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <input
              key={inputKey}
              ref={fileInputRef}
              id={`after-photo-${repair.repairID}`}
              type="file"
              accept="image/*"
              capture="environment"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
              onChange={handlePhotoTaken}
              onInput={handlePhotoTaken}
            />
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              disabled={photoState.loading}
              onClick={openCamera}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              {pendingPhoto ? "Retake After Photo" : "Take After Photo"}
            </Button>
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: "0.8rem", flex: 1 }}>
              {pendingPhoto ? "Photo ready. Add notes, then confirm." : "Use the device camera, then confirm when closeout is ready."}
            </Typography>
          </Stack>

          {pendingPhoto && (
            <Alert severity="success" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {pendingPhotoPreview && (
                  <Box
                    component="img"
                    src={pendingPhotoPreview}
                    alt="Captured after photo preview"
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      objectFit: "cover",
                      border: `1px solid ${REPAIRS_UI.border}`,
                    }}
                  />
                )}
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>After photo captured</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    {pendingPhoto.name || "Camera photo"} · {Math.max(1, Math.round((pendingPhoto.size || 0) / 1024))} KB
                  </Typography>
                </Box>
              </Stack>
            </Alert>
          )}

          <TextField
            label="Closeout Notes"
            value={noteValue}
            onChange={(event) => onNoteChange(repair.repairID, event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => onEditRepair(repair.repairID)}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Edit Repair for Missed Tasks / Materials
            </Button>
            <Button
              variant="contained"
              disabled={!pendingPhoto || photoState.loading}
              onClick={handleConfirmCloseout}
              sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}
            >
              {photoState.loading ? "Saving..." : "Confirm / Move to Invoice"}
            </Button>
            <Chip
              label={batchReady ? "Already invoice-ready" : pendingPhoto ? "Ready to confirm" : "Needs closeout work"}
              color={batchReady ? "success" : "default"}
              variant={batchReady ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function InvoiceCard({
  invoice,
  mergeTargets = [],
  onFinalize,
  onCashPay,
  onCreateStripe,
  onSyncStripe,
  onCardCollected,
  onConvertCashToCard,
  onCreateTerminal,
  onSyncTerminal,
  collectingTerminalInvoiceID,
  onUpdateDelivery,
  onSetCashDiscount,
  onSplitInvoice,
  onMergeInvoice,
  onRemoveRepairs,
}) {
  const [cashAmount, setCashAmount] = useState(invoice.remainingBalance || 0);
  const [cashNotes, setCashNotes] = useState("");
  const [selectedRepairIDs, setSelectedRepairIDs] = useState([]);
  const [targetInvoiceID, setTargetInvoiceID] = useState("");
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(invoice.deliveryFee || 5);
  const cashDiscountSummary = useMemo(() => getCashDiscountSummary(invoice), [invoice]);
  const cardPaymentSummary = useMemo(() => getCardPaymentSummary(invoice), [invoice]);
  const fullInvoiceCardSummary = useMemo(() => getFullInvoiceCardSummary(invoice), [invoice]);
  const pendingStripe = (invoice.payments || []).find((payment) => payment.type === "stripe" && payment.status === "pending");
  const pendingTerminal = (invoice.payments || []).find((payment) => payment.type === "terminal" && payment.status === "pending");
  const hasCompletedCashPayment = (invoice.payments || []).some((payment) => payment.type === "cash" && payment.status === "completed");
  const canEditInvoice = invoice.paymentStatus !== "paid" && ["draft", "open"].includes(invoice.status);
  const splitDisabled = selectedRepairIDs.length === 0 || selectedRepairIDs.length >= (invoice.repairIDs || []).length;

  useEffect(() => {
    setCashAmount(cashDiscountSummary.cashTotal || invoice.remainingBalance || 0);
    setDeliveryFeeInput(invoice.deliveryFee || 5);
  }, [cashDiscountSummary.cashTotal, invoice.deliveryFee, invoice.remainingBalance]);

  useEffect(() => {
    setSelectedRepairIDs((prev) => prev.filter((repairID) => (invoice.repairIDs || []).includes(repairID)));
  }, [invoice.repairIDs]);

  const toggleInvoiceRepair = (repairID) => {
    setSelectedRepairIDs((prev) =>
      prev.includes(repairID) ? prev.filter((id) => id !== repairID) : [...prev, repairID]
    );
  };

  return (
    <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{invoice.invoiceID}</Typography>
              <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{invoice.customerName || invoice.accountID}</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={invoice.status} size="small" />
              <Chip label={`Payment: ${invoice.paymentStatus}`} size="small" color={invoice.paymentStatus === "paid" ? "success" : invoice.paymentStatus === "partial" ? "warning" : "default"} />
              <Chip label={invoice.deliveryMethod === "delivery" ? "Delivery" : "Pickup"} size="small" />
              <Button
                size="small"
                variant="outlined"
                onClick={() => printInvoice(invoice)}
                sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, textTransform: "none" }}
              >
                Print Invoice
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={1.5}>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Subtotal</Typography><Typography>{formatCurrency(invoice.subtotal)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Tax</Typography><Typography>{formatCurrency(invoice.taxAmount)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Delivery</Typography><Typography>{formatCurrency(invoice.deliveryFee)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Remaining</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(invoice.remainingBalance)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Cash Discount</Typography><Typography>{formatCurrency(cashDiscountSummary.cashDiscountAmount)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Cash Total</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(cashDiscountSummary.cashTotal)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Card Fee</Typography><Typography>{formatCurrency(cardPaymentSummary.processingFee)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Card Total</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(cardPaymentSummary.cardTotal)}</Typography></Grid>
          </Grid>

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.75 }}>Repairs in invoice</Typography>
            <Stack spacing={0.75}>
              {(invoice.repairSnapshots || []).map((repair) => (
                <Box key={repair.repairID} sx={{ display: "flex", justifyContent: "space-between", gap: 2, color: REPAIRS_UI.textSecondary, fontSize: "0.9rem", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    {canEditInvoice && (
                      <Checkbox
                        size="small"
                        checked={selectedRepairIDs.includes(repair.repairID)}
                        onChange={() => toggleInvoiceRepair(repair.repairID)}
                        sx={{ p: 0.25 }}
                      />
                    )}
                    <Typography sx={{ fontFamily: "monospace" }}>{repair.repairID}</Typography>
                  </Box>
                  <Typography>{formatCurrency(repair.total)}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {canEditInvoice && (
            <>
              <Divider />
              <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Invoice Tools</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <Button
                  variant="outlined"
                  disabled={splitDisabled}
                  onClick={() => onSplitInvoice(invoice.invoiceID, selectedRepairIDs)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Split Selected
                </Button>
                <Button
                  variant="outlined"
                  disabled={selectedRepairIDs.length === 0}
                  onClick={() => onRemoveRepairs(invoice.invoiceID, selectedRepairIDs)}
                  sx={{ color: "#FCA5A5", borderColor: REPAIRS_UI.border }}
                >
                  Remove to Closeout
                </Button>
                <TextField
                  label="Merge Into Invoice ID"
                  value={targetInvoiceID}
                  onChange={(event) => setTargetInvoiceID(event.target.value)}
                  placeholder={mergeTargets[0]?.invoiceID || "rinv-..."}
                  size="small"
                  sx={{ minWidth: 220 }}
                />
                <Button
                  variant="outlined"
                  disabled={!targetInvoiceID.trim()}
                  onClick={() => onMergeInvoice(invoice.invoiceID, targetInvoiceID.trim())}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Merge
                </Button>
              </Stack>
              {mergeTargets.length > 0 && (
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                  Same-account merge targets: {mergeTargets.map((target) => target.invoiceID).join(", ")}
                </Typography>
              )}

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={invoice.deliveryMethod === "delivery"}
                      onChange={(event) => onUpdateDelivery(invoice.invoiceID, event.target.checked ? "delivery" : "pickup", deliveryFeeInput || 5)}
                    />
                  }
                  label="Delivery"
                />
                {invoice.deliveryMethod === "delivery" && (
                  <TextField
                    label="Delivery Fee"
                    type="number"
                    size="small"
                    value={deliveryFeeInput}
                    onChange={(event) => setDeliveryFeeInput(event.target.value)}
                    onBlur={() => onUpdateDelivery(invoice.invoiceID, "delivery", deliveryFeeInput || 5)}
                    sx={{ maxWidth: 160 }}
                  />
                )}
              </Stack>
            </>
          )}

          {invoice.closeoutNotes && (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>{invoice.closeoutNotes}</Alert>
          )}

          {invoice.status === "draft" && (
            <Button variant="outlined" onClick={() => onFinalize(invoice.invoiceID)} sx={{ alignSelf: "flex-start", color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
              Finalize Invoice
            </Button>
          )}

          {hasCompletedCashPayment && (
            <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Cash payment correction</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    If this was actually a card payment, convert it to credit card and set collected total to {formatCurrency(fullInvoiceCardSummary.cardTotal)}.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => onConvertCashToCard(invoice.invoiceID)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, flexShrink: 0 }}
                >
                  Convert Cash to Credit Card
                </Button>
              </Stack>
            </Alert>
          )}

          {invoice.paymentStatus !== "paid" && (
            <>
              <Divider />
              <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Record Payment</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField label="Cash Amount" type="number" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} sx={{ minWidth: 140 }} />
                <TextField label="Cash Notes" value={cashNotes} onChange={(event) => setCashNotes(event.target.value)} sx={{ flex: 1 }} />
                <Button variant="contained" onClick={() => onCashPay(invoice.invoiceID, cashAmount, cashNotes, true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}>
                  Record Cash
                </Button>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Button variant="outlined" onClick={() => onCreateStripe(invoice.invoiceID, cardPaymentSummary.cardTotal)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                  Create Stripe Intent ({formatCurrency(cardPaymentSummary.cardTotal)})
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => onCardCollected(invoice.invoiceID, cardPaymentSummary)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Credit Card Payment Collected ({formatCurrency(cardPaymentSummary.cardTotal)})
                </Button>
                {pendingStripe && (
                  <Button variant="outlined" onClick={() => onSyncStripe(invoice.invoiceID, pendingStripe.paymentIntentId)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                    Refresh Stripe Status
                  </Button>
                )}
                <Button
                  variant="contained"
                  disabled={collectingTerminalInvoiceID === invoice.invoiceID}
                  onClick={() => onCreateTerminal(invoice.invoiceID, cardPaymentSummary.cardTotal)}
                  sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}
                >
                  {collectingTerminalInvoiceID === invoice.invoiceID
                    ? "Preparing Terminal..."
                    : `Collect Card (${formatCurrency(cardPaymentSummary.cardTotal)})`}
                </Button>
                {pendingTerminal && (
                  <Button variant="outlined" onClick={() => onSyncTerminal(invoice.invoiceID, pendingTerminal.paymentIntentId)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                    Refresh Terminal Status
                  </Button>
                )}
              </Stack>
            </>
          )}

          {(invoice.payments || []).length > 0 && (
            <>
              <Divider />
              <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Payments</Typography>
              <Stack spacing={1}>
                {invoice.payments.map((payment, index) => (
                  <Alert key={`${payment.type}-${index}`} severity={payment.status === "completed" ? "success" : payment.status === "cancelled" ? "error" : "info"} sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {payment.type.toUpperCase()} {formatCurrency(payment.amount)} ? {payment.status}
                    </Typography>
                    {payment.paymentIntentId && (
                      <Typography variant="caption" sx={{ display: "block" }}>Intent: {payment.paymentIntentId}</Typography>
                    )}
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {formatDate(payment.createdAt || payment.receivedAt || payment.syncedAt)}
                    </Typography>
                  </Alert>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PaymentPickupPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnCloseoutRepairID = searchParams.get("closeoutRepairID") || "";
  const shouldOpenInvoiceScanner = searchParams.get("scanInvoice") === "1";
  const handledReturnRef = useRef("");
  const handledInvoiceScanOpenRef = useRef(false);
  const [tab, setTab] = useState(0);
  const [closeoutRepairs, setCloseoutRepairs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepairIDs, setSelectedRepairIDs] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [deliveryFee, setDeliveryFee] = useState(5);
  const [batchNotes, setBatchNotes] = useState("");
  const [closeoutNotes, setCloseoutNotes] = useState({});
  const [savingPhotoRepairID, setSavingPhotoRepairID] = useState("");
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [legacyClosing, setLegacyClosing] = useState(false);
  const [collectingTerminalInvoiceID, setCollectingTerminalInvoiceID] = useState("");
  const [closeoutSearch, setCloseoutSearch] = useState("");
  const [closeoutScannerOpen, setCloseoutScannerOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceScannerOpen, setInvoiceScannerOpen] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);
  const [scannedRepairID, setScannedRepairID] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const showMessage = useCallback((message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [closeoutRes, invoicesRes] = await Promise.all([
        fetch("/api/repairs/closeout"),
        fetch("/api/repair-invoices"),
      ]);

      const closeoutData = closeoutRes.ok ? await closeoutRes.json() : [];
      const invoicesData = invoicesRes.ok ? await invoicesRes.json() : [];

      setCloseoutRepairs(Array.isArray(closeoutData) ? closeoutData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setCloseoutNotes(
        Object.fromEntries(
          (Array.isArray(closeoutData) ? closeoutData : []).map((repair) => [repair.repairID, repair.closeoutNotes || ""])
        )
      );
    } catch (error) {
      console.error("Failed to load closeout data:", error);
      showMessage("Failed to load closeout data.", "error");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (authStatus !== "loading" && !canAccessCloseout(session)) {
      router.push("/dashboard");
    }
  }, [authStatus, router, session]);

  useEffect(() => {
    if (authStatus === "authenticated" && canAccessCloseout(session)) {
      loadData();
    }
  }, [authStatus, loadData, session]);

  const draftInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "draft"),
    [invoices]
  );
  const openInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "open"),
    [invoices]
  );
  const paidInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "paid"),
    [invoices]
  );
  const editableInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.paymentStatus !== "paid" && ["draft", "open"].includes(invoice.status)),
    [invoices]
  );
  const selectedRepairs = useMemo(
    () => closeoutRepairs.filter((repair) => selectedRepairIDs.includes(repair.repairID)),
    [closeoutRepairs, selectedRepairIDs]
  );
  const selectedReadyRepairs = useMemo(
    () => selectedRepairs.filter(isReadyForInvoice),
    [selectedRepairs]
  );
  const hasSelectedNotReadyForInvoice = selectedRepairs.length > selectedReadyRepairs.length;
  const scannedRepair = useMemo(
    () => closeoutRepairs.find((r) => r.repairID === scannedRepairID) || null,
    [closeoutRepairs, scannedRepairID]
  );

  useEffect(() => {
    if (!shouldOpenInvoiceScanner || loading || handledInvoiceScanOpenRef.current) return;
    handledInvoiceScanOpenRef.current = true;
    setInvoiceScannerOpen(true);
  }, [loading, shouldOpenInvoiceScanner]);

  useEffect(() => {
    const activeRepairID = returnCloseoutRepairID || getSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY);
    if (!activeRepairID || loading || handledReturnRef.current === activeRepairID) return;
    const repair = closeoutRepairs.find((item) => item.repairID === activeRepairID);
    if (!repair) return;

    handledReturnRef.current = activeRepairID;
    setTab(0);
    setCloseoutSearch(activeRepairID);
    setScannedRepairID(activeRepairID);
  }, [closeoutRepairs, loading, returnCloseoutRepairID]);

  const visibleCloseoutRepairs = useMemo(() => {
    const search = closeoutSearch.trim().toLowerCase();
    if (!search) return closeoutRepairs;

    return closeoutRepairs.filter((repair) => [
      repair.repairID,
      repair.clientName,
      repair.businessName,
      repair.description,
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [closeoutRepairs, closeoutSearch]);

  const filterInvoices = useCallback((invoiceList) => {
    const search = invoiceSearch.trim().toLowerCase();
    if (!search) return invoiceList;

    return invoiceList.filter((invoice) => [
      invoice.invoiceID,
      invoice.customerName,
      invoice.accountID,
      invoice.accountType,
      invoice.paymentStatus,
      ...(invoice.repairIDs || []),
      ...(invoice.repairSnapshots || []).flatMap((repair) => [
        repair.repairID,
        repair.customerName,
      ]),
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [invoiceSearch]);

  const visibleDraftInvoices = useMemo(() => filterInvoices(draftInvoices), [draftInvoices, filterInvoices]);
  const visibleOpenInvoices = useMemo(() => filterInvoices(openInvoices), [openInvoices, filterInvoices]);
  const visiblePaidInvoices = useMemo(() => filterInvoices(paidInvoices), [paidInvoices, filterInvoices]);
  const activeInvoiceList = tab === 1 ? visibleDraftInvoices : tab === 2 ? visibleOpenInvoices : visiblePaidInvoices;
  const activeInvoiceSummary = useMemo(() => summarizeInvoices(activeInvoiceList), [activeInvoiceList]);
  const activeInvoiceTotalPages = Math.max(1, Math.ceil(activeInvoiceList.length / INVOICES_PER_PAGE));
  const activeInvoicePage = Math.min(invoicePage, activeInvoiceTotalPages);
  const paginatedInvoiceList = useMemo(() => {
    const start = (activeInvoicePage - 1) * INVOICES_PER_PAGE;
    return activeInvoiceList.slice(start, start + INVOICES_PER_PAGE);
  }, [activeInvoiceList, activeInvoicePage]);
  const invoicePageStart = activeInvoiceList.length === 0
    ? 0
    : ((activeInvoicePage - 1) * INVOICES_PER_PAGE) + 1;
  const invoicePageEnd = Math.min(activeInvoicePage * INVOICES_PER_PAGE, activeInvoiceList.length);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearch, tab]);

  const handleInvoiceScan = (value) => {
    const invoiceID = normalizeScannedInvoiceID(value);
    if (!invoiceID) return;

    const matchedInvoice = invoices.find((invoice) =>
      String(invoice.invoiceID || "").toLowerCase() === invoiceID.toLowerCase()
    );

    setInvoiceSearch(invoiceID);
    setInvoiceScannerOpen(false);

    if (!matchedInvoice) {
      showMessage(`${invoiceID} was not found in repair invoices.`, "warning");
      return;
    }

    if (matchedInvoice.status === "draft") {
      setTab(1);
    } else if (matchedInvoice.status === "open") {
      setTab(2);
    } else {
      setTab(3);
    }
    showMessage(`Found invoice ${matchedInvoice.invoiceID}.`, "success");
  };

  const toggleRepairSelection = (repairID) => {
    setSelectedRepairIDs((prev) =>
      prev.includes(repairID) ? prev.filter((id) => id !== repairID) : [...prev, repairID]
    );
  };

  const handleCloseoutNoteChange = (repairID, value) => {
    setCloseoutNotes((prev) => ({ ...prev, [repairID]: value }));
  };

  const handleCloseoutScan = (repairID) => {
    const cleanRepairID = String(repairID || "").trim();
    if (!cleanRepairID) return;
    const repair = closeoutRepairs.find((item) => item.repairID === cleanRepairID);
    if (!repair) {
      showMessage(`${cleanRepairID} is not in the Payment & Pickup queue.`, "warning");
      return;
    }
    setCloseoutScannerOpen(false);
    setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, cleanRepairID);
    setScannedRepairID(cleanRepairID);
  };

  const handleSaveCloseoutPhoto = async (repairID, photoFile, noteValue) => {
    try {
      setSavingPhotoRepairID(repairID);
      const formData = new FormData();
      formData.append("afterPhotos", photoFile);
      formData.append("closeoutNotes", noteValue || "");

      const response = await fetch(`/api/repairs/${repairID}/closeout`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save closeout.");
      }

      if (data.autoInvoiceError) {
        setCloseoutRepairs((prev) => prev.map((repair) => (repair.repairID === repairID ? data : repair)));
        showMessage(`Saved photos for ${repairID}, but invoice was not created: ${data.autoInvoiceError}`, "warning");
        return true;
      }

      await loadData();
      showMessage(
        data.autoInvoice?.invoiceID
          ? `Saved photos and added ${repairID} to invoice ${data.autoInvoice.invoiceID}.`
          : `Saved closeout data for ${repairID}.`,
        "success"
      );
      setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
      setScannedRepairID("");
      return true;
    } catch (error) {
      showMessage(error.message, "error");
      return false;
    } finally {
      setSavingPhotoRepairID("");
    }
  };

  const handleCreateInvoice = async () => {
    try {
      if (selectedRepairIDs.length === 0) {
        showMessage("Select at least one completed repair to batch.", "warning");
        return;
      }
      if (hasSelectedNotReadyForInvoice) {
        showMessage("Only repairs with after photos and no pending labor review can be batched into an invoice.", "warning");
        return;
      }
      setSubmittingInvoice(true);
      const response = await fetch("/api/repair-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairIDs: selectedRepairIDs,
          deliveryMethod,
          deliveryFee: deliveryMethod === "delivery" ? parseFloat(deliveryFee || 0) : 0,
          closeoutNotes: batchNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create repair invoice.");
      }

      setSelectedRepairIDs([]);
      setBatchNotes("");
      setDeliveryMethod("pickup");
      setDeliveryFee(5);
      showMessage(`Created invoice ${data.invoiceID}.`, "success");
      await loadData();
      setTab(1);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleLegacyCloseSelected = async () => {
    try {
      if (selectedRepairIDs.length === 0) {
        showMessage("Select at least one legacy repair to close.", "warning");
        return;
      }

      const confirmed = window.confirm(
        `Mark ${selectedRepairIDs.length} selected repair${selectedRepairIDs.length !== 1 ? "s" : ""} as paid and delivered?\n\nThis will remove them from Payment & Pickup without creating invoices or deleting records.`
      );
      if (!confirmed) return;

      setLegacyClosing(true);
      const response = await fetch("/api/repairs/closeout/legacy-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairIDs: selectedRepairIDs,
          note: batchNotes || "Legacy cleanup from Payment & Pickup",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to close selected repairs.");
      }

      setSelectedRepairIDs([]);
      setBatchNotes("");
      await loadData();

      const failed = Array.isArray(data.failed) ? data.failed : [];
      if (failed.length > 0) {
        showMessage(`Closed ${data.closed || 0}; ${failed.length} failed. ${failed.map((item) => `${item.repairID}: ${item.error}`).join(" | ")}`, "warning");
      } else {
        showMessage(`Legacy closed ${data.closed || selectedRepairIDs.length} repair${(data.closed || selectedRepairIDs.length) !== 1 ? "s" : ""}.`, "success");
      }
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLegacyClosing(false);
    }
  };

  const postInvoiceAction = async (url, body, successMessage) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Invoice action failed.");
    }
    showMessage(successMessage, "success");
    await loadData();
    return data;
  };

  const handleFinalizeInvoice = async (invoiceID) => {
    try {
      await postInvoiceAction(`/api/repair-invoices/${invoiceID}/finalize`, {}, `Finalized invoice ${invoiceID}.`);
      setTab(2);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleCashPayment = async (invoiceID, amount, notes, applyCashDiscount = false) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/cash`,
        { amount: parseFloat(amount || 0), notes, applyCashDiscount },
        `Recorded cash payment on ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleCreateStripe = async (invoiceID, amount) => {
    try {
      const data = await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/stripe`,
        { amount: parseFloat(amount || 0), applyCardFee: true },
        `Created Stripe payment intent for ${invoiceID}.`
      );
      if (data?.paymentIntent?.clientSecret) {
        showMessage(`Stripe client secret ready for ${invoiceID}.`, "info");
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleSyncStripe = async (invoiceID, paymentIntentId) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/stripe`,
        { paymentIntentId },
        `Refreshed Stripe status for ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleCardCollected = async (invoiceID, cardSummary) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/card-collected`,
        {
          amount: parseFloat(cardSummary?.cardTotal || 0),
          baseAmount: parseFloat(cardSummary?.baseTotal || 0),
          processingFee: parseFloat(cardSummary?.processingFee || 0),
        },
        `Recorded credit card payment on ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleConvertCashToCard = async (invoiceID) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/convert-cash-to-card`,
        {},
        `Converted cash payment to credit card on ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleCreateTerminal = async (invoiceID, amount) => {
    try {
      setCollectingTerminalInvoiceID(invoiceID);
      const data = await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/terminal`,
        { amount: parseFloat(amount || 0), applyCardFee: true },
        `Opening terminal for ${invoiceID}.`
      );
      const paymentIntentId = data?.paymentIntent?.id || data?.invoice?.stripeTerminalPaymentIntentId || "";
      const terminalSessionToken = data?.terminalSessionToken || "";
      if (!paymentIntentId || !terminalSessionToken) {
        throw new Error("Terminal session was created, but the app link could not be prepared.");
      }

      const terminalUrl = new URL("efd-terminal://collect");
      terminalUrl.searchParams.set("invoiceID", invoiceID);
      terminalUrl.searchParams.set("paymentIntentId", paymentIntentId);
      terminalUrl.searchParams.set("token", terminalSessionToken);
      terminalUrl.searchParams.set("adminUrl", window.location.origin);
      window.location.href = terminalUrl.toString();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setCollectingTerminalInvoiceID("");
    }
  };

  const handleSyncTerminal = async (invoiceID, paymentIntentId) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/terminal`,
        { paymentIntentId },
        `Refreshed terminal payment status for ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleUpdateDelivery = async (invoiceID, deliveryMethod, deliveryFeeValue) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/delivery`,
        {
          deliveryMethod,
          deliveryFee: parseFloat(deliveryFeeValue || 0),
        },
        deliveryMethod === "delivery"
          ? `Marked ${invoiceID} for delivery.`
          : `Marked ${invoiceID} for pickup.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleSetCashDiscount = async (invoiceID, enabled) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/cash-discount`,
        { enabled },
        enabled ? `Applied cash discount to ${invoiceID}.` : `Removed cash discount from ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleSplitInvoice = async (invoiceID, repairIDs) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/split`,
        { repairIDs },
        `Split ${repairIDs.length} repair${repairIDs.length !== 1 ? "s" : ""} from ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleMergeInvoice = async (invoiceID, targetInvoiceID) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/merge`,
        { targetInvoiceID },
        `Merged ${invoiceID} into ${targetInvoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleRemoveRepairsFromInvoice = async (invoiceID, repairIDs) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/remove-repairs`,
        { repairIDs },
        `Moved ${repairIDs.length} repair${repairIDs.length !== 1 ? "s" : ""} back to closeout.`
      );
      setTab(0);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <Box sx={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canAccessCloseout(session)) return null;

  return (
    <Box sx={{ pb: 10, position: "relative" }}>
      <Box
        sx={{
          backgroundColor: { xs: "transparent", sm: REPAIRS_UI.bgPanel },
          border: { xs: "none", sm: `1px solid ${REPAIRS_UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: "none", sm: REPAIRS_UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Typography
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.5,
            mb: 1.5,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: REPAIRS_UI.textPrimary,
            backgroundColor: REPAIRS_UI.bgCard,
            border: `1px solid ${REPAIRS_UI.border}`,
            borderRadius: 2,
            textTransform: "uppercase",
          }}
        >
          <PaymentIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
          Payment & Pickup
        </Typography>

        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
          Repair Closeout and Invoicing
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
          Close out completed repairs, capture after photos, batch invoices, and collect payment.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(event, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 3,
          maxWidth: "100%",
          "& .MuiTabs-scroller": { overflowX: "auto !important" },
          "& .MuiTab-root": { flexShrink: 0, textTransform: "none" },
        }}
      >
        <Tab label={`Completed / Needs Closeout (${closeoutRepairs.length})`} />
        <Tab label={`Draft Invoices (${draftInvoices.length})`} />
        <Tab label={`Open Invoices (${openInvoices.length})`} />
        <Tab label={`Paid / Closed (${paidInvoices.length})`} />
      </Tabs>

      {tab > 0 && (
        <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow, mb: 2 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  label="Find Invoice"
                  placeholder="Scan or search invoice ID, repair ID, customer, or account"
                  value={invoiceSearch}
                  onChange={(event) => setInvoiceSearch(event.target.value)}
                  autoComplete="off"
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<ScanIcon />}
                  onClick={() => setInvoiceScannerOpen(true)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Scan to Search
                </Button>
                <Button
                  variant="outlined"
                  disabled={!invoiceSearch}
                  onClick={() => setInvoiceSearch("")}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Clear
                </Button>
                <Chip label={`${activeInvoiceSummary.count} shown`} />
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                {[
                  ["Invoice Total", formatCurrency(activeInvoiceSummary.total)],
                  ["Collected", formatCurrency(activeInvoiceSummary.collected)],
                  ["Remaining", formatCurrency(activeInvoiceSummary.remaining)],
                  ["Repairs", activeInvoiceSummary.repairs],
                  ["Cash", formatCurrency(activeInvoiceSummary.cash)],
                  ["Card", formatCurrency(activeInvoiceSummary.card)],
                  ["Zelle", formatCurrency(activeInvoiceSummary.zelle)],
                  ["Payments", activeInvoiceSummary.completedPayments],
                ].map(([label, value]) => (
                  <Box
                    key={label}
                    sx={{
                      border: `1px solid ${REPAIRS_UI.border}`,
                      backgroundColor: REPAIRS_UI.bgCard,
                      borderRadius: 2,
                      px: 1.25,
                      py: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>
                      {label}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 700, overflowWrap: "anywhere" }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {activeInvoiceList.length > INVOICES_PER_PAGE && (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                    Showing {invoicePageStart}-{invoicePageEnd} of {activeInvoiceList.length}
                  </Typography>
                  <Pagination
                    page={activeInvoicePage}
                    count={activeInvoiceTotalPages}
                    onChange={(event, value) => setInvoicePage(value)}
                    color="primary"
                    size="small"
                    sx={{
                      alignSelf: { xs: "center", md: "auto" },
                      "& .MuiPaginationItem-root": {
                        color: REPAIRS_UI.textPrimary,
                        borderColor: REPAIRS_UI.border,
                      },
                    }}
                  />
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 0 && (
        <Stack spacing={2.5}>
          <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
            Use the repair editor for missed tasks, materials, and custom charges before batching. After photo is mandatory.
          </Alert>
          <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
            For old repairs that were already paid and delivered outside this invoice workflow, select the cards and use Grace Close Selected. This keeps an audit note and removes them from this queue.
          </Alert>

          <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  label="Find Repair"
                  placeholder="Scan or search repair ID, customer, or description"
                  value={closeoutSearch}
                  onChange={(event) => setCloseoutSearch(event.target.value)}
                  autoComplete="off"
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<ScanIcon />}
                  onClick={() => setCloseoutScannerOpen(true)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Camera Scan
                </Button>
                <Button
                  variant="outlined"
                  disabled={!closeoutSearch}
                  onClick={() => setCloseoutSearch("")}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Clear
                </Button>
                <Chip label={`${visibleCloseoutRepairs.length} shown`} />
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>Batch Selected Repairs</Typography>
                <FormControl>
                  <FormLabel>Delivery Method</FormLabel>
                  <RadioGroup row value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>
                    <FormControlLabel value="pickup" control={<Radio />} label="Pickup" />
                    <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
                  </RadioGroup>
                </FormControl>
                {deliveryMethod === "delivery" && (
                  <TextField label="Invoice Delivery Fee" type="number" value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} sx={{ maxWidth: 220 }} />
                )}
                <TextField label="Invoice Notes" value={batchNotes} onChange={(event) => setBatchNotes(event.target.value)} multiline minRows={2} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Chip label={`${selectedRepairIDs.length} selected`} />
                  <Button variant="contained" disabled={selectedRepairIDs.length === 0 || submittingInvoice} onClick={handleCreateInvoice} sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}>
                    {submittingInvoice ? "Creating Invoice..." : "Create Invoice Batch"}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={selectedRepairIDs.length === 0 || legacyClosing}
                    onClick={handleLegacyCloseSelected}
                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                  >
                    {legacyClosing ? "Closing..." : `Grace Close Selected (${selectedRepairIDs.length})`}
                  </Button>
                </Stack>
                {hasSelectedNotReadyForInvoice && (
                  <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
                    {selectedReadyRepairs.length} selected repair{selectedReadyRepairs.length !== 1 ? "s are" : " is"} invoice-ready. Non-ready selections can still be grace closed.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {closeoutRepairs.length === 0 ? (
            <Alert severity="success" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No completed repairs are waiting for closeout.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {visibleCloseoutRepairs.map((repair) => (
                <Grid item xs={12} lg={6} key={repair.repairID}>
                  <RepairCloseoutCard
                    repair={repair}
                    isSelected={selectedRepairIDs.includes(repair.repairID)}
                    onToggleSelect={toggleRepairSelection}
                    noteValue={closeoutNotes[repair.repairID] || ""}
                    onNoteChange={handleCloseoutNoteChange}
                    photoState={{ loading: savingPhotoRepairID === repair.repairID }}
                    onConfirmCloseout={handleSaveCloseoutPhoto}
                    onEditRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}/edit?returnTo=closeout`)}
                    highlighted={false}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {visibleDraftInvoices.length === 0 ? (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No draft repair invoices.
            </Alert>
          ) : (
            paginatedInvoiceList.map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceID}
                invoice={invoice}
                mergeTargets={editableInvoices.filter((target) =>
                  target.invoiceID !== invoice.invoiceID
                  && target.accountType === invoice.accountType
                  && target.accountID === invoice.accountID
                )}
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCardCollected={handleCardCollected}
                onConvertCashToCard={handleConvertCashToCard}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
                collectingTerminalInvoiceID={collectingTerminalInvoiceID}
                onUpdateDelivery={handleUpdateDelivery}
                onSetCashDiscount={handleSetCashDiscount}
                onSplitInvoice={handleSplitInvoice}
                onMergeInvoice={handleMergeInvoice}
                onRemoveRepairs={handleRemoveRepairsFromInvoice}
              />
            ))
          )}
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          {visibleOpenInvoices.length === 0 ? (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No open repair invoices.
            </Alert>
          ) : (
            paginatedInvoiceList.map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceID}
                invoice={invoice}
                mergeTargets={editableInvoices.filter((target) =>
                  target.invoiceID !== invoice.invoiceID
                  && target.accountType === invoice.accountType
                  && target.accountID === invoice.accountID
                )}
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCardCollected={handleCardCollected}
                onConvertCashToCard={handleConvertCashToCard}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
                collectingTerminalInvoiceID={collectingTerminalInvoiceID}
                onUpdateDelivery={handleUpdateDelivery}
                onSetCashDiscount={handleSetCashDiscount}
                onSplitInvoice={handleSplitInvoice}
                onMergeInvoice={handleMergeInvoice}
                onRemoveRepairs={handleRemoveRepairsFromInvoice}
              />
            ))
          )}
        </Stack>
      )}

      {tab === 3 && (
        <Stack spacing={2}>
          {visiblePaidInvoices.length === 0 ? (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No paid repair invoices yet.
            </Alert>
          ) : (
            paginatedInvoiceList.map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceID}
                invoice={invoice}
                mergeTargets={[]}
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCardCollected={handleCardCollected}
                onConvertCashToCard={handleConvertCashToCard}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
                collectingTerminalInvoiceID={collectingTerminalInvoiceID}
                onUpdateDelivery={handleUpdateDelivery}
                onSetCashDiscount={handleSetCashDiscount}
                onSplitInvoice={handleSplitInvoice}
                onMergeInvoice={handleMergeInvoice}
                onRemoveRepairs={handleRemoveRepairsFromInvoice}
              />
            ))
          )}
        </Stack>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={Boolean(scannedRepairID)}
        onClose={() => {
          setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
          setScannedRepairID("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>
            {scannedRepair ? (scannedRepair.clientName || scannedRepair.businessName || scannedRepair.repairID) : scannedRepairID}
          </Typography>
          <IconButton
            onClick={() => {
              setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
              setScannedRepairID("");
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {scannedRepair ? (
            <RepairCloseoutCard
              repair={scannedRepair}
              isSelected={selectedRepairIDs.includes(scannedRepair.repairID)}
              onToggleSelect={toggleRepairSelection}
              noteValue={closeoutNotes[scannedRepair.repairID] || ""}
              onNoteChange={handleCloseoutNoteChange}
              photoState={{ loading: savingPhotoRepairID === scannedRepair.repairID }}
              onConfirmCloseout={handleSaveCloseoutPhoto}
              onEditRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}/edit?returnTo=closeout`)}
              highlighted={false}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Alert severity="warning">
                {scannedRepairID} is no longer in the Payment & Pickup queue.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
              setScannedRepairID("");
            }}
            sx={{ color: REPAIRS_UI.textSecondary }}
          >
            Done
          </Button>
          <Button
            variant="contained"
            startIcon={<ScanIcon />}
            onClick={() => {
              setSessionValue(CLOSEOUT_ACTIVE_REPAIR_KEY, "");
              setScannedRepairID("");
              setCloseoutScannerOpen(true);
            }}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}
          >
            Scan Next Repair
          </Button>
        </DialogActions>
      </Dialog>

      <ContinuousBarcodeScanner
        open={closeoutScannerOpen}
        title="Scan Repair"
        actionLabel="Close"
        onScan={handleCloseoutScan}
        onClose={() => setCloseoutScannerOpen(false)}
        onAction={() => setCloseoutScannerOpen(false)}
      >
        <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
          Scan a repair ticket barcode to open its closeout dialog. When done, scan the next repair.
        </Alert>
      </ContinuousBarcodeScanner>

      <ContinuousBarcodeScanner
        open={invoiceScannerOpen}
        title="Scan Invoice"
        actionLabel="Close"
        onScan={handleInvoiceScan}
        onClose={() => setInvoiceScannerOpen(false)}
        onAction={() => setInvoiceScannerOpen(false)}
      >
        <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
          Scan the QR code at the bottom of a printed invoice to jump to that invoice.
        </Alert>
      </ContinuousBarcodeScanner>
    </Box>
  );
}
