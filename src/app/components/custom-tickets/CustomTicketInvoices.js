/**
 * Custom Ticket Invoices Component
 * Manages invoices for custom tickets including creating deposit invoices
 */

'use client';

import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Receipt as ReceiptIcon, Add as AddIcon } from '@mui/icons-material';

import { useCustomTicketInvoices } from '@/hooks/custom-tickets/useCustomTicketInvoices';
import InvoiceSummary from './invoice-components/InvoiceSummary';
import InvoiceProgress from './invoice-components/InvoiceProgress';
import InvoiceList from './invoice-components/InvoiceList';
import CreateInvoiceDialog from './invoice-components/CreateInvoiceDialog';

export default function CustomTicketInvoices({ 
  ticket, 
  onRefresh, 
  saving 
}) {
  const { state, actions } = useCustomTicketInvoices(ticket, onRefresh);

  return (
    <Box>
      {/* Alert Messages */}
      {state.error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => actions.setError(null)}
        >
          {state.error}
        </Alert>
      )}
      
      {state.success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }} 
          onClose={() => actions.setSuccess(null)}
        >
          {state.success}
        </Alert>
      )}

      {/* Header with Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          Invoices & Payments
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => actions.setCreateDialogOpen(true)}
          disabled={!state.quoteTotal || state.quoteTotal === 0 || (!ticket?.customerEmail && !ticket?.clientInfo?.email)}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Quote Summary */}
      <InvoiceSummary 
        quoteTotal={state.quoteTotal} 
        suggestedDepositAmount={state.suggestedDepositAmount} 
      />

      {/* Payment Progress */}
      <InvoiceProgress 
        quoteTotal={state.quoteTotal}
        paymentProgress={state.paymentProgress}
        loadingProgress={state.loadingProgress}
      />

      {/* No Quote Available */}
      {state.quoteTotal === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No quote available yet. Complete the quote in the Quote tab before creating invoices.
        </Alert>
      )}

      {/* Missing Customer Email */}
      {state.quoteTotal > 0 && !ticket?.customerEmail && !ticket?.clientInfo?.email && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Customer email is missing from ticket information. Please update the client information in the Overview tab.
        </Alert>
      )}

      {/* Invoices List */}
      <InvoiceList 
        invoices={state.invoices}
        quoteTotal={state.quoteTotal}
        ticket={ticket}
        onCreateInvoiceClick={() => actions.setCreateDialogOpen(true)}
      />

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog 
        open={state.createDialogOpen}
        creating={state.creating}
        onClose={() => actions.setCreateDialogOpen(false)}
        onCreate={actions.handleCreateInvoice}
        ticket={ticket}
        paymentType={state.paymentType}
        setPaymentType={actions.setPaymentType}
        customAmount={state.customAmount}
        setCustomAmount={actions.setCustomAmount}
        paymentDescription={state.paymentDescription}
        setPaymentDescription={actions.setPaymentDescription}
        quoteTotal={state.quoteTotal}
        suggestedDepositAmount={state.suggestedDepositAmount}
        paymentProgress={state.paymentProgress}
      />
    </Box>
  );
}
