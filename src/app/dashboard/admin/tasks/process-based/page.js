'use client';

import { useRouter } from 'next/navigation';
import { Box, Paper, Typography, Button, Grid, Alert, Chip } from '@mui/material';
import { Settings as SettingsIcon, Add as AddIcon } from '@mui/icons-material';
import { useProcessTaskBuilder } from '@/hooks/tasks/useProcessTaskBuilder';

// Components
import ProcessTaskBasicInfo from './components/ProcessTaskBasicInfo';
import ProcessTaskProcessSelection from './components/ProcessTaskProcessSelection';
import ProcessTaskMaterialSelection from './components/ProcessTaskMaterialSelection';
import ProcessTaskCalculations from './components/ProcessTaskCalculations';

export default function ProcessBasedTaskBuilder() {
  const router = useRouter();

  const {
    formData, setFormData, availableProcesses, availableMaterials,
    dataLoadErrors, loading, error, success, pricePreview,
    addProcess, removeProcess, updateProcess, addMaterial,
    removeMaterial, updateMaterial, handleSubmit,
    getCompatibleMaterials, loadInitialData
  } = useProcessTaskBuilder();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Task Builder
          </Typography>
          <Chip 
            label="Recommended" 
            color="success" 
            size="small" 
            sx={{ ml: 2 }}
          />
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create tasks by selecting processes and materials for accurate pricing and better workflow management.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {(dataLoadErrors.processes || dataLoadErrors.materials) && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={loadInitialData}>
                Retry
              </Button>
            }
          >
            <strong>Data Loading Issues:</strong>
            {dataLoadErrors.processes && <div>• Processes could not be loaded</div>}
            {dataLoadErrors.materials && <div>• Materials could not be loaded</div>}
            <div style={{ marginTop: '8px' }}>
              <strong>Possible causes:</strong> Authentication timeout, network issues, or API problems.
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            
            <Grid item xs={12}>
              <ProcessTaskBasicInfo 
                formData={formData} 
                setFormData={setFormData} 
              />
            </Grid>

            <Grid item xs={12}>
              <ProcessTaskProcessSelection
                formData={formData}
                availableProcesses={availableProcesses}
                addProcess={addProcess}
                updateProcess={updateProcess}
                removeProcess={removeProcess}
              />
            </Grid>

            <Grid item xs={12}>
              <ProcessTaskMaterialSelection
                formData={formData}
                availableMaterials={availableMaterials}
                getCompatibleMaterials={getCompatibleMaterials}
                addMaterial={addMaterial}
                updateMaterial={updateMaterial}
                removeMaterial={removeMaterial}
              />
            </Grid>

            {pricePreview && Object.keys(pricePreview).length > 0 && (
              <Grid item xs={12}>
                <ProcessTaskCalculations pricePreview={pricePreview} />
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || formData.processes.length === 0}
                  startIcon={loading ? null : <AddIcon />}
                >
                  {loading ? 'Creating...' : 'Create Process-Based Task'}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/dashboard/admin/tasks')}
                >
                  Cancel
                </Button>
              </Box>
            </Grid>

          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
