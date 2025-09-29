/**
 * Custom Ticket Images Component
 * Displays ticket images in a gallery with modal preview - Constitutional Architecture
 */

import React from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip
} from '@mui/material';
import {
  Image as ImageIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export function CustomTicketImages({ 
  ticket,
  images = [],
  imageModal,
  onOpenImageModal,
  onCloseImageModal
}) {
  const handleImageClick = (image, index) => {
    if (onOpenImageModal) {
      onOpenImageModal(image, index);
    }
  };

  const handleDownload = async (imageUrl, imageName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = imageName || 'ticket-image.jpg';
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const getImageName = (imageUrl, index) => {
    if (typeof imageUrl === 'string') {
      return imageUrl.split('/').pop() || `image-${index + 1}`;
    }
    return `attachment-${index + 1}`;
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Images ({images.length})
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

          {images.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4, 
              color: 'text.secondary',
              bgcolor: 'grey.50',
              borderRadius: 1
            }}>
              <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">
                No images attached to this ticket.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {images.map((image, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Box
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover': {
                        '& .image-overlay': {
                          opacity: 1
                        }
                      }
                    }}
                    onClick={() => handleImageClick(image, index)}
                  >
                    {/* Image Display */}
                    {typeof image === 'string' ? (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.200'
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                      </Box>
                    ) : (
                      <Image
                        src={URL.createObjectURL(image)}
                        alt={`Ticket image ${index + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      />
                    )}

                    {/* Hover Overlay */}
                    <Box
                      className="image-overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <IconButton sx={{ color: 'white' }}>
                        <VisibilityIcon />
                      </IconButton>
                    </Box>

                    {/* Download Button */}
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 1)'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image, getImageName(image, index));
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Image Name */}
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block', 
                      mt: 0.5, 
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {getImageName(image, index)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      <Dialog 
        open={imageModal?.open || false} 
        onClose={onCloseImageModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'black' }
        }}
      >
        <DialogTitle sx={{ color: 'white', pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Image Preview
            </Typography>
            <IconButton onClick={onCloseImageModal} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 2 }}>
          {imageModal?.image && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="grey.300" gutterBottom>
                {getImageName(imageModal.image, imageModal.index || 0)}
              </Typography>
              
              {typeof imageModal.image === 'string' ? (
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
              ) : (
                <Box sx={{ position: 'relative', height: 500 }}>
                  <Image
                    src={URL.createObjectURL(imageModal.image)}
                    alt="Preview"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button 
            onClick={() => handleDownload(imageModal?.image, getImageName(imageModal?.image, imageModal?.index || 0))}
            startIcon={<DownloadIcon />}
            sx={{ color: 'white' }}
          >
            Download
          </Button>
          <Button onClick={onCloseImageModal} sx={{ color: 'white' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CustomTicketImages;