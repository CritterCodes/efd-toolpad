/**
 * The Payment & Pickup page's invoice actions: finalize, pay link, picked up, reopen, every payment path
 * (cash, Stripe, card collected, terminal), delivery, split, merge, remove repairs. Moved verbatim out of
 * page.js (max-lines burn-down); each posts to /api/repair-invoices/[invoiceID]/…, reports through
 * `showMessage` and reloads the page data. A plain factory (no React hooks inside), called once per render.
 */
export function invoiceActions({ showMessage, loadData, setTab, setCollectingTerminalInvoiceID }) {
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

  return {
    handleFinalizeInvoice,
    handlePayLink,
    handlePickedUp,
    handleReopenInvoice,
    handleCashPayment,
    handleCreateStripe,
    handleSyncStripe,
    handleCardCollected,
    handleConvertCashToCard,
    handleCreateTerminal,
    handleSyncTerminal,
    handleUpdateDelivery,
    handleSplitInvoice,
    handleMergeInvoice,
    handleRemoveRepairsFromInvoice,
  };
}
