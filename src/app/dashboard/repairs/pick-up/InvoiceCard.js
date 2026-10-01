import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, Stack, Box, Typography, Chip, Button, Alert, Grid, Divider, Checkbox, TextField } from "@mui/material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import FinalizeFulfillment from "./FinalizeFulfillment";
import { formatCurrency, getCardPaymentSummary, getCashPaymentSummary, getFullInvoiceCardSummary } from './pickupHelpers';
import { formatDate, printInvoice } from './invoicePrint';

export function InvoiceCard({
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
  onSplitInvoice,
  onMergeInvoice,
  onRemoveRepairs,
  onReopen,
  onPayLink,
  onPickedUp,
}) {
  const [cashAmount, setCashAmount] = useState(invoice.remainingBalance || 0);
  const isRetail = invoice.accountType !== "wholesale";
  const paidAheadAwaitingPickup = isRetail && invoice.paymentStatus === "paid" && Boolean(invoice.paidAheadAt) && !invoice.pickedUpAt;
  const [cashNotes, setCashNotes] = useState("");
  const [selectedRepairIDs, setSelectedRepairIDs] = useState([]);
  const [targetInvoiceID, setTargetInvoiceID] = useState("");
  const cashPaymentSummary = useMemo(() => getCashPaymentSummary(invoice), [invoice]);
  const cardPaymentSummary = useMemo(() => getCardPaymentSummary(invoice), [invoice]);
  const fullInvoiceCardSummary = useMemo(() => getFullInvoiceCardSummary(invoice), [invoice]);
  const pendingStripe = (invoice.payments || []).find((payment) => payment.type === "stripe" && payment.status === "pending");
  const pendingTerminal = (invoice.payments || []).find((payment) => payment.type === "terminal" && payment.status === "pending");
  const hasCompletedCashPayment = (invoice.payments || []).some((payment) => payment.type === "cash" && payment.status === "completed");
  const canEditInvoice = invoice.paymentStatus !== "paid" && ["draft", "open"].includes(invoice.status);
  const splitDisabled = selectedRepairIDs.length === 0 || selectedRepairIDs.length >= (invoice.repairIDs || []).length;

  useEffect(() => {
    setCashAmount(cashPaymentSummary.cashTotal || invoice.remainingBalance || 0);
  }, [cashPaymentSummary.cashTotal, invoice.remainingBalance]);

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
              <Chip label={invoice.deliveryMethod === "ship" ? `Ship${invoice.fulfillment?.shipping?.rate ? ` · ${invoice.fulfillment.shipping.rate.carrier}` : ""}` : invoice.deliveryMethod === "delivery" ? "Delivery" : "Pickup"} size="small" />
              <Button
                size="small"
                variant="outlined"
                onClick={() => printInvoice(invoice)}
                sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, textTransform: "none" }}
              >
                Print Invoice
              </Button>
              {isRetail && invoice.paymentStatus !== "paid" && onPayLink && (
                <>
                  <Button size="small" variant="outlined" onClick={() => onPayLink(invoice.invoiceID, false)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, textTransform: "none" }}>
                    Copy pay link
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => onPayLink(invoice.invoiceID, true)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, textTransform: "none" }}>
                    Resend ready notice
                  </Button>
                </>
              )}
              {paidAheadAwaitingPickup && onPickedUp && (
                <Button size="small" variant="contained" onClick={() => onPickedUp(invoice.invoiceID)} sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111", textTransform: "none" }}>
                  Picked up
                </Button>
              )}
            </Stack>
          </Box>
          {paidAheadAwaitingPickup && (
            <Alert severity="success" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              Paid online {invoice.paidAheadAt ? new Date(invoice.paidAheadAt).toLocaleString() : ""} — the piece is still here. Tap “Picked up” at handover.
            </Alert>
          )}

          <Grid container spacing={1.5}>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Subtotal</Typography><Typography>{formatCurrency(invoice.subtotal)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Tax</Typography><Typography>{formatCurrency(invoice.taxAmount)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>{parseFloat(invoice.shippingFee || 0) > 0 ? "Shipping" : "Delivery"}</Typography><Typography>{formatCurrency(parseFloat(invoice.shippingFee || 0) > 0 ? invoice.shippingFee : invoice.deliveryFee)}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>Remaining</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(invoice.remainingBalance)}</Typography></Grid>
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

              {/* Hand delivery is no longer offered (owner, 2026-09-21). Fulfillment — pickup or ship —
                  is decided at Finalize (FinalizeFulfillment) and the shipping line comes from the carrier rate. */}
            </>
          )}

          {invoice.closeoutNotes && (
            <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>{invoice.closeoutNotes}</Alert>
          )}

          {invoice.status === "draft" && (
            <FinalizeFulfillment invoice={invoice} onFinalize={onFinalize} />
          )}

          {invoice.paymentStatus === "paid" && onReopen && (
            <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Reopen this invoice</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    Reverts to open status and moves repairs back to Ready for Pickup. Use this to correct a billing error.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Reopen invoice ${invoice.invoiceID}?\n\nThis will revert it to open status and move its repairs back to Ready for Pickup. Any recorded payments will remain — you can then correct the invoice and re-collect if needed.`
                    );
                    if (confirmed) onReopen(invoice.invoiceID);
                  }}
                  sx={{ color: "#FCA5A5", borderColor: REPAIRS_UI.border, flexShrink: 0 }}
                >
                  Reopen Invoice
                </Button>
              </Stack>
            </Alert>
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
                <Button variant="contained" onClick={() => onCashPay(invoice.invoiceID, cashAmount, cashNotes)} sx={{ backgroundColor: REPAIRS_UI.accent, color: "#111" }}>
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

