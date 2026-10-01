import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { formatQuantity, FinanceDataTable, formatDate, getInventoryItemLabel } from './inventoryParts';
import Button from '@mui/material/Button';
import { INVENTORY_TRANSACTION_TYPES } from '@/services/inventory';

export function InventoryConsumptionTab({ consumeForm, inventoryItems, setConsumeForm, submitConsume, submitting, tab, transactions }) {
  return (
    <>
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
              <FinanceDataTable
                rows={transactions.filter((tx) => tx.transactionType === INVENTORY_TRANSACTION_TYPES.CONSUME).slice(0, 12)}
                getKey={(tx, index) => tx.transactionID || `${tx.inventoryItemID || 'usage'}-${index}`}
                emptyMessage="No recent usage yet."
                columns={[
                  { label: 'Date', render: (tx) => formatDate(tx.effectiveDate, true) },
                  {
                    label: 'Item',
                    render: (tx) => {
                      const item = inventoryItems.find((entry) => entry.inventoryItemID === tx.inventoryItemID);
                      return getInventoryItemLabel(item, tx.inventoryItemID);
                    },
                  },
                  { label: 'Repair ID', render: (tx) => tx.sourceReferenceID || 'N/A' },
                  { label: 'Notes', render: (tx) => tx.notes || 'N/A' },
                  { label: 'Quantity', render: (tx) => formatQuantity(Math.abs(tx.quantityDelta)), align: 'right' },
                ]}
              />
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </>
  );
}
