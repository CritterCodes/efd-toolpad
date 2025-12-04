/**
 * Artisan Assignment Component
 * Allows admin to assign multiple artisans to a custom ticket
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Add,
  Person,
  Remove,
  Engineering,
  Diamond,
  Circle as RingIcon
} from '@mui/icons-material';

const ARTISAN_TYPE_ICONS = {
  'CAD Designer': Engineering,
  'Gem Cutter': Diamond,
  'Jeweler': RingIcon
};

/**
 * Normalize artisanType to always return an array
 * Some artisans have artisanType as string, others as array
 */
const normalizeArtisanType = (artisanType) => {
  if (Array.isArray(artisanType)) {
    return artisanType;
  }
  if (typeof artisanType === 'string') {
    return [artisanType];
  }
  return [];
};

export default function ArtisanAssignment({ ticketId, assignedArtisans = [], onUpdate }) {
  const [open, setOpen] = useState(false);
  const [availableArtisans, setAvailableArtisans] = useState([]);
  const [selectedArtisan, setSelectedArtisan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch available artisans
  const fetchArtisans = useCallback(async () => {
    try {
      console.log('🔍 [ARTISAN] Fetching artisans from /api/users?role=artisan');
      const response = await fetch('/api/users?role=artisan');
      const data = await response.json();
      
      console.log('🔍 [ARTISAN] API response:', data);
      
      if (data.success && data.data) {
        console.log('🔍 [ARTISAN] Full API data:', JSON.stringify(data.data, null, 2));
        
        // Filter out already assigned artisans and only include users with vendor info
        const assignedUserIds = assignedArtisans.map(a => a.userId);
        
        // First, let's see all artisans before filtering
        console.log('🔍 [ARTISAN] All fetched artisans:', data.data);
        console.log('🔍 [ARTISAN] Assigned user IDs:', assignedUserIds);
        
        // Apply filters step by step for debugging - use userID, not _id
        const notAssigned = data.data.filter(user => !assignedUserIds.includes(user.userID));
        console.log('🔍 [ARTISAN] Not assigned artisans:', notAssigned);
        
        // Check artisanApplication structure
        const withArtisanInfo = notAssigned.filter(user => {
          console.log('🔍 [ARTISAN] Checking user:', user.userID, 'artisanApplication:', user.artisanApplication);
          return user.artisanApplication && user.artisanApplication.businessName;
        });
        console.log('🔍 [ARTISAN] With artisan info:', withArtisanInfo);
        
        setAvailableArtisans(withArtisanInfo);
      } else {
        console.error('❌ [ARTISAN] API returned no data or failed:', data);
        setError('Failed to fetch artisans');
      }
    } catch (err) {
      console.error('❌ [ARTISAN] Error fetching artisans:', err);
      setError('Failed to load artisans');
    }
  }, [assignedArtisans]);

  // Assign artisan to ticket
  const assignArtisan = async () => {
    if (!selectedArtisan) return;

    setLoading(true);
    setError(null);

    try {
      const artisan = availableArtisans.find(a => a.userID === selectedArtisan);
      
      // Normalize artisanType to handle both string and array formats
      const artisanTypeArray = normalizeArtisanType(artisan.artisanApplication?.artisanType);
      
      const response = await fetch(`/api/custom-tickets/${ticketId}/assign-artisan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: artisan.userID,
          userName: artisan.name || artisan.email,
          artisanType: artisanTypeArray[0] || 'Artisan'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Artisan assigned successfully');
        setSelectedArtisan('');
        setOpen(false);
        
        // Refresh available artisans and notify parent
        await fetchArtisans();
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || 'Failed to assign artisan');
      }
    } catch (err) {
      console.error('Error assigning artisan:', err);
      setError('Failed to assign artisan');
    } finally {
      setLoading(false);
    }
  };

  // Remove artisan from ticket
  const removeArtisan = async (artisanUserId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-tickets/${ticketId}/remove-artisan`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: artisanUserId })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Artisan removed successfully');
        
        // Refresh available artisans and notify parent
        await fetchArtisans();
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || 'Failed to remove artisan');
      }
    } catch (err) {
      console.error('Error removing artisan:', err);
      setError('Failed to remove artisan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchArtisans();
    }
  }, [open, fetchArtisans]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const getArtisanIcon = (artisanType) => {
    const IconComponent = ARTISAN_TYPE_ICONS[artisanType] || Person;
    return <IconComponent />;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Assigned Artisans ({assignedArtisans.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpen(true)}
            size="small"
          >
            Assign Artisan
          </Button>
        </Box>

        {/* Success/Error Messages */}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Assigned Artisans List */}
        {assignedArtisans.length === 0 ? (
          <Box textAlign="center" py={2}>
            <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No artisans assigned to this ticket
            </Typography>
          </Box>
        ) : (
          <List>
            {assignedArtisans.map((artisan, index) => (
              <ListItem key={index} divider={index < assignedArtisans.length - 1}>
                <ListItemAvatar>
                  <Avatar>
                    {getArtisanIcon(artisan.artisanType)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={artisan.userName}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {artisan.artisanType}
                      </Typography>
                      {artisan.assignedAt && (
                        <Typography variant="caption" color="text.secondary">
                          Assigned: {new Date(artisan.assignedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => removeArtisan(artisan.userId)}
                    disabled={loading}
                    color="error"
                    size="small"
                  >
                    <Remove />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* Assignment Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Artisan to Ticket</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Artisan</InputLabel>
              <Select
                value={selectedArtisan}
                onChange={(e) => setSelectedArtisan(e.target.value)}
                label="Select Artisan"
              >
                {availableArtisans.map((artisan) => (
                  <MenuItem key={artisan.userID} value={artisan.userID}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar size="small">
                        {artisan.artisanApplication?.businessName?.charAt(0) || artisan.firstName?.charAt(0) || 'A'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {artisan.artisanApplication?.businessName || `${artisan.firstName} ${artisan.lastName}` || 'Unknown Artisan'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {artisan.artisanApplication?.slug && `@${artisan.artisanApplication.slug}`}
                          {(() => {
                            const types = normalizeArtisanType(artisan.artisanApplication?.artisanType);
                            return types.length > 0 && (
                              <span style={{ marginLeft: artisan.artisanApplication?.slug ? 4 : 0 }}>
                                • {types.join(', ')}
                              </span>
                            );
                          })()}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              onClick={assignArtisan} 
              variant="contained"
              disabled={!selectedArtisan || loading}
              startIcon={loading && <CircularProgress size={16} />}
            >
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}