'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { LoadingButton } from '@mui/lab';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function identifierHelperText(label) {
  return `${label} can be pasted one per line or comma separated.`;
}

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

  const saveStullerSettings = async () => {
    try {
      setUpdating(true);
      clearMessages();

      const response = await fetch('/api/admin/settings/stuller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      await loadStullerSettings();
      setSuccess('Stuller settings saved successfully.');
    } catch (saveError) {
      console.error('Error saving Stuller settings:', saveError);
      setError(saveError.message);
    } finally {
      setUpdating(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      clearMessages();

      const testData = {
        username: settings.username,
        password: settings.password === '********' ? '' : settings.password,
        apiUrl: settings.apiUrl,
      };

      const response = await fetch('/api/admin/settings/stuller', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Stuller connection test failed');
      }

      setSuccess(result.message || 'Stuller API connection successful.');
    } catch (testError) {
      console.error('Error testing Stuller connection:', testError);
      setError(testError.message);
    } finally {
      setTesting(false);
    }
  };

  const updatePrices = async (force = false) => {
    try {
      setUpdating(true);
      clearMessages();

      const response = await fetch('/api/stuller/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update prices');
      }

      await loadStullerMaterials();
      setSuccess(result.message || 'Stuller prices updated.');
    } catch (priceError) {
      console.error('Error updating Stuller prices:', priceError);
      setError(priceError.message);
    } finally {
      setUpdating(false);
    }
  };

  const syncOrders = async () => {
    try {
      setSyncingOrders(true);
      clearMessages();

      const response = await fetch('/api/stuller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrderNumbers: orderSyncInput }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Stuller orders');
      }

      await loadOrders();
      setSuccess(`Synced ${result.syncedCount || 0} Stuller order${result.syncedCount === 1 ? '' : 's'}.`);
    } catch (syncError) {
      console.error('Error syncing Stuller orders:', syncError);
      setError(syncError.message);
    } finally {
      setSyncingOrders(false);
    }
  };

  const syncInvoices = async () => {
    try {
      setSyncingInvoices(true);
      clearMessages();

      const response = await fetch('/api/stuller/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderNumbers: invoicePoInput,
          invoiceNumbers: invoiceNumberInput,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Stuller invoices');
      }

      await loadInvoices();
      setSuccess(`Synced ${result.syncedCount || 0} Stuller invoice${result.syncedCount === 1 ? '' : 's'}.`);
    } catch (syncError) {
      console.error('Error syncing Stuller invoices:', syncError);
      setError(syncError.message);
    } finally {
      setSyncingInvoices(false);
    }
  };

  const createExpenseFromInvoice = async (invoiceId) => {
    try {
      setCreatingExpenseId(invoiceId);
      clearMessages();

      const response = await fetch(`/api/stuller/invoices/${invoiceId}/create-expense`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Stuller expense');
      }

      setSuccess(`Created scheduled expense for Stuller invoice ${result.invoice?.invoiceNumber || invoiceId}.`);
    } catch (createError) {
      console.error('Error creating Stuller expense:', createError);
      setError(createError.message);
    } finally {
      setCreatingExpenseId('');
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600} sx={{ color: '#D1D5DB' }}>
          Stuller
        </Typography>
        <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 0.5 }}>
          Configure Stuller credentials, sync material pricing, and pull order or invoice data into finance.
        </Typography>
      </Box>

      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Stuller API Configuration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={(e) => setSettings((current) => ({ ...current, enabled: e.target.checked }))}
                    />
                  }
                  label="Enable Stuller Integration"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={settings.username}
                  onChange={(e) => setSettings((current) => ({ ...current, username: e.target.value }))}
                  disabled={!settings.enabled}
                  helperText="Use the Stuller username that has API access."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Password"
                  value={settings.password}
                  onChange={(e) => setSettings((current) => ({ ...current, password: e.target.value }))}
                  disabled={!settings.enabled}
                  helperText={settings.hasPassword ? 'Enter a new password to replace the stored one.' : 'Your Stuller API password.'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings((current) => ({ ...current, apiUrl: e.target.value }))}
                  disabled={!settings.enabled}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!settings.enabled}>
                  <InputLabel>Update Frequency</InputLabel>
                  <Select
                    value={settings.updateFrequency}
                    label="Update Frequency"
                    onChange={(e) => setSettings((current) => ({ ...current, updateFrequency: e.target.value }))}
                  >
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="manual">Manual Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
          <CardActions>
            <LoadingButton variant="contained" loading={updating} onClick={saveStullerSettings} disabled={!settings.enabled}>
              Save Settings
            </LoadingButton>
            <LoadingButton variant="outlined" loading={testing} onClick={testConnection} disabled={!settings.enabled || !settings.username}>
              Test Connection
            </LoadingButton>
          </CardActions>
        </Card>

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
              Sync Stuller invoices by PO, invoice number, or both. This is the source used to create scheduled material expenses.
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
            <LoadingButton variant="contained" loading={syncingInvoices} onClick={syncInvoices} disabled={!settings.enabled}>
              Sync Invoices
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

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Synced Invoices</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : invoices.length === 0 ? (
              <Typography color="text.secondary">No Stuller invoices have been synced yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>PO</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Invoice Date</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Tracking</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.stullerInvoiceID}>
                      <TableCell>{invoice.invoiceNumber || 'N/A'}</TableCell>
                      <TableCell>{invoice.purchaseOrderNumber || 'N/A'}</TableCell>
                      <TableCell><Chip size="small" label={invoice.status || 'Unknown'} /></TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{formatMoney(invoice.total)}</TableCell>
                      <TableCell>{invoice.trackingNumber || 'N/A'}</TableCell>
                      <TableCell align="right">
                        <LoadingButton
                          variant="outlined"
                          size="small"
                          loading={creatingExpenseId === invoice.stullerInvoiceID}
                          onClick={() => createExpenseFromInvoice(invoice.stullerInvoiceID)}
                        >
                          Create Expense
                        </LoadingButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
    </Box>
  );
}
