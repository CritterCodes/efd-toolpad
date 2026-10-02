"use client";

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TabRail } from '@/components/facelift';
import RefreshIcon from '@mui/icons-material/Refresh';
import { SummaryCard, buildStullerLineState, formatMoney, formatQuantity, getDefaultConsumeForm, getDefaultItemForm, getDefaultReceiveForm } from './inventoryParts';
import { InventoryLowStockTab } from './InventoryLowStockTab';
import { InventoryConsumptionTab } from './InventoryConsumptionTab';
import { InventoryReceivingTab } from './InventoryReceivingTab';
import { InventoryItemsTab } from './InventoryItemsTab';

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

  // Everything the tab panels read, passed whole to each (each takes only the names it uses).
  const inventory = {
    consumeForm, createSuggestions, editingItemID, inventoryItems, itemForm, lowStock, materials, receiveForm,
    receiveStullerLines, resetItemForm, setConsumeForm, setEditingItemID, setItemForm, setReceiveForm,
    setStullerLineState, stullerInvoice, stullerLineState, submitConsume, submitItem, submitReceive,
    submitting, suggestions, tab, transactions,
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight="bold">Inventory</Typography>
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
          <TabRail
            ariaLabel="Inventory views"
            value={tab}
            onChange={setTab}
            items={[
              { key: 'items', label: 'Inventory Items' },
              { key: 'receiving', label: 'Receiving' },
              { key: 'consumption', label: 'Consumption' },
              { key: 'low-stock', label: 'Low Stock' },
            ]}
          />
        </CardContent>
      </Card>

      <InventoryItemsTab {...inventory} />

      <InventoryReceivingTab {...inventory} />

      <InventoryConsumptionTab {...inventory} />

      <InventoryLowStockTab {...inventory} />
    </Box>
  );
}
