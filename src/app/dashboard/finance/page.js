"use client";

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { PageHeader, SurfaceCard, CardGrid } from '@/components/facelift';

const FINANCE_SURFACES = [
  {
    title: 'Opening Balance',
    description: 'Set the clean bank and cash drawer start line for Bank Safe-To-Spend reporting.',
    href: '/dashboard/finance/opening-balance',
  },
  {
    title: 'Inventory',
    description: 'Track physical stock, receive materials, record repair consumption, and watch low-stock suggestions.',
    href: '/dashboard/finance/inventory',
  },
  {
    title: 'Expenses',
    description: 'Record paid and planned business expenses and keep the tax reserve math honest.',
    href: '/dashboard/finance/expenses',
  },
  {
    title: 'Debt Accounts',
    description: 'Track credit cards, loans, Cash App borrowing, statements, and repayment cash flow.',
    href: '/dashboard/finance/debt-accounts',
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
    <Box sx={{ p: 3.75 }}>
      <PageHeader
        title="Finance"
        subtitle="Operational money management for expenses, owner draws, and tax reserve planning."
        boxed={false}
      />

      <Box sx={{ mt: 3 }}>
        <CardGrid min={300}>
          {FINANCE_SURFACES.map((surface) => (
            <SurfaceCard key={surface.href}>
              <Typography sx={{ fontWeight: 600, fontSize: '1.063rem', letterSpacing: '-0.022em' }}>
                {surface.title}
              </Typography>
              <Typography sx={{ flex: 1, mt: 1.125, fontSize: '0.8125rem', lineHeight: 1.6,
                                color: 'rgba(255,255,255,0.6)', textWrap: 'pretty' }}>
                {surface.description}
              </Typography>
              <Button component={Link} href={surface.href} variant="contained"
                      sx={{ alignSelf: 'flex-start', mt: 2 }}>
                Open
              </Button>
            </SurfaceCard>
          ))}
        </CardGrid>
      </Box>
    </Box>
  );
}
