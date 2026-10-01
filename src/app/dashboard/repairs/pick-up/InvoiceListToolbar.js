import { Card, CardContent, Stack, TextField, Button, Chip, Box, Typography, Pagination } from "@mui/material";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";
import { QrCodeScanner as ScanIcon } from "@mui/icons-material";
import { formatCurrency, INVOICES_PER_PAGE } from './pickupHelpers';

export function InvoiceListToolbar({ activeInvoiceList, activeInvoicePage, activeInvoiceSummary, activeInvoiceTotalPages, invoicePageEnd, invoicePageStart, invoiceSearch, setInvoicePage, setInvoiceScannerOpen, setInvoiceSearch, tab }) {
  return (
    <>
      {tab > 0 && (
        <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, boxShadow: REPAIRS_UI.shadow, mb: 2 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  label="Find Invoice"
                  placeholder="Scan or search invoice ID, repair ID, customer, or account"
                  value={invoiceSearch}
                  onChange={(event) => setInvoiceSearch(event.target.value)}
                  autoComplete="off"
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<ScanIcon />}
                  onClick={() => setInvoiceScannerOpen(true)}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Scan to Search
                </Button>
                <Button
                  variant="outlined"
                  disabled={!invoiceSearch}
                  onClick={() => setInvoiceSearch("")}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                >
                  Clear
                </Button>
                <Chip label={`${activeInvoiceSummary.count} shown`} />
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                {[
                  ["Invoice Total", formatCurrency(activeInvoiceSummary.total)],
                  ["Collected", formatCurrency(activeInvoiceSummary.collected)],
                  ["Remaining", formatCurrency(activeInvoiceSummary.remaining)],
                  ["Repairs", activeInvoiceSummary.repairs],
                  ["Cash", formatCurrency(activeInvoiceSummary.cash)],
                  ["Card", formatCurrency(activeInvoiceSummary.card)],
                  ["Zelle", formatCurrency(activeInvoiceSummary.zelle)],
                  ["Payments", activeInvoiceSummary.completedPayments],
                ].map(([label, value]) => (
                  <Box
                    key={label}
                    sx={{
                      border: `1px solid ${REPAIRS_UI.border}`,
                      backgroundColor: REPAIRS_UI.bgCard,
                      borderRadius: 2,
                      px: 1.25,
                      py: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: "block" }}>
                      {label}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 700, overflowWrap: "anywhere" }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {activeInvoiceList.length > INVOICES_PER_PAGE && (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                    Showing {invoicePageStart}-{invoicePageEnd} of {activeInvoiceList.length}
                  </Typography>
                  <Pagination
                    page={activeInvoicePage}
                    count={activeInvoiceTotalPages}
                    onChange={(event, value) => setInvoicePage(value)}
                    color="primary"
                    size="small"
                    sx={{
                      alignSelf: { xs: "center", md: "auto" },
                      "& .MuiPaginationItem-root": {
                        color: REPAIRS_UI.textPrimary,
                        borderColor: REPAIRS_UI.border,
                      },
                    }}
                  />
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
}
