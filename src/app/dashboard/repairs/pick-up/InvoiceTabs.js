import { Stack, Alert } from "@mui/material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import { InvoiceCard } from './InvoiceCard';

export function InvoiceTabs({ canReopenInvoices, collectingTerminalInvoiceID, editableInvoices, handleCardCollected, handleCashPayment, handleConvertCashToCard, handleCreateStripe, handleCreateTerminal, handleFinalizeInvoice, handleMergeInvoice, handlePayLink, handlePickedUp, handleRemoveRepairsFromInvoice, handleReopenInvoice, handleSplitInvoice, handleSyncStripe, handleSyncTerminal, handleUpdateDelivery, paginatedInvoiceList, tab, visibleDraftInvoices, visibleOpenInvoices, visiblePaidInvoices }) {
  return (
    <>
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
    </>
  );
}
