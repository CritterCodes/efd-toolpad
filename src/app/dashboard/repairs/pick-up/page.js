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
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
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

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getRepairDisplayTotal(repair) {
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
  return afterPhotoCount > 0 && repair.requiresLaborReview !== true;
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
  const blockedForReview = repair.requiresLaborReview === true;
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
    if (!pendingPhoto || blockedForReview || photoState.loading) return;
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

          {blockedForReview && (
            <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              Labor review is still pending. Resolve it before batching this repair into an invoice.
            </Alert>
          )}

          {!blockedForReview && afterPhotoCount === 0 && (
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
              disabled={!pendingPhoto || blockedForReview || photoState.loading}
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
  onCreateTerminal,
  onSyncTerminal,
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
  const pendingStripe = (invoice.payments || []).find((payment) => payment.type === "stripe" && payment.status === "pending");
  const pendingTerminal = (invoice.payments || []).find((payment) => payment.type === "terminal" && payment.status === "pending");
  const canEditInvoice = invoice.paymentStatus !== "paid" && ["draft", "open"].includes(invoice.status);
  const splitDisabled = selectedRepairIDs.length === 0 || selectedRepairIDs.length >= (invoice.repairIDs || []).length;

  useEffect(() => {
    setCashAmount(invoice.remainingBalance || 0);
    setDeliveryFeeInput(invoice.deliveryFee || 5);
  }, [invoice.deliveryFee, invoice.remainingBalance]);

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
            </Stack>
          </Box>

          <Grid container spacing={1.5}>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Subtotal</Typography><Typography>{formatCurrency(invoice.subtotal)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Tax</Typography><Typography>{formatCurrency(invoice.taxAmount)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Delivery</Typography><Typography>{formatCurrency(invoice.deliveryFee)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Remaining</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(invoice.remainingBalance)}</Typography></Grid>
            {parseFloat(invoice.cashDiscountAmount || 0) > 0 && (
              <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Cash Discount</Typography><Typography>{formatCurrency(invoice.cashDiscountAmount)}</Typography></Grid>
            )}
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
                <TextField
                  label="Delivery Fee"
                  type="number"
                  size="small"
                  value={deliveryFeeInput}
                  onChange={(event) => setDeliveryFeeInput(event.target.value)}
                  sx={{ maxWidth: 160 }}
                />
                <Button
                  variant={invoice.deliveryMethod === "delivery" ? "contained" : "outlined"}
                  onClick={() => onUpdateDelivery(invoice.invoiceID, "delivery", deliveryFeeInput || 5)}
                  sx={{ backgroundColor: invoice.deliveryMethod === "delivery" ? REPAIRS_UI.accent : undefined, color: invoice.deliveryMethod === "delivery" ? "#111" : REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Mark Delivery
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => onUpdateDelivery(invoice.invoiceID, "pickup", 0)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Mark Pickup
                </Button>
                <Button
                  variant={invoice.cashDiscountApplied ? "contained" : "outlined"}
                  onClick={() => onSetCashDiscount(invoice.invoiceID, !invoice.cashDiscountApplied)}
                  sx={{ backgroundColor: invoice.cashDiscountApplied ? REPAIRS_UI.accent : undefined, color: invoice.cashDiscountApplied ? "#111" : REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  {invoice.cashDiscountApplied ? "Remove Cash Discount" : "Cash Discount"}
                </Button>
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

          {invoice.paymentStatus !== "paid" && (
            <>
              <Divider />
              <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Record Payment</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField label="Cash Amount" type="number" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} sx={{ minWidth: 140 }} />
                <TextField label="Cash Notes" value={cashNotes} onChange={(event) => setCashNotes(event.target.value)} sx={{ flex: 1 }} />
                <Button variant="contained" onClick={() => onCashPay(invoice.invoiceID, cashAmount, cashNotes)} sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}>
                  Record Cash
                </Button>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Button variant="outlined" onClick={() => onCreateStripe(invoice.invoiceID)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                  Create Stripe Payment Intent
                </Button>
                {pendingStripe && (
                  <Button variant="outlined" onClick={() => onSyncStripe(invoice.invoiceID, pendingStripe.paymentIntentId)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                    Refresh Stripe Status
                  </Button>
                )}
                <Button variant="outlined" onClick={() => onCreateTerminal(invoice.invoiceID)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                  Create Terminal Intent
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
  const handledReturnRef = useRef("");
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
  const [closeoutSearch, setCloseoutSearch] = useState("");
  const [closeoutScannerOpen, setCloseoutScannerOpen] = useState(false);
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

  const draftOrOpenInvoices = useMemo(
    () => invoices.filter((invoice) => ["draft", "open"].includes(invoice.status)),
    [invoices]
  );
  const paidInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "paid"),
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
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleCashPayment = async (invoiceID, amount, notes) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/cash`,
        { amount: parseFloat(amount || 0), notes },
        `Recorded cash payment on ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleCreateStripe = async (invoiceID) => {
    try {
      const data = await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/stripe`,
        {},
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

  const handleCreateTerminal = async (invoiceID) => {
    try {
      await postInvoiceAction(
        `/api/repair-invoices/${invoiceID}/payments/terminal`,
        {},
        `Created Stripe Terminal intent for ${invoiceID}.`
      );
    } catch (error) {
      showMessage(error.message, "error");
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
        <Tab label={`Draft / Open Invoices (${draftOrOpenInvoices.length})`} />
        <Tab label={`Paid / Closed (${paidInvoices.length})`} />
      </Tabs>

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
          {draftOrOpenInvoices.length === 0 ? (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No draft or open repair invoices.
            </Alert>
          ) : (
            draftOrOpenInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceID}
                invoice={invoice}
                mergeTargets={draftOrOpenInvoices.filter((target) =>
                  target.invoiceID !== invoice.invoiceID
                  && target.accountType === invoice.accountType
                  && target.accountID === invoice.accountID
                  && target.paymentStatus !== "paid"
                )}
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
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
          {paidInvoices.length === 0 ? (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              No paid repair invoices yet.
            </Alert>
          ) : (
            paidInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceID}
                invoice={invoice}
                mergeTargets={[]}
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
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
    </Box>
  );
}
