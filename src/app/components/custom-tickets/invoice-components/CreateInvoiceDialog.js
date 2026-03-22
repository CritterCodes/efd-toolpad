import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Payment as PaymentIcon,
  ShoppingCart as ShopifyIcon
} from '@mui/icons-material';

export default function CreateInvoiceDialog({
  open,
  creating,
  onClose,
  onCreate,
  ticket,
  paymentType,
  setPaymentType,
  customAmount,
  setCustomAmount,
  paymentDescription,
  setPaymentDescription,
  quoteTotal,
  suggestedDepositAmount,
  paymentProgress
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => !creating && onClose()}
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
                  {paymentProgress && !paymentProgress.status?.hasReached50Percent && paymentProgress.status?.amountFor50Percent > 0 && (
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
            {paymentProgress && !paymentProgress.status?.hasReached50Percent && paymentType === 'to50percent' && (
              <strong> Production will begin once this payment is received!</strong>
            )}
          </Alert>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button
          onClick={onCreate}
          variant="contained"
          disabled={creating || (!ticket?.customerEmail && !ticket?.clientInfo?.email) || (paymentType === 'custom' && !customAmount)}
          startIcon={creating ? <CircularProgress size={16} /> : <ShopifyIcon />}
        >
          {creating ? 'Creating...' : 'Create Shopify Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}