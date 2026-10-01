'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { LoadingButton } from '@mui/lab';
import { formatDate, formatMoney, identifierHelperText } from './stullerParts';
import { StullerInvoiceDialog } from './StullerInvoiceDialog';
import { StullerInvoicesCard } from './StullerInvoicesCard';
import { StullerApiSettingsCard } from './StullerApiSettingsCard';
import { stullerActions } from './stullerActions';

export default function StullerSettingsPage() {
  const [loading, setLoading] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [syncingOrders, setSyncingOrders] = React.useState(false);
  const [syncingInvoices, setSyncingInvoices] = React.useState(false);
  const [creatingExpenseId, setCreatingExpenseId] = React.useState('');
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [materials, setMaterials] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = React.useState(false);

  const [settings, setSettings] = React.useState({
    enabled: false,
    username: '',
    password: '',
    apiUrl: 'https://api.stuller.com',
    updateFrequency: 'daily',
    hasPassword: false,
  });

  const [orderSyncInput, setOrderSyncInput] = React.useState('');
  const [invoicePoInput, setInvoicePoInput] = React.useState('');
  const [invoiceNumberInput, setInvoiceNumberInput] = React.useState('');

  const clearMessages = React.useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const loadStullerSettings = React.useCallback(async () => {
    const response = await fetch('/api/admin/settings/stuller');
    if (!response.ok) {
      throw new Error('Failed to load Stuller settings');
    }

    const data = await response.json();
    setSettings({
      enabled: data.stuller.enabled,
      username: data.stuller.username,
      password: data.stuller.hasPassword ? '********' : '',
      apiUrl: data.stuller.apiUrl,
      updateFrequency: data.stuller.updateFrequency,
      hasPassword: data.stuller.hasPassword,
    });
  }, []);

  const loadStullerMaterials = React.useCallback(async () => {
    const response = await fetch('/api/stuller/update-prices');
    if (!response.ok) {
      throw new Error('Failed to load Stuller materials');
    }

    const data = await response.json();
    setMaterials(data.materials || []);
  }, []);

  const loadOrders = React.useCallback(async () => {
    const response = await fetch('/api/stuller/orders');
    if (!response.ok) {
      throw new Error('Failed to load synced Stuller orders');
    }

    const data = await response.json();
    setOrders(data.orders || []);
  }, []);

  const loadInvoices = React.useCallback(async () => {
    const response = await fetch('/api/stuller/invoices');
    if (!response.ok) {
      throw new Error('Failed to load synced Stuller invoices');
    }

    const data = await response.json();
    setInvoices(data.invoices || []);
  }, []);

  const loadPageData = React.useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStullerSettings(),
        loadStullerMaterials(),
        loadOrders(),
        loadInvoices(),
      ]);
      clearMessages();
    } catch (loadError) {
      console.error('Error loading Stuller page:', loadError);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [clearMessages, loadInvoices, loadOrders, loadStullerMaterials, loadStullerSettings]);

  React.useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const {
    saveStullerSettings, testConnection, updatePrices, syncOrders, syncInvoices, createExpenseFromInvoice,
    openInvoiceDetails,
  } = stullerActions({
    clearMessages, invoiceNumberInput, invoicePoInput, loadInvoices, loadOrders, loadStullerMaterials,
    loadStullerSettings, orderSyncInput, setCreatingExpenseId, setError, setLoadingInvoiceDetail,
    setSelectedInvoice, setSuccess, setSyncingInvoices, setSyncingOrders, setTesting, setUpdating, settings,
  });

  // Everything the extracted sections read, passed whole to each (each takes only the names it uses).
  const stuller = {
    createExpenseFromInvoice, creatingExpenseId, invoices, loading, loadingInvoiceDetail, openInvoiceDetails,
    saveStullerSettings, selectedInvoice, setSelectedInvoice, setSettings, settings, testConnection, testing,
    updating,
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ mb: 3 }}>
        <Typography component="h1" variant="h5" fontWeight={600} sx={{ color: '#D1D5DB' }}>
          Stuller
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.66)', mt: 0.5 }}>
          Configure Stuller credentials, sync material pricing, and pull order or invoice data into finance.
        </Typography>
      </Box>

      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <StullerApiSettingsCard {...stuller} />

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Price Update Controls</Typography>
            <Typography variant="body2" color="text.secondary">
              Material price sync stays read-only. It refreshes the Stuller-backed pricing already attached to your shop materials.
            </Typography>
          </CardContent>
          <CardActions>
            <LoadingButton variant="contained" loading={updating} onClick={() => updatePrices(false)} disabled={!settings.enabled}>
              Update Prices Now
            </LoadingButton>
            <LoadingButton variant="outlined" loading={updating} onClick={() => updatePrices(true)} disabled={!settings.enabled}>
              Force Update All
            </LoadingButton>
          </CardActions>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Order Status Sync</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Stuller’s order API is keyed by your purchase order numbers. Sync by PO to stage order status locally.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Purchase Order Numbers"
              value={orderSyncInput}
              onChange={(e) => setOrderSyncInput(e.target.value)}
              helperText={identifierHelperText('Purchase order numbers')}
            />
          </CardContent>
          <CardActions>
            <LoadingButton variant="contained" loading={syncingOrders} onClick={syncOrders} disabled={!settings.enabled}>
              Sync Orders
            </LoadingButton>
          </CardActions>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Invoice Sync</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sync Stuller invoices by PO, invoice number, or pull recent/full account invoices directly. This is the source used to create scheduled material expenses.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Purchase Order Numbers"
                  value={invoicePoInput}
                  onChange={(e) => setInvoicePoInput(e.target.value)}
                  helperText={identifierHelperText('Purchase order numbers')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Invoice Numbers"
                  value={invoiceNumberInput}
                  onChange={(e) => setInvoiceNumberInput(e.target.value)}
                  helperText={identifierHelperText('Invoice numbers')}
                />
              </Grid>
            </Grid>
          </CardContent>
          <CardActions>
            <LoadingButton variant="contained" loading={syncingInvoices} onClick={() => syncInvoices()} disabled={!settings.enabled}>
              Sync Targeted
            </LoadingButton>
            <LoadingButton variant="outlined" loading={syncingInvoices} onClick={() => syncInvoices({ recentDays: 30 })} disabled={!settings.enabled}>
              Sync Last 30 Days
            </LoadingButton>
            <LoadingButton variant="outlined" loading={syncingInvoices} onClick={() => syncInvoices({ recentDays: 90 })} disabled={!settings.enabled}>
              Sync Last 90 Days
            </LoadingButton>
            <LoadingButton variant="outlined" loading={syncingInvoices} onClick={() => syncInvoices({ syncAll: true })} disabled={!settings.enabled}>
              Sync All
            </LoadingButton>
          </CardActions>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Synced Orders</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : orders.length === 0 ? (
              <Typography color="text.secondary">No Stuller orders have been synced yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO</TableCell>
                    <TableCell>Order #</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Order Date</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Tracking</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.stullerOrderID}>
                      <TableCell>{order.purchaseOrderNumber || 'N/A'}</TableCell>
                      <TableCell>{order.orderNumber || 'N/A'}</TableCell>
                      <TableCell><Chip size="small" label={order.status || 'Unknown'} /></TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{formatMoney(order.total)}</TableCell>
                      <TableCell>{order.trackingNumber || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <StullerInvoicesCard {...stuller} />

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Materials with Stuller Integration</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : materials.length === 0 ? (
              <Typography color="text.secondary">No Stuller-linked materials found.</Typography>
            ) : (
              <Grid container spacing={2}>
                {materials.map((material) => (
                  <Grid item xs={12} sm={6} md={4} key={material._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>{material.displayName}</Typography>
                        <Typography variant="body2" color="text.secondary">Stuller #: {material.stuller_item_number || material.stullerProducts?.[0]?.stullerItemNumber || 'N/A'}</Typography>
                        <Typography variant="body2" color="text.secondary">Current Price: {formatMoney(material.unitCost)}</Typography>
                        <Typography variant="body2" color="text.secondary">Last Updated: {material.last_price_update ? new Date(material.last_price_update).toLocaleDateString() : 'Never'}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Stack>

      <StullerInvoiceDialog {...stuller} />
    </Box>
  );
}
