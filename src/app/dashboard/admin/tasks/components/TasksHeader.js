import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  PrecisionManufacturing as PrecisionManufacturingIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { TASKS_UI } from './tasksUi';

export default function TasksHeader({ loading, handleUpdateAllPrices, handleCreateTask }) {
  const router = useRouter();

  return (
    <Box
      sx={{
        backgroundColor: { xs: 'transparent', sm: TASKS_UI.bgPanel },
        border: { xs: 'none', sm: `1px solid ${TASKS_UI.border}` },
        borderRadius: { xs: 0, sm: 3 },
        boxShadow: { xs: 'none', sm: TASKS_UI.shadow },
        p: { xs: 0.5, sm: 2.5, md: 3 },
        mb: 3
      }}
    >
      <Box sx={{ maxWidth: 960 }}>
        <Typography
          sx={{
            display: 'inline-flex',
            px: 1.25,
            py: 0.5,
            mb: 1.5,
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: TASKS_UI.textPrimary,
            backgroundColor: TASKS_UI.bgCard,
            border: `1px solid ${TASKS_UI.border}`,
            borderRadius: 2,
            textTransform: 'uppercase'
          }}
        >
          Task operations
        </Typography>
        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: TASKS_UI.textHeader, mb: 1 }}>
          Manage task definitions
        </Typography>
        <Typography sx={{ color: TASKS_UI.textSecondary, lineHeight: 1.6, mb: 2.5 }}>
          Create, revise, and maintain task rules, pricing controls, and supporting metadata across the admin workflow.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          startIcon={<MoneyIcon />}
          onClick={handleUpdateAllPrices}
          disabled={loading}
          sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}
        >
          {loading ? 'Updating...' : 'Update Prices'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => router.push('/dashboard/admin/tasks/ai-builder')}
          sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}
        >
          AI Builder
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrecisionManufacturingIcon />}
          onClick={() => router.push('/dashboard/admin/tasks/tools-machinery')}
          sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}
        >
          Tools and Machinery
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => router.push('/dashboard/admin/tasks/create')}
          sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}
        >
          Create Task
        </Button>
        <Button
          variant="text"
          onClick={handleCreateTask}
          sx={{ color: TASKS_UI.accent, alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          More Options
        </Button>
      </Stack>
    </Box>
  );
}
