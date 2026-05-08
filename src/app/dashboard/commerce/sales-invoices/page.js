"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  PointOfSale as PointOfSaleIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import NewClientForm from '@/app/components/clients/newClientForm.component';
import { deriveRepairItemMetadata } from '@/lib/productRepairMetadata';

const UI = {
  bgPrimary: '#0F1115',
  bgPanel: '#15181D',
  bgCard: '#171A1F',
  bgTertiary: '#1F232A',
  border: '#2A2F38',
  textPrimary: '#E6E8EB',
  textHeader: '#D1D5DB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#D4AF37',
};

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

function getClientLabel(client) {
  if (!client) return '';
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.name || client.email || client.userID;
  return `${name}${client.phoneNumber ? ` · ${client.phoneNumber}` : ''}`;
}

function getSeller(product) {
  return {
    userID: product?.seller?.userId || product?.userId || '',
    name: product?.seller?.displayName || product?.vendor || '',
  };
}

function getProductPrice(product) {
  return Number(product?.pricing?.retailPrice ?? product?.price ?? 0);
}

function getProductImageUrl(product) {
  const image = product?.images?.[0] || product?.image || product?.featuredImage || product?.media?.[0];
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url || image.thumbnail || image.secureUrl || image.src || image.previewUrl || image.imageUrl || image.originalUrl || '';
}

function buildEmptyCustomLine() {
  return {
    lineID: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'custom',
    title: '',
    unitPrice: '',
    quantity: 1,
    sellerUserID: '',
    sellerName: '',
  };
}

function getClientName(client) {
  return [client?.firstName, client?.lastName].filter(Boolean).join(' ') || client?.name || client?.email || client?.userID || '';
}

