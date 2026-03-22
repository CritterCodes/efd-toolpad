import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Button,
  Alert
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Check as ApproveIcon,
  Close as RejectIcon
} from '@mui/icons-material';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'declined': return 'error';
    case 'in_review': return 'info';
    default: return 'default';
  }
};

const getStatusIcon = (status) => {
  if (status === 'approved') return <ApproveIcon sx={{ fontSize: 16, mr: 0.5 }} />;
  if (status === 'declined') return <RejectIcon sx={{ fontSize: 16, mr: 0.5 }} />;
  return null;
};

export default function CADDesignCard({ design, onOpenMenu, isDeclinedView, onViewDetails }) {
  if (isDeclinedView) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6">{design.title}</Typography>
            <Chip
              icon={<RejectIcon />}
              label="Declined"
              color="error"
              size="small"
            />
          </Box>
          {design.feedbackNotes && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Feedback:</Typography>
              <Typography variant="body2">{design.feedbackNotes}</Typography>
            </Alert>
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onViewDetails(design)}
            >
              View Details
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {design.title}
          </Typography>
          {onOpenMenu && (
            <IconButton
              size="small"
              onClick={(e) => onOpenMenu(e, design._id)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {design.description && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {design.description}
          </Typography>
        )}

        {design.status && (
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={getStatusIcon(design.status)}
              label={design.status.charAt(0).toUpperCase() + design.status.slice(1)}
              color={getStatusColor(design.status)}
              size="small"
            />
          </Box>
        )}

        {design.printVolume && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Volume:</strong> {design.printVolume.toLocaleString()} mm³
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {design.stlUrl && <Chip label="STL" size="small" variant="outlined" color="primary" />}
          {design.glbUrl && <Chip label="GLB" size="small" variant="outlined" color="secondary" />}
        </Box>

        <Typography variant="caption" color="textSecondary">
          Created: {new Date(design.createdAt).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
}