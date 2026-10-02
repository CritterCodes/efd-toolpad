"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  CircularProgress,
  Snackbar,
  Typography,
} from "@mui/material";
import { TabRail } from "@/components/facelift";
import {
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import ContinuousBarcodeScanner from "@/components/repairs/ContinuousBarcodeScanner";
import { canAccessCloseout, canReopenInvoices as canReopenInvoicesGate } from "@/lib/repairAccess";
import { hasAfterPhoto } from './invoicePrint';
import { CLOSEOUT_ACTIVE_REPAIR_KEY, getSessionValue } from './pickupHelpers';
import { invoiceActions } from './invoiceActions';
import { useInvoiceList } from './useInvoiceList';
import { ScannedRepairDialog } from './ScannedRepairDialog';
import { InvoiceTabs } from './InvoiceTabs';
import { CloseoutTab } from './CloseoutTab';
import { InvoiceListToolbar } from './InvoiceListToolbar';
import { closeoutActions } from './closeoutActions';

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

  const {
    draftInvoices, openInvoices, paidInvoices,
    editableInvoices, visibleDraftInvoices, visibleOpenInvoices, visiblePaidInvoices,
    activeInvoiceList, activeInvoiceSummary, activeInvoiceTotalPages, activeInvoicePage,
    paginatedInvoiceList, invoicePageStart, invoicePageEnd,
  } = useInvoiceList({ invoices, invoiceSearch, tab, invoicePage });

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearch, tab]);

  const {
    handleInvoiceScan, toggleRepairSelection, handleCloseoutNoteChange, handleCloseoutScan,
    handleSaveCloseoutPhoto, handleCreateInvoice, handleLegacyCloseSelected,
  } = closeoutActions({
    batchNotes, closeoutRepairs, deliveryFee, deliveryMethod, invoices, loadData, selectedMissingPhotoCount,
    selectedRepairIDs, setBatchNotes, setCloseoutNotes, setCloseoutRepairs, setCloseoutScannerOpen,
    setDeliveryFee, setDeliveryMethod, setInvoiceScannerOpen, setInvoiceSearch, setLegacyClosing,
    setSavingPhotoRepairID, setScannedRepairID, setSelectedRepairIDs, setSubmittingInvoice, setTab,
    showMessage,
  });

  const {
    handleFinalizeInvoice, handlePayLink, handlePickedUp, handleReopenInvoice, handleCashPayment,
    handleCreateStripe, handleSyncStripe, handleCardCollected, handleConvertCashToCard, handleCreateTerminal,
    handleSyncTerminal, handleUpdateDelivery, handleSplitInvoice, handleMergeInvoice,
    handleRemoveRepairsFromInvoice,
  } = invoiceActions({ showMessage, loadData, setTab, setCollectingTerminalInvoiceID });

  // Reopen is the ONE action on this page whose route requires role admin —
  // api/repair-invoices/[invoiceID]/reopen uses requireRole(['admin']), while every other action here
  // uses requireRepairOpsAny(['qualityControl','closeoutBilling']). Non-admins must not be offered it;
  // the card renders the block behind `onReopen &&`, so withholding the prop hides it rather than
  // handing onsite staff a button that 403s.
  const canReopenInvoices = canReopenInvoicesGate(session);

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

      {/* TabRail, not MUI Tabs: MUI's scroll buttons never render on a touch screen, so the last tabs
          here were reachable only by an undiscoverable swipe. */}
      <Box sx={{ mb: 3 }}>
        <TabRail
          ariaLabel="Closeout and invoices"
          value={tab}
          onChange={setTab}
          items={[
            { key: 0, label: "Completed / Needs Closeout", count: closeoutRepairs.length },
            { key: 1, label: "Draft Invoices", count: draftInvoices.length },
            { key: 2, label: "Open Invoices", count: openInvoices.length },
            { key: 3, label: "Paid / Closed", count: paidInvoices.length },
          ]}
        />
      </Box>

      <InvoiceListToolbar
        activeInvoiceList={activeInvoiceList}
        activeInvoicePage={activeInvoicePage}
        activeInvoiceSummary={activeInvoiceSummary}
        activeInvoiceTotalPages={activeInvoiceTotalPages}
        invoicePageEnd={invoicePageEnd}
        invoicePageStart={invoicePageStart}
        invoiceSearch={invoiceSearch}
        setInvoicePage={setInvoicePage}
        setInvoiceScannerOpen={setInvoiceScannerOpen}
        setInvoiceSearch={setInvoiceSearch}
        tab={tab}
      />

      <CloseoutTab
        batchNotes={batchNotes}
        closeoutNotes={closeoutNotes}
        closeoutRepairs={closeoutRepairs}
        closeoutSearch={closeoutSearch}
        handleCloseoutNoteChange={handleCloseoutNoteChange}
        handleCreateInvoice={handleCreateInvoice}
        handleLegacyCloseSelected={handleLegacyCloseSelected}
        handleSaveCloseoutPhoto={handleSaveCloseoutPhoto}
        legacyClosing={legacyClosing}
        router={router}
        savingPhotoRepairID={savingPhotoRepairID}
        selectedRepairIDs={selectedRepairIDs}
        setBatchNotes={setBatchNotes}
        setCloseoutScannerOpen={setCloseoutScannerOpen}
        setCloseoutSearch={setCloseoutSearch}
        submittingInvoice={submittingInvoice}
        tab={tab}
        toggleRepairSelection={toggleRepairSelection}
        visibleCloseoutRepairs={visibleCloseoutRepairs}
      />

      <InvoiceTabs
        canReopenInvoices={canReopenInvoices}
        collectingTerminalInvoiceID={collectingTerminalInvoiceID}
        editableInvoices={editableInvoices}
        handleCardCollected={handleCardCollected}
        handleCashPayment={handleCashPayment}
        handleConvertCashToCard={handleConvertCashToCard}
        handleCreateStripe={handleCreateStripe}
        handleCreateTerminal={handleCreateTerminal}
        handleFinalizeInvoice={handleFinalizeInvoice}
        handleMergeInvoice={handleMergeInvoice}
        handlePayLink={handlePayLink}
        handlePickedUp={handlePickedUp}
        handleRemoveRepairsFromInvoice={handleRemoveRepairsFromInvoice}
        handleReopenInvoice={handleReopenInvoice}
        handleSplitInvoice={handleSplitInvoice}
        handleSyncStripe={handleSyncStripe}
        handleSyncTerminal={handleSyncTerminal}
        handleUpdateDelivery={handleUpdateDelivery}
        paginatedInvoiceList={paginatedInvoiceList}
        tab={tab}
        visibleDraftInvoices={visibleDraftInvoices}
        visibleOpenInvoices={visibleOpenInvoices}
        visiblePaidInvoices={visiblePaidInvoices}
      />

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ScannedRepairDialog
        closeoutNotes={closeoutNotes}
        handleCloseoutNoteChange={handleCloseoutNoteChange}
        handleSaveCloseoutPhoto={handleSaveCloseoutPhoto}
        router={router}
        savingPhotoRepairID={savingPhotoRepairID}
        scannedRepair={scannedRepair}
        scannedRepairID={scannedRepairID}
        selectedRepairIDs={selectedRepairIDs}
        setCloseoutScannerOpen={setCloseoutScannerOpen}
        setScannedRepairID={setScannedRepairID}
        toggleRepairSelection={toggleRepairSelection}
      />

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