export default function SalesInvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('all');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [selectedClient, setSelectedClient] = useState(null);
  const [lines, setLines] = useState([buildEmptyCustomLine()]);
  const [cashDiscountApplied, setCashDiscountApplied] = useState(false);
  const [payNow, setPayNow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sales-invoices');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sales invoices.');
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    try {
      const [usersRes, productsRes, settingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/products/jewelry'),
        fetch('/api/admin/settings/manage'),
      ]);
      const [usersData, productsData, settingsData] = await Promise.all([
        usersRes.json(),
        productsRes.json(),
        settingsRes.json(),
      ]);

      const users = usersData.users || [];
      setClients(users.filter((user) => user.role === 'client' || !user.role || user.role === 'wholesaler'));
      setArtisans(users.filter((user) => ['artisan', 'admin', 'staff', 'dev'].includes(user.role)));
      setProducts((productsData.jewelry || []).filter((product) => product.status !== 'sold'));
      setTaxRate(Number(settingsData?.pricing?.taxRate || 0));
    } catch (err) {
      setError(err.message || 'Failed to load checkout reference data.');
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    loadReferenceData();
  }, [loadInvoices, loadReferenceData]);

  useEffect(() => {
    if (searchParams.get('create') === '1') setCreateOpen(true);
  }, [searchParams]);

  const filteredInvoices = useMemo(() => {
    if (tab === 'all') return invoices;
    if (tab === 'paid') return invoices.filter((invoice) => invoice.paymentStatus === 'paid');
    if (tab === 'open') return invoices.filter((invoice) => invoice.paymentStatus !== 'paid' && invoice.status !== 'void');
    return invoices.filter((invoice) => invoice.status === tab);
  }, [invoices, tab]);

  const preview = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 1), 0);
    const taxAmount = subtotal * taxRate;
    const grossTotal = subtotal + taxAmount;
    const cashDiscountAmount = cashDiscountApplied ? Math.max(grossTotal - Math.floor(grossTotal / 5) * 5, 0) : 0;
    const total = Math.max(grossTotal - cashDiscountAmount, 0);
    return { subtotal, taxRate, taxAmount, grossTotal, cashDiscountAmount, total };
  }, [cashDiscountApplied, lines, taxRate]);

  const resetForm = () => {
    setSelectedClient(null);
    setLines([buildEmptyCustomLine()]);
    setCashDiscountApplied(false);
    setPayNow(false);
    setPaymentMethod('cash');
    setNotes('');
    setError('');
  };

  const closeCreate = () => {
    setCreateOpen(false);
    resetForm();
  };

  const updateLine = (lineID, patch) => {
    setLines((current) => current.map((line) => line.lineID === lineID ? { ...line, ...patch } : line));
  };

  const addProductLine = (product) => {
    if (!product) return;
    const seller = getSeller(product);
    const repairItem = product.repairItem || deriveRepairItemMetadata(product);
    setLines((current) => [
      ...current,
      {
        lineID: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'product',
        productID: product.productId || product._id,
        title: product.title,
        description: product.description || '',
        imageUrl: getProductImageUrl(product),
        unitPrice: getProductPrice(product),
        quantity: 1,
        sellerUserID: seller.userID,
        sellerName: seller.name,
        repairItem,
        productImageUrl: getProductImageUrl(product),
      },
    ]);
  };

  const createInvoice = async () => {
    if (!selectedClient) {
      setError('Select or add a client before creating a sales invoice.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const clientName = getClientName(selectedClient);
      const payloadLines = lines
        .filter((line) => line.title && Number(line.unitPrice || 0) > 0)
        .map(({ pendingTask, ...line }) => ({
          ...line,
          quantity: Number(line.quantity || 1),
          unitPrice: Number(line.unitPrice || 0),
        }));

      const res = await fetch('/api/sales-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientID: selectedClient.userID || selectedClient.email,
          clientName,
          clientPhone: selectedClient.phoneNumber || '',
          clientEmail: selectedClient.email || '',
          lineItems: payloadLines,
          cashDiscountApplied,
          amountPaid: payNow ? preview.total : 0,
          paymentMethod,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sales invoice.');
      await loadInvoices();
      router.push(`/dashboard/commerce/sales-invoices/${data.invoice.invoiceID}`);
      closeCreate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const payInvoice = async (invoice) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sales-invoices/${invoice.invoiceID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay', amount: invoice.remainingBalance, method: 'cash' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to collect payment.');
      await loadInvoices();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleCashDiscount = async (invoice) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sales-invoices/${invoice.invoiceID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cash_discount', enabled: !invoice.cashDiscountApplied }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update cash discount.');
      await loadInvoices();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClientCreated = (client) => {
    setClients((current) => [client, ...current]);
    setSelectedClient(client);
    setClientOpen(false);
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Stack spacing={3}>
        <Box sx={{ bgcolor: UI.bgPanel, border: `1px solid ${UI.border}`, borderRadius: 3, p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Chip label="Commerce" size="small" sx={{ bgcolor: UI.bgCard, color: UI.textPrimary, border: `1px solid ${UI.border}`, mb: 1 }} />
              <Typography sx={{ color: UI.textHeader, fontSize: { xs: 28, md: 34 }, fontWeight: 700 }}>
                Sales Invoices
              </Typography>
              <Typography sx={{ color: UI.textSecondary }}>
                Internal POS for jewelry sales, consignment payouts, and included repair work.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<PointOfSaleIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: UI.accent, color: '#111', fontWeight: 700, alignSelf: { xs: 'stretch', sm: 'center' } }}
            >
              New Sale
            </Button>
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ borderBottom: `1px solid ${UI.border}` }}>
          <Tabs value={tab} onChange={(event, value) => setTab(value)}>
            <Tab value="all" label="All" />
            <Tab value="open" label="Open" />
            <Tab value="paid" label="Paid" />
            <Tab value="void" label="Void" />
          </Tabs>
        </Box>

        <Grid container spacing={2}>
          {filteredInvoices.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: UI.bgPanel, border: `1px solid ${UI.border}` }}>
                <CardContent>
                  <Typography sx={{ color: UI.textSecondary }}>
                    {loading ? 'Loading sales invoices...' : 'No sales invoices found.'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : filteredInvoices.map((invoice) => (
            <Grid item xs={12} md={6} lg={4} key={invoice.invoiceID}>
              <Card sx={{ bgcolor: UI.bgPanel, color: UI.textPrimary, border: `1px solid ${UI.border}`, borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>{invoice.invoiceID}</Typography>
                      <Chip size="small" label={invoice.paymentStatus} color={invoice.paymentStatus === 'paid' ? 'success' : 'warning'} />
                    </Stack>
                    <Typography sx={{ color: UI.textPrimary, fontWeight: 600 }}>{invoice.clientName}</Typography>
                    <Typography variant="body2" sx={{ color: UI.textSecondary }}>
                      {(invoice.lineItems || []).map((line) => line.title).join(', ')}
                    </Typography>
                    <Divider sx={{ borderColor: UI.border }} />
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`Total ${money(invoice.total)}`} />
                      <Chip size="small" label={`Due ${money(invoice.remainingBalance)}`} />
                      {(invoice.linkedRepairIDs || []).map((repairID) => (
                        <Chip
                          key={repairID}
                          size="small"
                          icon={<PrintIcon />}
                          label={repairID}
                          onClick={() => router.push(`/dashboard/repairs/${repairID}/print`)}
                        />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => router.push(`/dashboard/commerce/sales-invoices/${invoice.invoiceID}`)}>
                        View Details
                      </Button>
                      <Button size="small" startIcon={<PrintIcon />} onClick={() => router.push(`/dashboard/commerce/sales-invoices/${invoice.invoiceID}/print`)}>
                        Print Invoice
                      </Button>
                      {(invoice.linkedRepairIDs || []).length > 1 && (
                        <Button size="small" startIcon={<PrintIcon />} onClick={() => router.push(`/dashboard/repairs/bulk-print?ids=${(invoice.linkedRepairIDs || []).join(',')}`)}>
                          Print All Tickets
                        </Button>
                      )}
                      {invoice.paymentStatus !== 'paid' && invoice.status !== 'void' && (
                        <>
                          <Button size="small" startIcon={<PaymentIcon />} onClick={() => payInvoice(invoice)} disabled={saving}>
                            Collect Cash
                          </Button>
                          <Button size="small" onClick={() => toggleCashDiscount(invoice)} disabled={saving}>
                            {invoice.cashDiscountApplied ? 'Remove Discount' : 'Cash Discount'}
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>

      <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="lg" PaperProps={{ sx: { bgcolor: UI.bgPanel, color: UI.textPrimary, border: `1px solid ${UI.border}` } }}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>New Sales Invoice</Typography>
            <IconButton onClick={closeCreate}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: UI.border }}>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Autocomplete
                fullWidth
                options={clients}
                value={selectedClient}
                onChange={(event, value) => setSelectedClient(value)}
                getOptionLabel={getClientLabel}
                renderInput={(params) => <TextField {...params} label="Client" />}
              />
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setClientOpen(true)} sx={{ flexShrink: 0 }}>
                Add Client
              </Button>
            </Stack>

            <Autocomplete
              options={products}
              getOptionLabel={(product) => `${product.title || 'Jewelry'} · ${money(getProductPrice(product))}`}
              onChange={(event, value) => addProductLine(value)}
              renderInput={(params) => <TextField {...params} label="Add product from collection" />}
            />

            <Stack spacing={2}>
              {lines.map((line, index) => (
                <Card key={line.lineID} sx={{ bgcolor: UI.bgCard, border: `1px solid ${UI.border}` }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Chip label={line.type === 'product' ? 'Product' : 'Custom'} size="small" />
                        <IconButton onClick={() => setLines((current) => current.filter((item) => item.lineID !== line.lineID))} disabled={lines.length === 1 && index === 0}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} md={4}>
                          <TextField fullWidth label="Item" value={line.title} onChange={(e) => updateLine(line.lineID, { title: e.target.value })} disabled={line.type === 'product'} />
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <TextField fullWidth label="Price" type="number" value={line.unitPrice} onChange={(e) => updateLine(line.lineID, { unitPrice: e.target.value })} inputProps={{ min: 0, step: 0.01 }} />
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <TextField fullWidth label="Qty" type="number" value={line.quantity} onChange={(e) => updateLine(line.lineID, { quantity: e.target.value })} inputProps={{ min: 1, step: 1 }} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Autocomplete
                            options={artisans}
                            value={artisans.find((artisan) => artisan.userID === line.sellerUserID || artisan.email === line.sellerUserID) || null}
                            onChange={(event, value) => updateLine(line.lineID, {
                              sellerUserID: value?.userID || value?.email || '',
                              sellerName: [value?.firstName, value?.lastName].filter(Boolean).join(' ') || value?.name || value?.email || '',
                            })}
                            getOptionLabel={(user) => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.email || user.userID || ''}
                            renderInput={(params) => <TextField {...params} label="Selling artisan" required />}
                          />
                        </Grid>
                      </Grid>

                      {false && <FormControl>
                        <FormLabel sx={{ color: UI.textSecondary }}>Repair work</FormLabel>
                        <RadioGroup
                          row
                          value={line.repairMode || 'none'}
                          onChange={(event) => {
                            if (event.target.value === 'none') {
                              clearRepairDraft(line.lineID);
                            } else {
                              updateLine(line.lineID, { repairMode: 'draft' });
                              openRepairDraft(line.lineID);
                            }
                          }}
                        >
                          <FormControlLabel value="none" control={<Radio />} label="No repair work" />
                          <FormControlLabel value="draft" control={<Radio />} label="Create included repair ticket" />
                        </RadioGroup>
                      </FormControl>}
                      {false && line.repairMode === 'draft' && (
                        <Stack spacing={1}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button variant="outlined" onClick={() => openRepairDraft(line.lineID)}>
                              {line.repairDraft ? 'Edit Repair Ticket Draft' : 'Create Repair Ticket Draft'}
                            </Button>
                            {line.repairDraft && (
                              <Button color="error" onClick={() => clearRepairDraft(line.lineID)}>
                                Remove Draft
                              </Button>
                            )}
                          </Stack>
                          {line.repairDraft && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip label={`Promise ${line.repairDraft.promiseDate || 'not set'}`} size="small" />
                              {(line.repairDraft.tasks || []).map((task, taskIndex) => (
                                <Chip
                                  key={`${line.lineID}-${taskIndex}`}
                                  label={`${task.title || task.name} · included`}
                                  size="small"
                                />
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      )}

                      <Typography variant="body2" sx={{ color: UI.textSecondary }}>
                        Repair tickets are created from the saved invoice detail page when this item needs bench work.
                      </Typography>

                      {false && <Box data-old-task-picker sx={{ display: 'none' }}>
                        <Autocomplete
                          fullWidth
                          options={tasks}
                          value={line.pendingTask || null}
                          isOptionEqualToValue={(option, value) => (option.id || option._id || option.title || option.name) === (value.id || value._id || value.title || value.name)}
                          getOptionLabel={(task) => `${task.title || task.name} · ${getTaskLaborHours(task).toFixed(2)}h`}
                          onChange={(event, value) => updateLine(line.lineID, { pendingTask: value })}
                          renderInput={(params) => <TextField {...params} label="Included repair task" />}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => addTaskToLine(line.lineID, line.pendingTask)}
                          disabled={!line.pendingTask}
                          sx={{ flexShrink: 0 }}
                        >
                          Add Task
                        </Button>
                      </Box>}
                      {false && (line.includedTasks || []).length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {line.includedTasks.map((task, taskIndex) => (
                            <Chip
                              key={`${line.lineID}-${taskIndex}`}
                              label={`${task.title || task.name} · included`}
                              onDelete={() => removeTaskFromLine(line.lineID, taskIndex)}
                            />
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setLines((current) => [...current, buildEmptyCustomLine()])}>
              Add Custom Line
            </Button>

            <Card sx={{ bgcolor: UI.bgCard, border: `1px solid ${UI.border}` }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1}>
                      <FormControlLabel control={<Switch checked={cashDiscountApplied} onChange={(e) => setCashDiscountApplied(e.target.checked)} />} label="Apply cash discount" />
                      <FormControlLabel control={<Switch checked={payNow} onChange={(e) => setPayNow(e.target.checked)} />} label="Collect payment now" />
                      {payNow && (
                        <TextField select label="Payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="card">Card</MenuItem>
                          <MenuItem value="zelle">Zelle</MenuItem>
                        </TextField>
                      )}
                      <Typography>Subtotal: {money(preview.subtotal)}</Typography>
                      <Typography>Tax: {money(preview.taxAmount)}</Typography>
                      {cashDiscountApplied && <Typography>Cash discount: -{money(preview.cashDiscountAmount)}</Typography>}
                      <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>Total: {money(preview.total)}</Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeCreate}>Cancel</Button>
          <Button variant="contained" onClick={createInvoice} disabled={saving} sx={{ bgcolor: UI.accent, color: '#111', fontWeight: 700 }}>
            {saving ? 'Creating...' : payNow ? 'Create & Pay' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {false && <Dialog
        open={Boolean(repairDraftLine)}
        onClose={() => setRepairDraftLineID(null)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: UI.bgPanel, color: UI.textPrimary, border: `1px solid ${UI.border}` } }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>
              Included Repair Ticket Draft
            </Typography>
            <IconButton onClick={() => setRepairDraftLineID(null)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: UI.border }}>
          {repairDraftLine && selectedClient && (
            <NewRepairForm
              key={`${repairDraftLine.lineID}-${repairDraftLine.repairDraft ? 'edit' : 'new'}`}
              persistOnSubmit={false}
              submitLabel="Save Ticket Draft"
              initialData={buildRepairDraftInitialData(repairDraftLine, selectedClient)}
              clientInfo={{
                userID: selectedClient.userID || selectedClient.email || '',
                name: getClientName(selectedClient),
              }}
              onSubmit={saveRepairDraft}
            />
          )}
        </DialogContent>
      </Dialog>}

      <NewClientForm open={clientOpen} onClose={() => setClientOpen(false)} onClientCreated={handleClientCreated} />

      {false && <Dialog
        open={Boolean(createdInvoice)}
        onClose={() => setCreatedInvoice(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { bgcolor: UI.bgPanel, color: UI.textPrimary, border: `1px solid ${UI.border}` } }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>Repair Ticket Created</Typography>
            <IconButton onClick={() => setCreatedInvoice(null)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: UI.border }}>
          <Stack spacing={2}>
            <Alert severity="info">
              This sale created included repair work. Print the repair ticket and send the item through the normal bench workflow.
            </Alert>
            <Stack spacing={1}>
              {(createdInvoice?.linkedRepairIDs || []).length > 1 && (
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => router.push(`/dashboard/repairs/bulk-print?ids=${(createdInvoice?.linkedRepairIDs || []).join(',')}`)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Print All Repair Tickets
                </Button>
              )}
              {(createdInvoice?.linkedRepairIDs || []).map((repairID) => (
                <Button
                  key={repairID}
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={() => router.push(`/dashboard/repairs/${repairID}/print`)}
                  sx={{ justifyContent: 'flex-start', bgcolor: UI.accent, color: '#111', fontWeight: 700 }}
                >
                  Print Repair Ticket {repairID}
                </Button>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreatedInvoice(null)}>Close</Button>
          <Button onClick={() => router.push('/dashboard/repairs/my-bench')}>Go to My Bench</Button>
        </DialogActions>
      </Dialog>}
    </Box>
  );
}
