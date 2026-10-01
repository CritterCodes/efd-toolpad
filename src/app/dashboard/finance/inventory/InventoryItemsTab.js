import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { INVENTORY_CATEGORIES, FinanceDataTable, getInventoryItemLabel, formatQuantity, formatMoney } from './inventoryParts';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import SaveIcon from '@mui/icons-material/Save';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';

export function InventoryItemsTab({ editingItemID, inventoryItems, itemForm, materials, resetItemForm, setEditingItemID, setItemForm, submitItem, submitting, tab }) {
  return (
    <>
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
              <FinanceDataTable
                rows={inventoryItems}
                getKey={(item, index) => item.inventoryItemID || `${item.name || 'inventory'}-${index}`}
                emptyMessage="No inventory items yet."
                columns={[
                  {
                    label: 'Actions',
                    render: (item) => (
                      <Stack direction="row" justifyContent={{ xs: 'flex-end', md: 'flex-start' }}>
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
                      </Stack>
                    ),
                  },
                  { label: 'Name', render: (item) => getInventoryItemLabel(item) },
                  { label: 'Category', render: (item) => item.category },
                  { label: 'On Hand', render: (item) => `${formatQuantity(item.onHand)} ${item.unitOfMeasure || ''}`.trim() },
                  { label: 'Reorder Point', render: (item) => formatQuantity(item.reorderPoint) },
                  { label: 'Preferred Vendor', render: (item) => item.preferredVendor || 'N/A' },
                  { label: 'Location', render: (item) => item.location || 'N/A' },
                  { label: 'Last Cost', render: (item) => formatMoney(item.lastVendorCost), align: 'right' },
                ]}
              />
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </>
  );
}
