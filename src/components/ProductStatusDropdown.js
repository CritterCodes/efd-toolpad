'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CloudUpload,
  UndoOutlined,
  Archive,
  Unarchive,
  Edit,
  Info as InfoIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getStatusDisplayName, getStatusColor } from '@/lib/statusMapping';
import { getValidTransitions, STATUS_DESCRIPTIONS } from '@/lib/statusTransitions';

const ICON_MAP = {
  'CloudUpload': CloudUpload,
  'UndoOutlined': UndoOutlined,
  'Archive': Archive,
  'Unarchive': Unarchive,
  'Edit': Edit,
  'Check': CheckIcon,
  'Close': CloseIcon
};

export default function ProductStatusDropdown({ product, onStatusChange, isLoading = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const currentStatus = product.status || 'draft';
  const validTransitions = getValidTransitions(currentStatus, product);

  // Handle unmigrated products (old status model)
  const oldStatuses = ['pending-approval', 'approved', 'rejected', 'revision-requested'];
  const isUnmigrated = oldStatuses.includes(currentStatus);

  if (isUnmigrated) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label="Needs Migration"
          color="error"
          variant="outlined"
        />
        <Typography variant="caption" color="error">
          Admin needs to run migration
        </Typography>
      </Box>
    );
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTransitionClick = (transition) => {
    setSelectedTransition(transition);
    setDialogOpen(true);
    handleMenuClose();
    setError(null);
    setSuccess(null);
  };

  const handleConfirm = async () => {
    if (!selectedTransition) return;

    try {
      setTransitionLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${product._id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: selectedTransition.to
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setSuccess(`Product status updated to ${getStatusDisplayName(selectedTransition.to)}`);
      setDialogOpen(false);
      setNotes('');
      setSelectedTransition(null);

      // Call callback to refresh product data
      if (onStatusChange) {
        onStatusChange(selectedTransition.to);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTransitionLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!transitionLoading) {
      setDialogOpen(false);
      setNotes('');
      setSelectedTransition(null);
      setError(null);
    }
  };

  if (!validTransitions || validTransitions.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={getStatusDisplayName(currentStatus)}
          color={getStatusColor(currentStatus)}
          variant="outlined"
          disabled
        />
        <Typography variant="caption" color="text.secondary">
          No actions available
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={getStatusDisplayName(currentStatus)}
          color={getStatusColor(currentStatus)}
          variant="outlined"
          icon={
            isLoading ? (
              <CircularProgress size={16} sx={{ ml: 1 }} />
            ) : undefined
          }
        />

        <Button
          id="status-menu-button"
          aria-controls={anchorEl ? 'status-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={anchorEl ? 'true' : undefined}
          onClick={handleMenuOpen}
          disabled={isLoading || transitionLoading}
          variant="outlined"
          size="small"
          sx={{ textTransform: 'none' }}
        >
          {isLoading || transitionLoading ? (
            <CircularProgress size={20} />
          ) : (
            'Change Status'
          )}
        </Button>
      </Box>

      <Menu
        id="status-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {validTransitions.map((transition) => {
          const IconComponent = ICON_MAP[transition.icon] || InfoIcon;
          return (
            <MenuItem
              key={transition.to}
              onClick={() => handleTransitionClick(transition)}
            >
              <ListItemIcon>
                <IconComponent fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={transition.label}
                secondary={transition.description}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { display: 'block', maxWidth: 250 }
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTransition && `${selectedTransition.label}?`}
        </DialogTitle>

        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {selectedTransition && (
            <Box sx={{ mt: 2 }}>
              <DialogContentText sx={{ mb: 2 }}>
                {selectedTransition.description}
              </DialogContentText>

              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Current status: {getStatusDisplayName(currentStatus)}
                </Typography>
                <Typography variant="body2" sx={{ my: 1, fontWeight: 'bold' }}>
                  {currentStatus} → {selectedTransition.to}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  New status: {getStatusDisplayName(selectedTransition.to)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleDialogClose}
            disabled={transitionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={transitionLoading}
          >
            {transitionLoading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
