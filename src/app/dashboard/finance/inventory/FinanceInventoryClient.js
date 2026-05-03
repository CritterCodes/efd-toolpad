"use client";

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import InventoryIcon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import { INVENTORY_TRANSACTION_TYPES } from '@/services/inventory';

const INVENTORY_CATEGORIES = [
  'General',
  'Materials / Parts',
  'Solder',
  'Wire / Stock',
  'Findings',
  'Tools / Consumables',
  'Packaging / Shipping',
];

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDate(value, withTime = false) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-US', withTime ? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  } : {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function SummaryCard({ label, value, note, color = 'inherit' }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color }}>{value}</Typography>
        {note ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{note}</Typography> : null}
      </CardContent>
    </Card>
  );
}

function getDefaultItemForm() {
  return {
    name: '',
    category: INVENTORY_CATEGORIES[0],
    unitOfMeasure: 'each',
    reorderPoint: '',
    reorderQuantity: '',
    preferredVendor: '',
    vendorSku: '',
    linkedMaterialID: '',
    active: true,
    location: '',
    notes: '',
    stullerItemNumber: '',
    stullerDescription: '',
    lastVendorCost: '',
  };
}

function getDefaultReceiveForm() {
  return {
    inventoryItemID: '',
    createItemName: '',
    createItemCategory: 'Materials / Parts',
    createItemUnit: 'each',
    quantityReceived: '',
    unitCost: '',
    effectiveDate: formatDateInput(new Date()),
    preferredVendor: '',
    vendorSku: '',
    notes: '',
  };
}

function getDefaultConsumeForm() {
  return {
    inventoryItemID: '',
    repairID: '',
    quantityConsumed: '',
    effectiveDate: formatDateInput(new Date()),
    notes: '',
  };
}

function buildStullerLineState(invoice) {
  return Array.isArray(invoice?.items) ? invoice.items.map((item, index) => ({
    selected: false,
    sourceLineReference: String(item.lineNumber || index + 1),
    itemNumber: item.itemNumber || '',
    inventoryItemID: '',
    createItemName: item.itemDescription || item.itemNumber || '',
    createItemCategory: 'Materials / Parts',
    createItemUnit: 'each',
    quantityReceived: String(item.shipQuantity ?? 0),
    unitCost: String(item.unitPrice ?? 0),
    notes: '',
  })) : [];
}

