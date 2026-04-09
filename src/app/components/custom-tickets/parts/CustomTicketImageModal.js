import React from 'react';
import Image from 'next/image';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography
} from '@mui/material';
import {
  Image as ImageIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { handleDownload, getImageName } from './imageUtils';

export function CustomTicketImageModal({ imageModal, onClose }) {
  if (!imageModal?.open) return null;

  const currentImage = imageModal?.image;
  const currentIndex = imageModal?.index || 0;
  
  const imageUrl = typeof currentImage === 'string' ? currentImage : currentImage?.url;
  const imageName = getImageName(currentImage, currentIndex);

  return (
    <Dialog 
      open={imageModal.open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'black' }
      }}
    >
      <DialogTitle sx={{ color: 'white', pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Image Preview</Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2 }}>
        {currentImage && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="grey.300" gutterBottom>
              {imageName}
            </Typography>
            
            {imageUrl ? (
              <Box sx={{ position: 'relative', height: 500 }}>
                <Image
                  src={imageUrl}
                  alt="Preview"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </Box>
            ) : (
              <Box sx={{ 
                height: 400, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.900',
                borderRadius: 1
              }}>
                <ImageIcon sx={{ fontSize: 64, color: 'grey.600' }} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button 
          onClick={() => handleDownload(imageUrl, imageName)}
          startIcon={<DownloadIcon />}
          sx={{ color: 'white' }}
        >
          Download
        </Button>
        <Button onClick={onClose} sx={{ color: 'white' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}