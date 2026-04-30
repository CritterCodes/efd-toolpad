"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
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

function formatCurrency(amount) {
  return currency.format(parseFloat(amount || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getRepairDisplayTotal(repair) {
  return parseFloat(repair.totalCost || 0);
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
  uploadState,
  onUpload,
  onEditRepair,
  highlighted,
}) {
  const [files, setFiles] = useState([]);
  const afterPhotoCount = Array.isArray(repair.afterPhotos) ? repair.afterPhotos.length : 0;
  const blockedForReview = repair.requiresLaborReview === true;
  const batchReady = isReadyForInvoice(repair);

  const handleUploadClick = () => {
    if (!files.length) return;
    onUpload(repair.repairID, files, noteValue);
    setFiles([]);
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
              At least one after photo is required before this repair can be batched.
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              component="label"
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Choose After Photos
              <input hidden multiple type="file" accept="image/*" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            </Button>
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: "0.8rem", flex: 1 }}>
              {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} queued` : "No new files selected"}
            </Typography>
            <Button
              variant="contained"
              onClick={handleUploadClick}
              disabled={files.length === 0 || uploadState.loading}
              sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}
            >
              {uploadState.loading ? "Uploading..." : "Save Closeout"}
            </Button>
          </Stack>

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
            <Chip
              label={batchReady ? "Ready to batch" : "Needs closeout work"}
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
  onFinalize,
  onCashPay,
  onCreateStripe,
  onSyncStripe,
  onCreateTerminal,
  onSyncTerminal,
}) {
  const [cashAmount, setCashAmount] = useState(invoice.remainingBalance || 0);
  const [cashNotes, setCashNotes] = useState("");
  const pendingStripe = (invoice.payments || []).find((payment) => payment.type === "stripe" && payment.status === "pending");
  const pendingTerminal = (invoice.payments || []).find((payment) => payment.type === "terminal" && payment.status === "pending");

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
          </Grid>

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.75 }}>Repairs in invoice</Typography>
            <Stack spacing={0.75}>
              {(invoice.repairSnapshots || []).map((repair) => (
                <Box key={repair.repairID} sx={{ display: "flex", justifyContent: "space-between", gap: 2, color: REPAIRS_UI.textSecondary, fontSize: "0.9rem" }}>
                  <Typography sx={{ fontFamily: "monospace" }}>{repair.repairID}</Typography>
                  <Typography>{formatCurrency(repair.total)}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

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
  const [tab, setTab] = useState(0);
  const [closeoutRepairs, setCloseoutRepairs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepairIDs, setSelectedRepairIDs] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [deliveryFee, setDeliveryFee] = useState(5);
  const [batchNotes, setBatchNotes] = useState("");
  const [closeoutNotes, setCloseoutNotes] = useState({});
  const [uploadingRepairID, setUploadingRepairID] = useState("");
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [legacyClosing, setLegacyClosing] = useState(false);
  const [closeoutSearch, setCloseoutSearch] = useState("");
  const [closeoutScannerOpen, setCloseoutScannerOpen] = useState(false);
  const [highlightedRepairID, setHighlightedRepairID] = useState("");
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
      showMessage(`${cleanRepairID} is not currently waiting in Payment & Pickup.`, "warning");
      setCloseoutSearch(cleanRepairID);
      setHighlightedRepairID("");
      return;
    }

    setCloseoutSearch(cleanRepairID);
    setHighlightedRepairID(cleanRepairID);
    setSelectedRepairIDs((prev) => (
      prev.includes(cleanRepairID) ? prev : [...prev, cleanRepairID]
    ));
    showMessage(`Selected ${cleanRepairID}.`, "success");
  };

  const handleUploadCloseout = async (repairID, files, noteValue) => {
    try {
      setUploadingRepairID(repairID);
      const formData = new FormData();
      files.forEach((file) => formData.append("afterPhotos", file));
      formData.append("closeoutNotes", noteValue || "");

      const response = await fetch(`/api/repairs/${repairID}/closeout`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save closeout.");
      }

      setCloseoutRepairs((prev) => prev.map((repair) => (repair.repairID === repairID ? data : repair)));
      showMessage(`Saved closeout data for ${repairID}.`, "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setUploadingRepairID("");
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

      <Tabs value={tab} onChange={(event, value) => setTab(value)} sx={{ mb: 3 }}>
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
                  onChange={(event) => {
                    setCloseoutSearch(event.target.value);
                    setHighlightedRepairID("");
                  }}
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
                  disabled={!closeoutSearch && !highlightedRepairID}
                  onClick={() => {
                    setCloseoutSearch("");
                    setHighlightedRepairID("");
                  }}
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
                    uploadState={{ loading: uploadingRepairID === repair.repairID }}
                    onUpload={handleUploadCloseout}
                    onEditRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}/edit`)}
                    highlighted={highlightedRepairID === repair.repairID}
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
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
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
                onFinalize={handleFinalizeInvoice}
                onCashPay={handleCashPayment}
                onCreateStripe={handleCreateStripe}
                onSyncStripe={handleSyncStripe}
                onCreateTerminal={handleCreateTerminal}
                onSyncTerminal={handleSyncTerminal}
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

      <ContinuousBarcodeScanner
        open={closeoutScannerOpen}
        title="Scan Closeout Repairs"
        queuedCount={selectedRepairIDs.length}
        actionLabel="Done"
        onScan={handleCloseoutScan}
        onClose={() => setCloseoutScannerOpen(false)}
        onAction={() => setCloseoutScannerOpen(false)}
      >
        <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
          Scan each repair ticket while the camera stays open. Matching repairs are selected and the latest scan is highlighted when you return to the list.
        </Alert>
      </ContinuousBarcodeScanner>
    </Box>
  );
}