export default function FinanceInventoryClient() {
  const searchParams = useSearchParams();
  const stullerInvoiceId = searchParams.get('stullerInvoiceId') || '';

  const [tab, setTab] = React.useState('items');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [inventoryItems, setInventoryItems] = React.useState([]);
  const [materials, setMaterials] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [lowStock, setLowStock] = React.useState([]);
  const [suggestions, setSuggestions] = React.useState([]);
  const [stullerInvoice, setStullerInvoice] = React.useState(null);
  const [stullerLineState, setStullerLineState] = React.useState([]);
  const [editingItemID, setEditingItemID] = React.useState('');
  const [itemForm, setItemForm] = React.useState(getDefaultItemForm);
  const [receiveForm, setReceiveForm] = React.useState(getDefaultReceiveForm);
  const [consumeForm, setConsumeForm] = React.useState(getDefaultConsumeForm);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadPageData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, materialsRes, transactionsRes, lowStockRes, stullerRes] = await Promise.all([
        fetch('/api/inventory-items'),
        fetch('/api/materials'),
        fetch('/api/inventory-transactions'),
        fetch('/api/inventory/low-stock'),
        stullerInvoiceId ? fetch(`/api/stuller/invoices/${stullerInvoiceId}`) : Promise.resolve(null),
      ]);

      const [itemsData, materialsData, transactionsData, lowStockData, stullerData] = await Promise.all([
        itemsRes.json(),
        materialsRes.json(),
        transactionsRes.json(),
        lowStockRes.json(),
        stullerRes ? stullerRes.json() : Promise.resolve(null),
      ]);

      if (!itemsRes.ok) throw new Error(itemsData.error || 'Failed to load inventory items.');
      if (!materialsRes.ok) throw new Error(materialsData.error || 'Failed to load materials.');
      if (!transactionsRes.ok) throw new Error(transactionsData.error || 'Failed to load inventory transactions.');
      if (!lowStockRes.ok) throw new Error(lowStockData.error || 'Failed to load low stock data.');
      if (stullerRes && !stullerRes.ok) throw new Error(stullerData.error || 'Failed to load Stuller invoice.');

      setInventoryItems(itemsData.inventoryItems || []);
      setMaterials(materialsData.data || materialsData.materials || []);
      setTransactions(transactionsData.transactions || []);
      setLowStock(lowStockData.items || []);
      setSuggestions(lowStockData.suggestions || []);
      setStullerInvoice(stullerData?.invoice || null);
      setStullerLineState(buildStullerLineState(stullerData?.invoice || null));
    } catch (err) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [stullerInvoiceId]);

  React.useEffect(() => {
    loadPageData();
  }, [loadPageData, refreshKey]);

  const resetItemForm = React.useCallback(() => {
    setEditingItemID('');
    setItemForm(getDefaultItemForm());
  }, []);

  const submitItem = React.useCallback(async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const url = editingItemID ? `/api/inventory-items/${editingItemID}` : '/api/inventory-items';
      const method = editingItemID ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemForm,
          reorderPoint: Number(itemForm.reorderPoint || 0),
          reorderQuantity: Number(itemForm.reorderQuantity || 0),
          lastVendorCost: Number(itemForm.lastVendorCost || 0),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save inventory item.');

      setSuccess(editingItemID ? 'Inventory item updated.' : 'Inventory item created.');
      resetItemForm();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to save inventory item.');
    } finally {
      setSubmitting(false);
    }
  }, [editingItemID, itemForm, resetItemForm]);

  const submitReceive = React.useCallback(async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        inventoryItemID: receiveForm.inventoryItemID,
        quantityReceived: Number(receiveForm.quantityReceived || 0),
        unitCost: Number(receiveForm.unitCost || 0),
        effectiveDate: receiveForm.effectiveDate,
        preferredVendor: receiveForm.preferredVendor,
        vendorSku: receiveForm.vendorSku,
        notes: receiveForm.notes,
      };

      if (!payload.inventoryItemID) {
        payload.createItem = {
          name: receiveForm.createItemName,
          category: receiveForm.createItemCategory,
          unitOfMeasure: receiveForm.createItemUnit,
          preferredVendor: receiveForm.preferredVendor,
          vendorSku: receiveForm.vendorSku,
          lastVendorCost: payload.unitCost,
        };
      }

      const response = await fetch('/api/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to receive inventory.');

      setSuccess(`Received ${formatQuantity(data.transaction?.quantityDelta)} into inventory.`);
      setReceiveForm(getDefaultReceiveForm());
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to receive inventory.');
    } finally {
      setSubmitting(false);
    }
  }, [receiveForm]);

  const submitConsume = React.useCallback(async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/inventory/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemID: consumeForm.inventoryItemID,
          repairID: consumeForm.repairID,
          quantityConsumed: Number(consumeForm.quantityConsumed || 0),
          effectiveDate: consumeForm.effectiveDate,
          notes: consumeForm.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to consume inventory.');

      setSuccess('Inventory consumption recorded.');
      setConsumeForm(getDefaultConsumeForm());
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to consume inventory.');
    } finally {
      setSubmitting(false);
    }
  }, [consumeForm]);

  const createSuggestions = React.useCallback(async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/inventory/reorder-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate reorder suggestions.');

      setSuccess(`Generated or reused ${data.suggestions?.length || 0} reorder suggestions.`);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to generate reorder suggestions.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const receiveStullerLines = React.useCallback(async () => {
    if (!stullerInvoiceId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const selectedLines = stullerLineState
        .filter((line) => line.selected)
        .map((line) => ({
          sourceLineReference: line.sourceLineReference,
          itemNumber: line.itemNumber,
          inventoryItemID: line.inventoryItemID,
          quantityReceived: Number(line.quantityReceived || 0),
          unitCost: Number(line.unitCost || 0),
          notes: line.notes,
          createItem: line.inventoryItemID ? null : {
            name: line.createItemName,
            category: line.createItemCategory,
            unitOfMeasure: line.createItemUnit,
            preferredVendor: 'Stuller',
            vendorSku: line.itemNumber,
            stullerItemNumber: line.itemNumber,
            stullerDescription: line.createItemName,
            lastVendorCost: Number(line.unitCost || 0),
          },
        }));

      const response = await fetch(`/api/stuller/invoices/${stullerInvoiceId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineReceipts: selectedLines }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to receive Stuller invoice lines.');

      setSuccess(`Received ${data.receipts?.length || 0} Stuller line item${data.receipts?.length === 1 ? '' : 's'} into inventory.`);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Failed to receive Stuller invoice lines.');
    } finally {
      setSubmitting(false);
    }
  }, [stullerInvoiceId, stullerLineState]);

  const inventoryValue = React.useMemo(
    () => inventoryItems.reduce((sum, item) => sum + (Number(item.onHand || 0) * Number(item.lastVendorCost || 0)), 0),
    [inventoryItems]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Inventory</Typography>
          <Typography variant="body2" color="text.secondary">
            Physical stock management for shop supplies, findings, materials, receiving, and guarded reorder suggestions.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setRefreshKey((value) => value + 1)}>
            Refresh
          </Button>
          <Button component={Link} href="/dashboard/admin/stuller" variant="text">
            Open Stuller
          </Button>
          {stullerInvoiceId ? (
            <Chip color="primary" label={`Stuller invoice ${stullerInvoice?.invoiceNumber || stullerInvoiceId}`} />
          ) : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Active Items" value={String(inventoryItems.filter((item) => item.active !== false).length)} />
        <SummaryCard label="Inventory Value" value={formatMoney(inventoryValue)} note="Approximate, based on last received cost." />
        <SummaryCard label="Low Stock" value={String(lowStock.length)} color={lowStock.length > 0 ? 'warning.main' : 'inherit'} />
        <SummaryCard label="Open Suggestions" value={String(suggestions.length)} note="Advisory only. No vendor orders are sent automatically." />
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 0 }}>
          <Tabs value={tab} onChange={(_event, next) => setTab(next)} sx={{ mb: 2 }}>
            <Tab label="Inventory Items" value="items" />
            <Tab label="Receiving" value="receiving" />
            <Tab label="Consumption" value="consumption" />
            <Tab label="Low Stock" value="low-stock" />
          </Tabs>
        </CardContent>
      </Card>

      {tab === 'items' ? (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  {editingItemID ? 'Edit Inventory Item' : 'Add Inventory Item'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Name" value={itemForm.name} onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="Category" value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}>
                      {INVENTORY_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Unit" value={itemForm.unitOfMeasure} onChange={(e) => setItemForm((prev) => ({ ...prev, unitOfMeasure: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Reorder Point" type="number" value={itemForm.reorderPoint} onChange={(e) => setItemForm((prev) => ({ ...prev, reorderPoint: e.target.value }))} inputProps={{ min: 0, step: 0.001 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Reorder Qty" type="number" value={itemForm.reorderQuantity} onChange={(e) => setItemForm((prev) => ({ ...prev, reorderQuantity: e.target.value }))} inputProps={{ min: 0, step: 0.001 }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Preferred Vendor" value={itemForm.preferredVendor} onChange={(e) => setItemForm((prev) => ({ ...prev, preferredVendor: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Vendor SKU" value={itemForm.vendorSku} onChange={(e) => setItemForm((prev) => ({ ...prev, vendorSku: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      select
                      label="Linked Material"
                      value={itemForm.linkedMaterialID}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, linkedMaterialID: e.target.value }))}
                    >
                      <MenuItem value="">None</MenuItem>
                      {materials.map((material) => (
                        <MenuItem key={String(material._id)} value={String(material._id)}>
                          {material.displayName || material.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Location / Bin" value={itemForm.location} onChange={(e) => setItemForm((prev) => ({ ...prev, location: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Stuller Item #" value={itemForm.stullerItemNumber} onChange={(e) => setItemForm((prev) => ({ ...prev, stullerItemNumber: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Stuller Description" value={itemForm.stullerDescription} onChange={(e) => setItemForm((prev) => ({ ...prev, stullerDescription: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Last Vendor Cost" type="number" value={itemForm.lastVendorCost} onChange={(e) => setItemForm((prev) => ({ ...prev, lastVendorCost: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Notes" value={itemForm.notes} onChange={(e) => setItemForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={<Checkbox checked={itemForm.active} onChange={(e) => setItemForm((prev) => ({ ...prev, active: e.target.checked }))} />}
                      label="Active"
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={submitItem} disabled={submitting}>
                    {editingItemID ? 'Update Item' : 'Add Item'}
                  </Button>
                  <Button variant="outlined" onClick={resetItemForm} disabled={submitting}>Clear</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Inventory Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Actions</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>On Hand</TableCell>
                    <TableCell>Reorder Point</TableCell>
                    <TableCell>Preferred Vendor</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Last Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.inventoryItemID}>
                      <TableCell>
                        <IconButton size="small" onClick={() => {
                          setEditingItemID(item.inventoryItemID);
                          setItemForm({
                            name: item.name || '',
                            category: item.category || INVENTORY_CATEGORIES[0],
                            unitOfMeasure: item.unitOfMeasure || 'each',
                            reorderPoint: String(item.reorderPoint || ''),
                            reorderQuantity: String(item.reorderQuantity || ''),
                            preferredVendor: item.preferredVendor || '',
                            vendorSku: item.vendorSku || '',
                            linkedMaterialID: item.linkedMaterialID || '',
                            active: item.active !== false,
                            location: item.location || '',
                            notes: item.notes || '',
                            stullerItemNumber: item.stullerItemNumber || '',
                            stullerDescription: item.stullerDescription || '',
                            lastVendorCost: String(item.lastVendorCost || ''),
                          });
                        }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{formatQuantity(item.onHand)} {item.unitOfMeasure}</TableCell>
                      <TableCell>{formatQuantity(item.reorderPoint)}</TableCell>
                      <TableCell>{item.preferredVendor || 'N/A'}</TableCell>
                      <TableCell>{item.location || 'N/A'}</TableCell>
                      <TableCell>{formatMoney(item.lastVendorCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      ) : null}

      {tab === 'receiving' ? (
        <Stack spacing={3}>
          {stullerInvoice ? (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Receive From Stuller Invoice</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Invoice {stullerInvoice.invoiceNumber || stullerInvoice.stullerInvoiceID} | PO {stullerInvoice.purchaseOrderNumber || 'N/A'} | {formatDate(stullerInvoice.invoiceDate)}
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<InventoryIcon />} onClick={receiveStullerLines} disabled={submitting}>
                      Receive Selected Lines
                    </Button>
                  </Stack>

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Use</TableCell>
                        <TableCell>Item #</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Existing Item</TableCell>
                        <TableCell>New Item Name</TableCell>
                        <TableCell>Unit Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stullerInvoice.items?.map((invoiceItem, index) => {
                        const line = stullerLineState[index];
                        if (!line) return null;
                        return (
                          <TableRow key={`${stullerInvoice.stullerInvoiceID}-${line.sourceLineReference}`}>
                            <TableCell>
                              <Checkbox
                                checked={line.selected}
                                onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, selected: e.target.checked } : entry))}
                              />
                            </TableCell>
                            <TableCell>{invoiceItem.itemNumber || 'N/A'}</TableCell>
                            <TableCell>{invoiceItem.itemDescription || 'N/A'}</TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={line.quantityReceived}
                                onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantityReceived: e.target.value } : entry))}
                                inputProps={{ min: 0, step: 0.001 }}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                select
                                size="small"
                                value={line.inventoryItemID}
                                onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, inventoryItemID: e.target.value } : entry))}
                                sx={{ minWidth: 220 }}
                              >
                                <MenuItem value="">Create new item</MenuItem>
                                {inventoryItems.map((item) => (
                                  <MenuItem key={item.inventoryItemID} value={item.inventoryItemID}>
                                    {item.name}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={line.createItemName}
                                disabled={Boolean(line.inventoryItemID)}
                                onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, createItemName: e.target.value } : entry))}
                                sx={{ minWidth: 220 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={line.unitCost}
                                onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, unitCost: e.target.value } : entry))}
                                inputProps={{ min: 0, step: 0.01 }}
                                sx={{ width: 120 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>Manual Receiving</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      select
                      label="Existing Inventory Item"
                      value={receiveForm.inventoryItemID}
                      onChange={(e) => setReceiveForm((prev) => ({ ...prev, inventoryItemID: e.target.value }))}
                    >
                      <MenuItem value="">Create new item during receive</MenuItem>
                      {inventoryItems.map((item) => (
                        <MenuItem key={item.inventoryItemID} value={item.inventoryItemID}>
                          {item.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="New Item Name" value={receiveForm.createItemName} disabled={Boolean(receiveForm.inventoryItemID)} onChange={(e) => setReceiveForm((prev) => ({ ...prev, createItemName: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="New Item Category" value={receiveForm.createItemCategory} disabled={Boolean(receiveForm.inventoryItemID)} onChange={(e) => setReceiveForm((prev) => ({ ...prev, createItemCategory: e.target.value }))}>
                      {INVENTORY_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Unit" value={receiveForm.createItemUnit} disabled={Boolean(receiveForm.inventoryItemID)} onChange={(e) => setReceiveForm((prev) => ({ ...prev, createItemUnit: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Quantity Received" type="number" value={receiveForm.quantityReceived} onChange={(e) => setReceiveForm((prev) => ({ ...prev, quantityReceived: e.target.value }))} inputProps={{ min: 0, step: 0.001 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Unit Cost" type="number" value={receiveForm.unitCost} onChange={(e) => setReceiveForm((prev) => ({ ...prev, unitCost: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Receive Date" type="date" value={receiveForm.effectiveDate} onChange={(e) => setReceiveForm((prev) => ({ ...prev, effectiveDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Vendor" value={receiveForm.preferredVendor} onChange={(e) => setReceiveForm((prev) => ({ ...prev, preferredVendor: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Vendor SKU" value={receiveForm.vendorSku} onChange={(e) => setReceiveForm((prev) => ({ ...prev, vendorSku: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={12}>
                    <TextField fullWidth label="Notes" value={receiveForm.notes} onChange={(e) => setReceiveForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </Grid>
                </Grid>
                <Button variant="contained" onClick={submitReceive} disabled={submitting}>
                  Receive Inventory
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Transactions</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.slice(0, 12).map((tx) => {
                    const item = inventoryItems.find((entry) => entry.inventoryItemID === tx.inventoryItemID);
                    return (
                      <TableRow key={tx.transactionID}>
                        <TableCell>{formatDate(tx.effectiveDate, true)}</TableCell>
                        <TableCell>{item?.name || tx.inventoryItemID}</TableCell>
                        <TableCell>{tx.transactionType}</TableCell>
                        <TableCell>{tx.sourceType}</TableCell>
                        <TableCell>{tx.sourceReferenceID || 'N/A'}</TableCell>
                        <TableCell align="right">{formatQuantity(tx.quantityDelta)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      ) : null}

      {tab === 'consumption' ? (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>Repair-Linked Consumption</Typography>
                <Typography variant="body2" color="text.secondary">
                  Consumption is explicit. Inventory is not silently reduced from task pricing or material math.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      select
                      label="Inventory Item"
                      value={consumeForm.inventoryItemID}
                      onChange={(e) => setConsumeForm((prev) => ({ ...prev, inventoryItemID: e.target.value }))}
                    >
                      {inventoryItems.map((item) => (
                        <MenuItem key={item.inventoryItemID} value={item.inventoryItemID}>
                          {item.name} ({formatQuantity(item.onHand)} {item.unitOfMeasure})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Repair ID" value={consumeForm.repairID} onChange={(e) => setConsumeForm((prev) => ({ ...prev, repairID: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Quantity" type="number" value={consumeForm.quantityConsumed} onChange={(e) => setConsumeForm((prev) => ({ ...prev, quantityConsumed: e.target.value }))} inputProps={{ min: 0, step: 0.001 }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Usage Date" type="date" value={consumeForm.effectiveDate} onChange={(e) => setConsumeForm((prev) => ({ ...prev, effectiveDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Notes" value={consumeForm.notes} onChange={(e) => setConsumeForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </Grid>
                </Grid>
                <Button variant="contained" onClick={submitConsume} disabled={submitting}>
                  Record Consumption
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Usage</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Repair ID</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.filter((tx) => tx.transactionType === INVENTORY_TRANSACTION_TYPES.CONSUME).slice(0, 12).map((tx) => {
                    const item = inventoryItems.find((entry) => entry.inventoryItemID === tx.inventoryItemID);
                    return (
                      <TableRow key={tx.transactionID}>
                        <TableCell>{formatDate(tx.effectiveDate, true)}</TableCell>
                        <TableCell>{item?.name || tx.inventoryItemID}</TableCell>
                        <TableCell>{tx.sourceReferenceID || 'N/A'}</TableCell>
                        <TableCell>{tx.notes || 'N/A'}</TableCell>
                        <TableCell align="right">{formatQuantity(Math.abs(tx.quantityDelta))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      ) : null}

      {tab === 'low-stock' ? (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Low Stock Queue</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Suggestions are advisory only. No Stuller or vendor orders are placed automatically.
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<WarningAmberIcon />} onClick={createSuggestions} disabled={submitting}>
                  Generate Suggestions
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>On Hand</TableCell>
                    <TableCell>Reorder Point</TableCell>
                    <TableCell>Suggested Qty</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStock.map((item) => (
                    <TableRow key={item.inventoryItemID}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{formatQuantity(item.onHand)}</TableCell>
                      <TableCell>{formatQuantity(item.reorderPoint)}</TableCell>
                      <TableCell>{formatQuantity(item.suggestedQty)}</TableCell>
                      <TableCell>{item.preferredVendor || 'N/A'}</TableCell>
                      <TableCell>{item.lowStockReason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Open Reorder Suggestions</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Created</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Suggested Qty</TableCell>
                    <TableCell>Vendor Snapshot</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suggestions.map((suggestion) => {
                    const item = inventoryItems.find((entry) => entry.inventoryItemID === suggestion.inventoryItemID);
                    return (
                      <TableRow key={suggestion.suggestionID}>
                        <TableCell>{formatDate(suggestion.createdAt, true)}</TableCell>
                        <TableCell>{item?.name || suggestion.inventoryItemID}</TableCell>
                        <TableCell>{formatQuantity(suggestion.suggestedQty)}</TableCell>
                        <TableCell>{suggestion.vendorSnapshot?.preferredVendor || 'N/A'} {suggestion.vendorSnapshot?.vendorSku ? `(${suggestion.vendorSnapshot.vendorSku})` : ''}</TableCell>
                        <TableCell>{suggestion.status}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </Box>
  );
}
