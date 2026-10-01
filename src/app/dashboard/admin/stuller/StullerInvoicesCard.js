import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import { formatDate, formatMoney } from './stullerParts';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { LoadingButton } from '@mui/lab';
import Link from 'next/link';

export function StullerInvoicesCard({ createExpenseFromInvoice, creatingExpenseId, invoices, loading, loadingInvoiceDetail, openInvoiceDetails }) {
  return (
    <>
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
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => openInvoiceDetails(invoice.stullerInvoiceID)}
                          disabled={loadingInvoiceDetail}
                        >
                          View Details
                        </Button>
                      <LoadingButton
                        variant="outlined"
                        size="small"
                        loading={creatingExpenseId === invoice.stullerInvoiceID}
                        onClick={() => createExpenseFromInvoice(invoice.stullerInvoiceID)}
                      >
                        Create Expense
                      </LoadingButton>
                      <Button
                        component={Link}
                        href={`/dashboard/finance/inventory?stullerInvoiceId=${encodeURIComponent(invoice.stullerInvoiceID)}`}
                        variant="text"
                        size="small"
                      >
                        Receive to Inventory
                      </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
