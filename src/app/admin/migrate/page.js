'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export default function MigrationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch migration status
  useEffect(() => {
    if (status === 'loading' || session?.user?.role !== 'admin') {
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/migrate/products-status');
        const data = await response.json();
        
        if (data.success) {
          setMigrationStatus(data.migrationStatus);
        } else {
          setError(data.error || 'Failed to fetch migration status');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [status, session?.user?.role]);

  // Check if user is admin
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Admin access required
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
          Back
        </Button>
      </Box>
    );
  }

  const handleMigrate = async () => {
    try {
      setMigrating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/migrate/products-status', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`✅ Migration complete! ${data.result.migratedCount} products migrated`);
        
        // Refresh status
        const statusResponse = await fetch('/api/admin/migrate/products-status');
        const statusData = await statusResponse.json();
        if (statusData.success) {
          setMigrationStatus(statusData.migrationStatus);
        }
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '600px', mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>
        Back
      </Button>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Product Status Model Migration
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This tool migrates all products from the old status model to the new simplified model:
      </Typography>

      <List sx={{ mb: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <ListItem>
          <ListItemText
            primary="Old Model"
            secondary="status: draft, pending-approval, approved, rejected, archived, etc."
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="New Model"
            secondary="status: draft, published, archived + isApproved: true/false"
          />
        </ListItem>
      </List>

      {/* Migration Status Card */}
      {migrationStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Migration Status
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Progress: {migrationStatus.percentComplete}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={migrationStatus.percentComplete}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Already Migrated
                </Typography>
                <Typography variant="h6" color="success.main">
                  {migrationStatus.alreadyMigrated}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Needs Migration
                </Typography>
                <Typography variant="h6" color={migrationStatus.needsMigration > 0 ? 'error.main' : 'success.main'}>
                  {migrationStatus.needsMigration}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Products
                </Typography>
                <Typography variant="h6">
                  {migrationStatus.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Action Button */}
      {migrationStatus?.needsMigration > 0 && (
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleMigrate}
          disabled={migrating}
          fullWidth
          sx={{ mb: 2 }}
        >
          {migrating ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Migrating...
            </>
          ) : (
            `Migrate ${migrationStatus.needsMigration} Products`
          )}
        </Button>
      )}

      {migrationStatus?.needsMigration === 0 && (
        <Alert severity="success">
          ✅ All products are migrated! You can now use the new status system.
        </Alert>
      )}
    </Box>
  );
}
