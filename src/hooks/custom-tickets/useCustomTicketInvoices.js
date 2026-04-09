'use client';

import { useState, useCallback, useEffect } from 'react';

export const useCustomTicketInvoices = (ticket, onRefresh) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentProgress, setPaymentProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Form state for flexible payments
  const [paymentType, setPaymentType] = useState('deposit');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');

  // Get invoices from ticket or initialize empty array
  const invoices = ticket?.invoices || [];
  
  // Get quote total for calculations
  const quoteTotal = ticket?.quote?.quoteTotal || ticket?.estimatedPrice || 0;
  const suggestedDepositAmount = Math.round(quoteTotal * 0.50 * 100) / 100; // 50% deposit

  // Load payment progress data
  const loadPaymentProgress = useCallback(async () => {
    if (!ticket?.ticketID) return;
    try {
      setLoadingProgress(true);
      const response = await fetch(`/api/custom-tickets/${ticket.ticketID}/payment-progress`);
      
      if (!response.ok) {
        throw new Error('Failed to load payment progress');
      }
      
      const data = await response.json();
      setPaymentProgress(data);
      
    } catch (err) {
      console.error('Error loading payment progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  }, [ticket?.ticketID]);

  // Load progress when component mounts or ticket changes
  useEffect(() => {
    loadPaymentProgress();
  }, [loadPaymentProgress]);

  const handleCreateInvoice = async () => {
    const emailToUse = ticket?.customerEmail || ticket?.clientInfo?.email;
    
    if (!emailToUse) {
      setError('Customer email not found in ticket. Please ensure client information is complete.');
      return;
    }

    // Determine amount based on payment type
    let amount;
    if (paymentType === 'custom' && customAmount) {
      amount = parseFloat(customAmount);
    } else if (paymentType === 'deposit') {
      amount = suggestedDepositAmount;
    } else if (paymentType === 'remaining') {
      amount = paymentProgress ? paymentProgress.remainingAmount : quoteTotal;
    } else if (paymentType === 'to50percent') {
      amount = paymentProgress ? paymentProgress.status.amountFor50Percent : quoteTotal * 0.5;
    }

    if (!amount || amount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      // Determine the actual type and description
      const actualType = paymentType === 'custom' ? 'progress' : paymentType;
      const defaultDescription = paymentType === 'custom' 
        ? `${ticket.title} - Progress Payment`
        : `${ticket.title} - ${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment`;

      const response = await fetch('/api/custom-tickets/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket.ticketID,
          type: actualType,
          amount: amount,
          customerEmail: emailToUse,
          description: paymentDescription || defaultDescription,
          quoteData: ticket.quote,
          projectTotalAmount: quoteTotal,
          isPartialPayment: paymentType !== 'remaining'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      setSuccess(`Invoice created successfully! Shopify Order #${result.shopifyOrderNumber}`);
      setCreateDialogOpen(false);
      
      // Reset form
      setPaymentType('deposit');
      setCustomAmount('');
      setPaymentDescription('');
      
      // Refresh data
      await loadPaymentProgress();
      if (onRefresh) {
        onRefresh();
      }

    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return {
    state: {
      createDialogOpen,
      creating,
      error,
      success,
      paymentProgress,
      loadingProgress,
      paymentType,
      customAmount,
      paymentDescription,
      invoices,
      quoteTotal,
      suggestedDepositAmount,
    },
    actions: {
      setCreateDialogOpen,
      setPaymentType,
      setCustomAmount,
      setPaymentDescription,
      setError,
      setSuccess,
      handleCreateInvoice
    }
  };
};