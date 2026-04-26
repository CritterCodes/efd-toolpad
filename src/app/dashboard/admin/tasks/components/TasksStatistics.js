import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import {
  Build as BuildIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import { TASKS_UI } from './tasksUi';

const cards = [
  { key: 'total', label: 'Total Tasks', icon: BuildIcon, value: (s) => s.total },
  { key: 'averagePrice', label: 'Average Price', icon: MoneyIcon, value: (s) => `$${s.averagePrice?.toFixed(2) || '0.00'}` },
  { key: 'categories', label: 'Categories', icon: CategoryIcon, value: (s) => s.categories },
  { key: 'inactive', label: 'Inactive', icon: ArchiveIcon, value: (s) => s.inactive }
];

export default function TasksStatistics({ statistics }) {
  if (!statistics) return null;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map(({ key, label, icon: Icon, value }) => (
        <Grid item xs={12} sm={6} md={3} key={key}>
          <Box sx={{ backgroundColor: TASKS_UI.bgPanel, border: `1px solid ${TASKS_UI.border}`, borderRadius: 3, boxShadow: TASKS_UI.shadow, p: 2.25, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: TASKS_UI.bgCard, border: `1px solid ${TASKS_UI.border}` }}>
                <Icon sx={{ color: TASKS_UI.accent, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 700, color: TASKS_UI.textHeader, lineHeight: 1.1 }}>
                  {value(statistics)}
                </Typography>
                <Typography sx={{ color: TASKS_UI.textSecondary }}>
                  {label}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
