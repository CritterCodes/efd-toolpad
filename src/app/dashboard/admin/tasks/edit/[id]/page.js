'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter, useParams } from 'next/navigation';
import { useTaskEdit } from '@/hooks/tasks/useTaskEdit';

import BasicTaskInputs from '../components/BasicTaskInputs';
import ServiceSettingsInputs from '../components/ServiceSettingsInputs';
import DisplaySettingsInputs from '../components/DisplaySettingsInputs';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id;

  const {
    loading,
    saving,
    error,
    success,
    formData,
    handleChange,
    handleNestedChange,
    handleToggle,
    handleNestedToggle,
    handleSubmit
  } = useTaskEdit(taskId);

  if (loading) {
    return (
      <PageContainer title="Edit Task">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Edit Task">
      <Box sx={{ pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h5" component="h1" gutterBottom>
              Edit Task
            </Typography>
            <Typography color="text.secondary" paragraph>
              Update task details and settings.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <BasicTaskInputs 
                  formData={formData} 
                  handleChange={handleChange} 
                />
                
                <ServiceSettingsInputs 
                  formData={formData} 
                  handleNestedChange={handleNestedChange} 
                  handleToggle={handleToggle}
                  handleNestedToggle={handleNestedToggle}
                />
                
                <DisplaySettingsInputs 
                  formData={formData} 
                  handleNestedToggle={handleNestedToggle} 
                />

                <Grid item xs={12}>
                  <Box display="flex" gap={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => router.push('/dashboard/admin/tasks')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
}
