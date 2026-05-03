"use client";

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const FINANCE_SURFACES = [
  {
    title: 'Expenses',
    description: 'Record paid and planned business expenses and keep the tax reserve math honest.',
    href: '/dashboard/finance/expenses',
  },
  {
    title: 'Owner Draws',
    description: 'Manage owner withdrawals separately from jeweler labor payroll.',
    href: '/dashboard/finance/owner-draws',
  },
  {
    title: 'Tax Reserve',
    description: 'Review federal reserve estimates and spendable cash from tracked collections and expenses.',
    href: '/dashboard/finance/tax-reserve',
  },
];

export default function FinanceIndexPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Finance</Typography>
        <Typography variant="body2" color="text.secondary">
          Operational money management for expenses, owner draws, and tax reserve planning.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {FINANCE_SURFACES.map((surface) => (
          <Grid item xs={12} md={6} lg={4} key={surface.href}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {surface.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {surface.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button component={Link} href={surface.href} variant="contained">
                  Open
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
