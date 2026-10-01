import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatDate, FinanceDataTable, INVENTORY_CATEGORIES, getInventoryItemLabel, formatQuantity } from './inventoryParts';
import Button from '@mui/material/Button';
import InventoryIcon from '@mui/icons-material/Inventory2';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';

export function InventoryReceivingTab({ inventoryItems, receiveForm, receiveStullerLines, setReceiveForm, setStullerLineState, stullerInvoice, stullerLineState, submitReceive, submitting, tab, transactions }) {
  return (
    <>
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

                  <FinanceDataTable
                    rows={stullerInvoice.items || []}
                    getKey={(invoiceItem, index) => `${stullerInvoice.stullerInvoiceID}-${invoiceItem.lineNumber || invoiceItem.itemNumber || index}`}
                    emptyMessage="No Stuller invoice lines to receive."
                    columns={[
                      {
                        label: 'Use',
                        render: (_invoiceItem, index) => {
                          const line = stullerLineState[index];
                          if (!line) return null;
                          return (
                            <Checkbox
                              checked={line.selected}
                              onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, selected: e.target.checked } : entry))}
                            />
                          );
                        },
                      },
                      { label: 'Item #', render: (invoiceItem) => invoiceItem.itemNumber || 'N/A' },
                      { label: 'Description', render: (invoiceItem) => invoiceItem.itemDescription || 'N/A' },
                      {
                        label: 'Qty',
                        render: (_invoiceItem, index) => {
                          const line = stullerLineState[index];
                          if (!line) return null;
                          return (
                            <TextField
                              size="small"
                              type="number"
                              value={line.quantityReceived}
                              onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantityReceived: e.target.value } : entry))}
                              inputProps={{ min: 0, step: 0.001 }}
                              sx={{ width: { xs: 140, md: 100 } }}
                            />
                          );
                        },
                      },
                      {
                        label: 'Existing Item',
                        render: (_invoiceItem, index) => {
                          const line = stullerLineState[index];
                          if (!line) return null;
                          return (
                            <TextField
                              select
                              size="small"
                              value={line.inventoryItemID}
                              onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, inventoryItemID: e.target.value } : entry))}
                              sx={{ minWidth: { xs: 160, md: 220 } }}
                            >
                              <MenuItem value="">Create new item</MenuItem>
                              {inventoryItems.map((item) => (
                                <MenuItem key={item.inventoryItemID} value={item.inventoryItemID}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          );
                        },
                      },
                      {
                        label: 'New Item Name',
                        render: (_invoiceItem, index) => {
                          const line = stullerLineState[index];
                          if (!line) return null;
                          return (
                            <TextField
                              size="small"
                              value={line.createItemName}
                              disabled={Boolean(line.inventoryItemID)}
                              onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, createItemName: e.target.value } : entry))}
                              sx={{ minWidth: { xs: 160, md: 220 } }}
                            />
                          );
                        },
                      },
                      {
                        label: 'Unit Cost',
                        render: (_invoiceItem, index) => {
                          const line = stullerLineState[index];
                          if (!line) return null;
                          return (
                            <TextField
                              size="small"
                              type="number"
                              value={line.unitCost}
                              onChange={(e) => setStullerLineState((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, unitCost: e.target.value } : entry))}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: { xs: 140, md: 120 } }}
                            />
                          );
                        },
                        align: 'right',
                      },
                    ]}
                  />
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
              <FinanceDataTable
                rows={transactions.slice(0, 12)}
                getKey={(tx, index) => tx.transactionID || `${tx.inventoryItemID || 'tx'}-${index}`}
                emptyMessage="No recent transactions yet."
                columns={[
                  { label: 'Date', render: (tx) => formatDate(tx.effectiveDate, true) },
                  {
                    label: 'Item',
                    render: (tx) => {
                      const item = inventoryItems.find((entry) => entry.inventoryItemID === tx.inventoryItemID);
                      return getInventoryItemLabel(item, tx.inventoryItemID);
                    },
                  },
                  { label: 'Type', render: (tx) => tx.transactionType },
                  { label: 'Source', render: (tx) => tx.sourceType },
                  { label: 'Reference', render: (tx) => tx.sourceReferenceID || 'N/A' },
                  { label: 'Quantity', render: (tx) => formatQuantity(tx.quantityDelta), align: 'right' },
                ]}
              />
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </>
  );
}
