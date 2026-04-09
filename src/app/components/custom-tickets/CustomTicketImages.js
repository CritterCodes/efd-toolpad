/**
 * Custom Ticket Images Component
 * Displays ticket images in a gallery with modal preview - Constitutional Architecture
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { CustomTicketImagesGrid } from './parts/CustomTicketImagesGrid.js';
import { CustomTicketImageModal } from './parts/CustomTicketImageModal.js';

export function CustomTicketImages({ 
  ticket,
  images = [],
  imageModal,
  onOpenImageModal,
  onCloseImageModal
}) {
  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Moodboard ({images.length})
            </Typography>
            
            {images.length > 0 && (
              <Chip 
                label={`${images.length} files`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            )}
          </Box>

          <CustomTicketImagesGrid 
            images={images} 
            onOpenImageModal={onOpenImageModal} 
          />
        </CardContent>
      </Card>

      <CustomTicketImageModal 
        imageModal={imageModal} 
        onClose={onCloseImageModal} 
      />
    </>
  );
}

export default CustomTicketImages;
