import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  Button
} from '@mui/material';
import { Add as AddIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { ProcessCard } from './ProcessCard';

/**
 * ProcessesGrid Component
 * Grid layout for displaying processes with empty state
 */
export const ProcessesGrid = ({
  processes,
  onEdit,
  onDelete,
  onAddNew,
  adminSettings = null
}) => {
  if (!processes || processes.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No processes found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Get started by adding your first process
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddNew}
            >
              Add Process
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {processes.map((process) => (
        <Grid item xs={12} sm={6} md={4} key={process._id}>
          <ProcessCard
            process={process}
            onEdit={onEdit}
            onDelete={onDelete}
            adminSettings={adminSettings}
          />
        </Grid>
      ))}
    </Grid>
  );
};
