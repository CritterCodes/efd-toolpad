'use client';

import React from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  IconButton, 
  Typography, 
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Send as SendIcon, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Close as CloseIcon 
} from '@mui/icons-material';

const MessageInput = ({
  newMessage,
  setNewMessage,
  attachedImages,
  removeImage,
  attachedLink,
  setAttachedLink,
  openLinkDialog,
  setOpenLinkDialog,
  linkInput,
  setLinkInput,
  linkError,
  setLinkError,
  handleAddLink,
  handleImageSelect,
  fileInputRef,
  handleSendMessage,
  isSubmitting
}) => {
  const theme = useTheme();

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() || attachedImages.length > 0 || attachedLink) {
        handleSendMessage();
      }
    }
  };

  const isSendDisabled = (!newMessage.trim() && attachedImages.length === 0 && !attachedLink) || isSubmitting;

  return (
    <>
      <Box
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
          borderRadius: 2,
          p: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Attached images preview */}
        {attachedImages.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {attachedImages.map((img, idx) => (
              <Box key={idx} sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    width: 80, height: 80, borderRadius: 1, overflow: 'hidden',
                    border: `2px solid ${theme.palette.primary.main}`,
                    backgroundImage: `url(${img.data})`, backgroundSize: 'cover', backgroundPosition: 'center'
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeImage(idx)}
                  sx={{
                    position: 'absolute', top: -8, right: -8,
                    bgcolor: 'error.main', color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                    width: 24, height: 24
                  }}
                >
                  <CloseIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Attached link preview */}
        {attachedLink && (
          <Box sx={{ 
            mb: 2, p: 1.5, bgcolor: 'primary.light', borderRadius: 1, 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <LinkIcon />
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {attachedLink.slice(0, 60)}...
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setAttachedLink('')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Input controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 1 }}>
          <TextField
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            multiline
            maxRows={4}
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: theme.palette.mode === 'dark' ? 'grey.700' : 'background.paper',
                color: 'text.primary',
                '& fieldset': { borderColor: theme.palette.divider },
                '&:hover fieldset': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'text.secondary' },
            }}
          />
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <IconButton onClick={() => fileInputRef.current?.click()} size="small" title="Attach images" sx={{ height: 40, width: 40 }}>
            <ImageIcon />
          </IconButton>

          <IconButton onClick={() => setOpenLinkDialog(true)} size="small" title="Attach link" sx={{ height: 40, width: 40 }}>
            <LinkIcon />
          </IconButton>
          
          <Button
            onClick={handleSendMessage}
            disabled={isSendDisabled}
            variant="contained"
            size="small"
            sx={{ minWidth: 'auto', height: 40, px: 2 }}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16, height: 16, border: '2px solid currentColor',
                    borderTop: '2px solid transparent', borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              </Box>
            ) : (
              <SendIcon fontSize="small" />
            )}
          </Button>
        </Box>
        
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block' }}>
          Press Enter to send, Shift+Enter for new line. Attach images and links above.
        </Typography>
      </Box>

      {/* Link Dialog */}
      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Attach Link</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="URL"
            placeholder="https://example.com"
            value={linkInput}
            onChange={(e) => {
              setLinkInput(e.target.value);
              setLinkError('');
            }}
            error={!!linkError}
            helperText={linkError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenLinkDialog(false);
            setLinkInput('');
            setLinkError('');
          }}>
            Cancel
          </Button>
          <Button onClick={handleAddLink} variant="contained">
            Attach Link
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MessageInput;