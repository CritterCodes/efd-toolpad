/**
 * Custom Ticket Invoices Component
 * Manages invoices for custom tickets including creating deposit invoices through Shopify
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Grid,
  Divider,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Launch as LaunchIcon,
  Payment as PaymentIcon,
  ShoppingCart as ShopifyIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

export default function CustomTicketInvoices({ 
  ticket, 
  onRefresh, 
  saving 
}) {
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
  const loadPaymentProgress = React.useCallback(async () => {
    try {
      setLoadingProgress(true);
      const response = await fetch(`/api/custom-tickets/${ticket.ticketID}/payment-progress`);
      
      if (!response.ok) {
        throw new Error('Failed to load payment progress');
      }
      
      const data = await response.json();
      console.log('Payment progress data:', data); // Debug logging
      setPaymentProgress(data);
      
    } catch (error) {
      console.error('Error loading payment progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  }, [ticket?.ticketID]);

  // Load progress when component mounts or ticket changes
  React.useEffect(() => {
    if (ticket?.ticketID) {
      loadPaymentProgress();
    }
  }, [ticket?.ticketID, loadPaymentProgress]);

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

    } catch (error) {
      console.error('Error creating invoice:', error);
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'draft':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending Payment';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box>
      {/* Alert Messages */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }} 
          onClose={() => setSuccess(null)}
        >
          {success}
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
          onClick={() => setCreateDialogOpen(true)}
          disabled={!quoteTotal || quoteTotal === 0 || (!ticket?.customerEmail && !ticket?.clientInfo?.email)}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Quote Summary */}
      {quoteTotal > 0 && (
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Quote Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Quote Amount
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(quoteTotal)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Suggested Deposit (50%)
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(suggestedDepositAmount)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Payment Progress */}
      {quoteTotal > 0 && (
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Payment Progress
            </Typography>
            
            {loadingProgress && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading payment progress...
                </Typography>
              </Box>
            )}
            
            {paymentProgress && (
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">
                    Amount Paid
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(paymentProgress.totalPaid)}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">
                    Remaining
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(paymentProgress.remainingAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {paymentProgress.paymentProgress}%
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={paymentProgress.status.hasReached50Percent ? 'Production Ready' : 'Awaiting Payment'} 
                    color={paymentProgress.status.hasReached50Percent ? 'success' : 'warning'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <LinearProgress 
                    variant="determinate" 
                    value={paymentProgress.paymentProgress || 0} 
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Grid>
              </Grid>
            )}

            {!loadingProgress && !paymentProgress && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No payment data available yet
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Quote Available */}
      {quoteTotal === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No quote available yet. Complete the quote in the Quote tab before creating invoices.
        </Alert>
      )}

      {/* Missing Customer Email */}
      {quoteTotal > 0 && !ticket?.customerEmail && !ticket?.clientInfo?.email && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Customer email is missing from ticket information. Please update the client information in the Overview tab.
        </Alert>
      )}

      {/* Invoices List */}
      {invoices.length > 0 ? (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>Invoice #</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {invoice.shopifyOrderNumber && <ShopifyIcon fontSize="small" color="action" />}
                      <Typography variant="body2" fontWeight="medium">
                        #{invoice.invoiceNumber || invoice.shopifyOrderNumber || `INV-${index + 1}`}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={invoice.type} 
                      size="small" 
                      color={invoice.type === 'deposit' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(invoice.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(invoice.status)}
                      size="small"
                      color={getStatusColor(invoice.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {invoice.shopifyOrderUrl && (
                        <Tooltip title="View in Shopify">
                          <IconButton
                            size="small"
                            onClick={() => window.open(invoice.shopifyOrderUrl, '_blank')}
                          >
                            <LaunchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {invoice.shopifyOrderNumber && (
                        <Tooltip title="Copy Order Number">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(invoice.shopifyOrderNumber)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Card sx={{ textAlign: 'center', py: 6, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
          <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Invoices Created Yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Create a deposit invoice to start the payment process
          </Typography>
          {quoteTotal > 0 && (ticket?.customerEmail || ticket?.clientInfo?.email) && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create First Invoice
            </Button>
          )}
        </Card>
      )}

      {/* Create Invoice Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentIcon color="primary" />
            Create Invoice
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Customer Email"
                  type="email"
                  value={ticket?.customerEmail || ticket?.clientInfo?.email || ''}
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Customer email from ticket information"
                  disabled={creating}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Type</InputLabel>
                  <Select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    label="Payment Type"
                    disabled={creating}
                  >
                    <MenuItem value="deposit">
                      Deposit Payment (50% - {formatCurrency(suggestedDepositAmount)})
                    </MenuItem>
                    {paymentProgress && !paymentProgress.status.hasReached50Percent && paymentProgress.status.amountFor50Percent > 0 && (
                      <MenuItem value="to50percent">
                        Payment to Start Production ({formatCurrency(paymentProgress.status.amountFor50Percent)})
                      </MenuItem>
                    )}
                    {paymentProgress && paymentProgress.remainingAmount > 0 && (
                      <MenuItem value="remaining">
                        Final Payment ({formatCurrency(paymentProgress.remainingAmount)})
                      </MenuItem>
                    )}
                    <MenuItem value="custom">Custom Amount</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {paymentType === 'custom' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Custom Amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    disabled={creating}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Enter the payment amount"
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Payment Description"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  disabled={creating}
                  helperText="Optional custom description for this payment"
                />
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Project Total
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(quoteTotal)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  This Payment
                </Typography>
                <Typography variant="h6" color="success.main">
                  {(() => {
                    if (paymentType === 'custom' && customAmount) {
                      return formatCurrency(parseFloat(customAmount));
                    } else if (paymentType === 'deposit') {
                      return formatCurrency(suggestedDepositAmount);
                    } else if (paymentType === 'remaining' && paymentProgress) {
                      return formatCurrency(paymentProgress.remainingAmount);
                    } else if (paymentType === 'to50percent' && paymentProgress) {
                      return formatCurrency(paymentProgress.status.amountFor50Percent);
                    }
                    return formatCurrency(0);
                  })()}
                </Typography>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              This will create a Shopify draft order and send a professional invoice to the customer.
              {paymentProgress && !paymentProgress.status.hasReached50Percent && paymentType === 'to50percent' && (
                <strong> Production will begin once this payment is received!</strong>
              )}
            </Alert>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInvoice}
            variant="contained"
            disabled={creating || (!ticket?.customerEmail && !ticket?.clientInfo?.email) || (paymentType === 'custom' && !customAmount)}
            startIcon={creating ? <CircularProgress size={16} /> : <ShopifyIcon />}
          >
            {creating ? 'Creating...' : 'Create Shopify Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}