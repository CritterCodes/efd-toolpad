import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { FinanceDataTable, getInventoryItemLabel, formatQuantity, formatDate } from './inventoryParts';

export function InventoryLowStockTab({ createSuggestions, inventoryItems, lowStock, submitting, suggestions, tab }) {
  return (
    <>
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
              <FinanceDataTable
                rows={lowStock}
                getKey={(item, index) => item.inventoryItemID || `${item.name || 'low-stock'}-${index}`}
                emptyMessage="No low stock items."
                columns={[
                  { label: 'Item', render: (item) => getInventoryItemLabel(item) },
                  { label: 'On Hand', render: (item) => formatQuantity(item.onHand), align: 'right' },
                  { label: 'Reorder Point', render: (item) => formatQuantity(item.reorderPoint), align: 'right' },
                  { label: 'Suggested Qty', render: (item) => formatQuantity(item.suggestedQty), align: 'right' },
                  { label: 'Vendor', render: (item) => item.preferredVendor || 'N/A' },
                  { label: 'Reason', render: (item) => item.lowStockReason },
                ]}
              />
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Open Reorder Suggestions</Typography>
              <FinanceDataTable
                rows={suggestions}
                getKey={(suggestion, index) => suggestion.suggestionID || `${suggestion.inventoryItemID || 'suggestion'}-${index}`}
                emptyMessage="No open reorder suggestions."
                columns={[
                  { label: 'Created', render: (suggestion) => formatDate(suggestion.createdAt, true) },
                  {
                    label: 'Item',
                    render: (suggestion) => {
                      const item = inventoryItems.find((entry) => entry.inventoryItemID === suggestion.inventoryItemID);
                      return getInventoryItemLabel(item, suggestion.inventoryItemID);
                    },
                  },
                  { label: 'Suggested Qty', render: (suggestion) => formatQuantity(suggestion.suggestedQty), align: 'right' },
                  { label: 'Vendor Snapshot', render: (suggestion) => `${suggestion.vendorSnapshot?.preferredVendor || 'N/A'} ${suggestion.vendorSnapshot?.vendorSku ? `(${suggestion.vendorSnapshot.vendorSku})` : ''}`.trim() },
                  { label: 'Status', render: (suggestion) => suggestion.status },
                ]}
              />
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </>
  );
}
