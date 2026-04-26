import React from 'react';
import Image from 'next/image';
import {
  Box,
  Grid,
  IconButton,
  Typography
} from '@mui/material';
import {
  Image as ImageIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { handleDownload, getImageName } from './imageUtils';

export function CustomTicketImagesGrid({ images, onOpenImageModal }) {
  if (!images || images.length === 0) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: 4, 
        color: 'text.secondary',
        bgcolor: 'action.hover',
        borderRadius: 1
      }}>
        <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">
          No images in the moodboard yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {images.map((image, index) => {
        const imageUrl = typeof image === 'string' ? image : image?.url;
        const imageName = getImageName(image, index);

        return (
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
                  '& .image-overlay': { opacity: 1 }
                }
              }}
              onClick={() => onOpenImageModal?.(image, index)}
            >
              {/* Image Display */}
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`Ticket image ${index + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                />
              ) : (
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
                  handleDownload(imageUrl, imageName);
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
              {imageName}
            </Typography>
          </Grid>
        );
      })}
    </Grid>
  );
}