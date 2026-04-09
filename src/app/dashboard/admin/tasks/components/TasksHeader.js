import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { AttachMoney as MoneyIcon, Add as AddIcon, AutoAwesome as AutoAwesomeIcon, PrecisionManufacturing as PrecisionManufacturingIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function TasksHeader({ loading, handleUpdateAllPrices, handleCreateTask }) {
  const router = useRouter();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' },
      justifyContent: 'space-between', 
      alignItems: { xs: 'flex-start', md: 'center' }, 
      gap: 2,
      mb: 3,
      mt: 2
    }}>
      <Typography variant="h4" component="h1">
        Tasks Management
      </Typography>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        sx={{ width: { xs: '100%', md: 'auto' } }}
      >
        <Button
          variant="outlined"
          startIcon={<MoneyIcon />}
          onClick={handleUpdateAllPrices}
          disabled={loading}
          size="medium"
          color="secondary"
          sx={{ flex: { xs: 1, sm: 'none' } }}
        >
          {loading ? 'Updating...' : 'Update Prices'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => router.push('/dashboard/admin/tasks/ai-builder')}
          size="medium"
          color="primary"
          sx={{ flex: { xs: 1, sm: 'none' } }}
        >
          AI Builder
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrecisionManufacturingIcon />}
          onClick={() => router.push('/dashboard/admin/tasks/tools-machinery')}
          size="medium"
          sx={{ flex: { xs: 1, sm: 'none' } }}
        >
          Tools and Machinery
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/dashboard/admin/tasks/create')}
          size="medium"
          sx={{ flex: { xs: 1, sm: 'none' } }}
        >
          Create Universal Task
        </Button>
        <Button
          variant="outlined"
          onClick={handleCreateTask}
          size="medium"
          sx={{ flex: { xs: 1, sm: 'none' } }}
        >
          More Options
        </Button>
      </Stack>
    </Box>
  );
}
