import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { formatDate, formatMoney } from './stullerParts';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import DialogActions from '@mui/material/DialogActions';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import Link from 'next/link';

export function StullerInvoiceDialog({ createExpenseFromInvoice, creatingExpenseId, selectedInvoice, setSelectedInvoice }) {
  return (
    <>
      <Dialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedInvoice
            ? `Stuller Invoice ${selectedInvoice.invoiceNumber || selectedInvoice.stullerInvoiceID}`
            : 'Stuller Invoice'}
        </DialogTitle>
        <DialogContent dividers>
          {!selectedInvoice ? null : (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Invoice Number</Typography>
                  <Typography variant="body1">{selectedInvoice.invoiceNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Order Number</Typography>
                  <Typography variant="body1">{selectedInvoice.orderNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Purchase Order</Typography>
                  <Typography variant="body1">{selectedInvoice.purchaseOrderNumber?.trim() || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip size="small" label={selectedInvoice.status || 'Unknown'} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Invoice Date</Typography>
                  <Typography variant="body1">{formatDate(selectedInvoice.invoiceDate)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Tracking</Typography>
                  <Typography variant="body1">{selectedInvoice.trackingNumber || 'N/A'}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                  <Typography variant="h6">{formatMoney(selectedInvoice.subtotal)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Shipping</Typography>
                  <Typography variant="h6">{formatMoney(selectedInvoice.shipping)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Tax</Typography>
                  <Typography variant="h6">{formatMoney(selectedInvoice.tax)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                  <Typography variant="h6">{formatMoney(selectedInvoice.total)}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>Line Items</Typography>
                {!Array.isArray(selectedInvoice.items) || selectedInvoice.items.length === 0 ? (
                  <Typography color="text.secondary">No invoice line items were returned for this Stuller invoice.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Line</TableCell>
                        <TableCell>Item #</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Backordered</TableCell>
                        <TableCell>Unit Price</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={`${selectedInvoice.stullerInvoiceID}-${item.lineNumber || index}`}>
                          <TableCell>{item.lineNumber || index + 1}</TableCell>
                          <TableCell>{item.itemNumber || 'N/A'}</TableCell>
                          <TableCell>{item.itemDescription || item.customerNotes || 'N/A'}</TableCell>
                          <TableCell>{item.shipQuantity ?? 0}</TableCell>
                          <TableCell>{item.backOrderedQuantity ?? 0}</TableCell>
                          <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                          <TableCell>{formatMoney(item.lineTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {selectedInvoice ? (
            <Stack direction="row" spacing={1}>
              <LoadingButton
                variant="outlined"
                loading={creatingExpenseId === selectedInvoice.stullerInvoiceID}
                onClick={() => createExpenseFromInvoice(selectedInvoice.stullerInvoiceID)}
              >
                Create Expense
              </LoadingButton>
              <Button
                component={Link}
                href={`/dashboard/finance/inventory?stullerInvoiceId=${encodeURIComponent(selectedInvoice.stullerInvoiceID)}`}
                variant="contained"
              >
                Receive to Inventory
              </Button>
            </Stack>
          ) : null}
          <Button onClick={() => setSelectedInvoice(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
