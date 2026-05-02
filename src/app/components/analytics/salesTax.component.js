"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';

function exportCSV(tableData, totals) {
  const header = 'Month,Taxable Repairs,Tax Collected,Non-Taxable Repairs,Total Revenue';
  const rows = tableData.map((row) =>
    `${row.month},${row.taxable},$${Number(row.taxCollected || 0).toFixed(2)},${row.nonTaxable},$${Number(row.revenue || 0).toFixed(2)}`
  );
  rows.push(`TOTAL,${totals.taxable},$${Number(totals.taxCollected || 0).toFixed(2)},${totals.nonTaxable},$${Number(totals.revenue || 0).toFixed(2)}`);
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sales-tax-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function SalesTaxReport({ summary = {} }) {
  const tableData = Array.isArray(summary.rows) ? summary.rows : [];
  const totals = summary.totals || { taxable: 0, taxCollected: 0, nonTaxable: 0, revenue: 0 };

  return (
    <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">Sales Tax Report</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => exportCSV(tableData, totals)}
          disabled={tableData.length === 0}
        >
          Export CSV
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {tableData.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No data for selected range</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Month</strong></TableCell>
              <TableCell align="right"><strong>Taxable</strong></TableCell>
              <TableCell align="right"><strong>Tax Collected</strong></TableCell>
              <TableCell align="right"><strong>Non-Taxable</strong></TableCell>
              <TableCell align="right"><strong>Total Revenue</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.month} hover>
                <TableCell>{row.month}</TableCell>
                <TableCell align="right">{row.taxable}</TableCell>
                <TableCell align="right">${Number(row.taxCollected || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{row.nonTaxable}</TableCell>
                <TableCell align="right">${Number(row.revenue || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell><strong>Total</strong></TableCell>
              <TableCell align="right"><strong>{totals.taxable}</strong></TableCell>
              <TableCell align="right"><strong>${Number(totals.taxCollected || 0).toFixed(2)}</strong></TableCell>
              <TableCell align="right"><strong>{totals.nonTaxable}</strong></TableCell>
              <TableCell align="right"><strong>${Number(totals.revenue || 0).toFixed(2)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

SalesTaxReport.propTypes = {
  summary: PropTypes.object,
};
