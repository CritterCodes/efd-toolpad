'use client';

import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function RepairTasksMigrationPage() {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [migrationResults, setMigrationResults] = React.useState(null);
  const [validationResults, setValidationResults] = React.useState(null);
  const [confirmDialog, setConfirmDialog] = React.useState({ open: false, action: null });
  const [confirmToken, setConfirmToken] = React.useState('');

  // Fetch migration status on component load
  React.useEffect(() => {
    fetchMigrationStatus();
  }, []);

  const fetchMigrationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/migrate-repair-tasks');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to fetch migration status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async (action, additionalData = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/migrate-repair-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userEmail: 'admin@engeldesign.com', // You might want to get this from auth
          ...additionalData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (action === 'migrate_all') {
          setMigrationResults(data.data);
        } else if (action === 'validate') {
          setValidationResults(data.data);
        }
        
        // Refresh status after any action
        await fetchMigrationStatus();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError(`Failed to execute ${action}`);
      console.error(error);
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: null });
      setConfirmToken('');
    }
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action === 'rollback') {
      executeMigration('rollback', { confirmationToken: confirmToken });
    } else {
      executeMigration(confirmDialog.action);
    }
  };

  const renderStatusCard = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Migration Status
        </Typography>
        {status && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                RepairTasks Total
              </Typography>
              <Typography variant="h4">
                {status.repairTasksTotal}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Tasks Total
              </Typography>
              <Typography variant="h4">
                {status.tasksTotal}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Migrated Count
              </Typography>
              <Typography variant="h4" color="primary">
                {status.migratedCount}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Pending Migration
              </Typography>
              <Typography variant="h4" color="warning.main">
                {status.pendingMigration}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box mt={2}>
                <Chip 
                  label={status.migrationComplete ? 'Migration Complete' : 'Migration Pending'}
                  color={status.migrationComplete ? 'success' : 'warning'}
                />
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  const renderMigrationResults = () => (
    migrationResults && (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Migration Results
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography variant="h5">{migrationResults.total}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Migrated</Typography>
              <Typography variant="h5" color="success.main">{migrationResults.migrated}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Skipped</Typography>
              <Typography variant="h5" color="info.main">{migrationResults.skipped}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Errors</Typography>
              <Typography variant="h5" color="error.main">{migrationResults.errors}</Typography>
            </Grid>
          </Grid>
          {migrationResults.errors > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="error">
                Errors encountered during migration:
              </Typography>
              <List dense>
                {migrationResults.details
                  .filter(detail => !detail.success)
                  .slice(0, 5)
                  .map((detail, index) => (
                    <ListItem key={index}>
                      <ListItemText 
                        primary={`ID: ${detail.originalId}`}
                        secondary={detail.message}
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    )
  );

  const renderValidationResults = () => (
    validationResults && (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Validation Results
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Total RepairTasks</Typography>
              <Typography variant="h5">{validationResults.totalRepairTasks}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Migrated Tasks</Typography>
              <Typography variant="h5" color="primary">{validationResults.migratedTasks}</Typography>
            </Grid>
          </Grid>
          <Box mt={2}>
            <Chip 
              label={validationResults.migrationComplete ? 'Migration Valid' : 'Migration Incomplete'}
              color={validationResults.migrationComplete ? 'success' : 'error'}
            />
          </Box>
          {validationResults.missingTasks.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="error">
                Missing Tasks ({validationResults.missingTasks.length}):
              </Typography>
              <List dense>
                {validationResults.missingTasks.slice(0, 5).map((task, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={task.title}
                      secondary={`ID: ${task.id} | SKU: ${task.sku}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          {validationResults.dataIntegrityIssues.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="warning.main">
                Data Integrity Issues ({validationResults.dataIntegrityIssues.length}):
              </Typography>
              <List dense>
                {validationResults.dataIntegrityIssues.slice(0, 3).map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={issue.issue}
                      secondary={`Original: ${issue.original} | Migrated: ${issue.migrated}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    )
  );

  return (
    <PageContainer title="RepairTasks Migration">
      <Box sx={{ pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderStatusCard()}
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Migration Actions
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={() => fetchMigrationStatus()}
                    disabled={loading}
                  >
                    Refresh Status
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setConfirmDialog({ open: true, action: 'migrate_all' })}
                    disabled={loading || (status && status.migrationComplete)}
                  >
                    Migrate All RepairTasks
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => setConfirmDialog({ open: true, action: 'validate' })}
                    disabled={loading}
                  >
                    Validate Migration
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setConfirmDialog({ open: true, action: 'rollback' })}
                    disabled={loading || (status && status.migratedCount === 0)}
                  >
                    Rollback Migration
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {migrationResults && (
            <Grid item xs={12}>
              {renderMigrationResults()}
            </Grid>
          )}

          {validationResults && (
            <Grid item xs={12}>
              {renderValidationResults()}
            </Grid>
          )}
        </Grid>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
          <DialogTitle>
            Confirm {confirmDialog.action?.replace('_', ' ').toUpperCase()}
          </DialogTitle>
          <DialogContent>
            {confirmDialog.action === 'migrate_all' && (
              <Typography>
                This will migrate all repairTasks to the new tasks system. Existing migrated tasks will be skipped.
              </Typography>
            )}
            {confirmDialog.action === 'validate' && (
              <Typography>
                This will validate the integrity of the migration by comparing data between old and new systems.
              </Typography>
            )}
            {confirmDialog.action === 'rollback' && (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>DANGER:</strong> This will permanently delete all migrated tasks from the new system.
                </Alert>
                <TextField
                  fullWidth
                  label="Type 'CONFIRM_ROLLBACK_MIGRATION' to confirm"
                  value={confirmToken}
                  onChange={(e) => setConfirmToken(e.target.value)}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ open: false, action: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              color={confirmDialog.action === 'rollback' ? 'error' : 'primary'}
              disabled={confirmDialog.action === 'rollback' && confirmToken !== 'CONFIRM_ROLLBACK_MIGRATION'}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
