import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Publish as PublishIcon, Visibility as VisibilityIcon } from '@mui/icons-material';

export function QuoteHeader({ 
  editMode, 
  setEditMode, 
  isPublished, 
  saving, 
  analyticsTotal, 
  handleCancel, 
  handleSave, 
  handlePublishQuote, 
  handleUnpublishQuote 
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">Quote Builder</Typography>
        {isPublished && (
          <Chip 
            icon={<VisibilityIcon />} 
            label="Published to Client" 
            color="success" 
            size="small" 
          />
        )}
      </Box>
      {!editMode ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditMode(true)}>
            Edit Quote
          </Button>
          {isPublished ? (
            <Button variant="outlined" color="warning" startIcon={<VisibilityIcon />} onClick={handleUnpublishQuote} disabled={saving}>
              Unpublish Quote
            </Button>
          ) : (
            <Button variant="contained" color="success" startIcon={<PublishIcon />} onClick={handlePublishQuote} disabled={saving || analyticsTotal <= 0}>
              Publish Quote
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
            Save Quote
          </Button>
          {!isPublished && (
            <Button variant="contained" color="success" startIcon={<PublishIcon />} onClick={handlePublishQuote} disabled={saving || analyticsTotal <= 0}>
              Save & Publish
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

export default QuoteHeader;