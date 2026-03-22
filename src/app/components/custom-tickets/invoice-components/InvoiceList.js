import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Card,
  Button
} from '@mui/material';
import {
  ShoppingCart as ShopifyIcon,
  Launch as LaunchIcon,
  ContentCopy as CopyIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon
} from '@mui/icons-material';

export default function InvoiceList({
  invoices,
  quoteTotal,
  ticket,
  onCreateInvoiceClick
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending Payment';
      case 'cancelled': return 'Cancelled';
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (invoices.length === 0) {
    return (
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
            onClick={onCreateInvoiceClick}
          >
            Create First Invoice
          </Button>
        )}
      </Card>
    );
  }

  return (
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
  );
}