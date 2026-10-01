import { normalizeScannedInvoiceID, setSessionValue, CLOSEOUT_ACTIVE_REPAIR_KEY } from './pickupHelpers';

/**
 * The Payment & Pickup page's scan and closeout actions: invoice scan, repair selection, closeout notes and photo, create an invoice batch, legacy close. Moved verbatim out of page.js (max-lines burn-down); a plain factory the page calls each render.
 */
export function closeoutActions({ batchNotes, closeoutRepairs, deliveryFee, deliveryMethod, invoices, loadData, selectedMissingPhotoCount, selectedRepairIDs, setBatchNotes, setCloseoutNotes, setCloseoutRepairs, setCloseoutScannerOpen, setDeliveryFee, setDeliveryMethod, setInvoiceScannerOpen, setInvoiceSearch, setLegacyClosing, setSavingPhotoRepairID, setScannedRepairID, setSelectedRepairIDs, setSubmittingInvoice, setTab, showMessage }) {
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

  return {
    handleInvoiceScan,
    toggleRepairSelection,
    handleCloseoutNoteChange,
    handleCloseoutScan,
    handleSaveCloseoutPhoto,
    handleCreateInvoice,
    handleLegacyCloseSelected,
  };
}
