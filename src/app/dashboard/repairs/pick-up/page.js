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
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Pagination,
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
  QrCodeScanner as ScanIcon,
} from "@mui/icons-material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import ContinuousBarcodeScanner from "@/components/repairs/ContinuousBarcodeScanner";
import { canAccessCloseout, canReopenInvoices as canReopenInvoicesGate } from "@/lib/repairAccess";
import { hasAfterPhoto } from './invoicePrint';
import { CLOSEOUT_ACTIVE_REPAIR_KEY, INVOICES_PER_PAGE, formatCurrency, getSessionValue, normalizeScannedInvoiceID, setSessionValue, summarizeInvoices } from './pickupHelpers';
import { RepairCloseoutCard } from './RepairCloseoutCard';
import { InvoiceCard } from './InvoiceCard';

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
  // Informational only — how many selected repairs lack an after photo. Previously this drove a hard
  // refusal in handleCreateInvoice; it now just surfaces a reminder banner.
  const selectedMissingPhotoCount = useMemo(
    () => selectedRepairs.filter((repair) => !hasAfterPhoto(repair)).length,
    [selectedRepairs]
  );
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
      // Photo is optional now — appending a null would post the string "null" as a file part, which the
      // closeout route would try to upload. Only send the part when there's an actual file.
      if (photoFile) formData.append("afterPhotos", photoFile);
      formData.append("closeoutNotes", noteValue || "");

      const response = await fetch(`/api/repairs/${repairID}/closeout`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save closeout.");
      }

      // Say what actually happened. A photo is optional now, so these strings can no longer claim one was
      // saved — and since auto-invoice fires on every confirm, the invoice branch is the NORMAL path here,
      // not the exception.
      const savedWhat = photoFile ? "Closed out with photo" : "Closed out";

      if (data.autoInvoiceError) {
        setCloseoutRepairs((prev) => prev.map((repair) => (repair.repairID === repairID ? data : repair)));
        showMessage(`${savedWhat} ${repairID}, but invoice was not created: ${data.autoInvoiceError}`, "warning");
        return true;
      }

      await loadData();
      showMessage(
        data.autoInvoice?.invoiceID
          ? `${savedWhat} — ${repairID} added to invoice ${data.autoInvoice.invoiceID}.`
          : `${savedWhat} ${repairID}.`,
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
      // The after-photo precondition was removed here (owner, 2026-07-31): a missing photo was stopping
      // finished work from being billed. Nothing else was ever enforced at this point — the old warning
      // also claimed to check labor review, but requiresLaborReview is not a batching blocker anywhere.
      //
      // That warning was also the only thing standing between a stray tap and a batch of bills. Grace
      // Close beside it confirms; this bills real money for N repairs and now does too. Same one-way door
      // as the per-card confirm: invoiced repairs leave this queue and their after photos become
      // unwritable without pulling them back off the invoice.
      const count = selectedRepairIDs.length;
      const missingPhotos = selectedMissingPhotoCount;
      const confirmed = window.confirm(
        `Create an invoice batch for ${count} repair${count !== 1 ? "s" : ""}?\n\n`
        + `This bills them and moves them out of Payment & Pickup.`
        + (missingPhotos > 0
          ? `\n\n${missingPhotos} of them ${missingPhotos !== 1 ? "have" : "has"} no after photo. That's allowed — but to add one later you'd have to remove that repair from its invoice first.`
          : '')
      );
      if (!confirmed) return;

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

  const handleFinalizeInvoice = async (invoiceID, fulfillment = { method: "pickup" }) => {
    try {
      const data = await postInvoiceAction(`/api/repair-invoices/${invoiceID}/finalize`, fulfillment, `Finalized invoice ${invoiceID}.`);
      // Wholesale invoices notify the partner on finalize — report what was actually delivered,
      // because "we sent an email" has been fiction in this app before.
      const summary = data?.notification;
      if (summary && !summary.skipped) {
        if (summary.notified > 0 && summary.emailed > 0) {
          showMessage(`Finalized invoice ${invoiceID}. Partner notified — email sent to ${summary.recipients.join(", ")}.`, "success");
        } else if (summary.notified > 0) {
          showMessage(`Finalized invoice ${invoiceID}. Partner notified in-app, but the email did not send — follow up by hand. ${summary.errors.join(" ")}`, "warning");
        } else {
          showMessage(`Finalized invoice ${invoiceID}, but the partner was NOT notified. ${summary.errors.join(" ")}`, "warning");
        }
      }
      // The retail half: finalizing is what tells the customer their work is ready (owner,
      // 2026-09-29). Reported the same way — silence here used to mean nobody could tell whether
      // the customer had actually heard.
      const pickup = data?.pickupNotice;
      if (pickup?.sent) {
        showMessage(
          `Finalized invoice ${invoiceID}. Customer notified${pickup.recipientEmail ? ` — email sent to ${pickup.recipientEmail}` : " in-app"}.`,
          "success",
        );
      } else if (pickup && !["no retail customer repairs on this invoice", "already notified"].includes(pickup.reason)) {
        showMessage(`Finalized invoice ${invoiceID}, but the customer was NOT notified: ${pickup.reason}`, "warning");
      }
      setTab(2);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Reopen is the ONE action on this page whose route requires role admin —
  // api/repair-invoices/[invoiceID]/reopen uses requireRole(['admin']), while every other action here
  // uses requireRepairOpsAny(['qualityControl','closeoutBilling']). Non-admins must not be offered it;
  // the card renders the block behind `onReopen &&`, so withholding the prop hides it rather than
  // handing onsite staff a button that 403s.
  const canReopenInvoices = canReopenInvoicesGate(session);

  const handlePayLink = async (invoiceID, resend) => {
    try {
      const response = await fetch(`/api/repair-invoices/${invoiceID}/pay-link`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resend: resend === true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not build the pay link.");
      try { await navigator.clipboard.writeText(data.url); } catch { /* clipboard may be blocked; the link is still in the toast */ }
      const sent = (data.resent || []).filter((r) => r.sent).length;
      showMessage(resend ? (sent > 0 ? `Ready notice re-sent (${sent}). Pay link copied: ${data.url}` : `Notice not sent: ${(data.resent || [])[0]?.reason || "no customer contact"}. Link: ${data.url}`) : `Pay link copied: ${data.url}`, sent > 0 || !resend ? "success" : "warning");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handlePickedUp = async (invoiceID) => {
    try {
      await postInvoiceAction(`/api/repair-invoices/${invoiceID}/picked-up`, {}, `${invoiceID} handed over — repairs closed.`);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleReopenInvoice = async (invoiceID) => {
    try {
      await postInvoiceAction(`/api/repair-invoices/${invoiceID}/reopen`, {}, `Reopened invoice ${invoiceID}.`);
      setTab(2);
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

        <Typography component="h1" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
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
                {/* Manual batches are created as pickup drafts; how they go back (pickup or ship) is decided
                    at Finalize. Hand delivery is no longer offered (owner, 2026-09-21). */}
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
                onSplitInvoice={handleSplitInvoice}
                onMergeInvoice={handleMergeInvoice}
                onRemoveRepairs={handleRemoveRepairsFromInvoice}
                onPayLink={handlePayLink}
                onPickedUp={handlePickedUp}
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
                onSplitInvoice={handleSplitInvoice}
                onMergeInvoice={handleMergeInvoice}
                onRemoveRepairs={handleRemoveRepairsFromInvoice}
                onPayLink={handlePayLink}
                onPickedUp={handlePickedUp}
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
                onSplitInvoice={handleSplitInvoice}
                onMergeInvoice={handleMergeInvoice}
                onRemoveRepairs={handleRemoveRepairsFromInvoice}
                onPayLink={handlePayLink}
                onPickedUp={handlePickedUp}
                onReopen={canReopenInvoices ? handleReopenInvoice : undefined}
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
