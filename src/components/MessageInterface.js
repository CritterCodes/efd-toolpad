'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  IconButton,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardMedia,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Chat as ChatIcon,
  AttachFile as AttachFileIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const MessageInterface = ({ 
  ticket, 
  onAddCommunication, 
  isSubmitting = false 
}) => {
  const { data: session } = useSession();
  const theme = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedLink, setAttachedLink] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.communications]);

  // Validate and format URL
  const validateUrl = (url) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.toString();
    } catch {
      return null;
    }
  };

  // Handle image file selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedImages(prev => [...prev, {
            name: file.name,
            data: event.target.result,
            type: file.type,
            size: file.size
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle adding link
  const handleAddLink = () => {
    const trimmedLink = linkInput.trim();
    if (!trimmedLink) {
      setLinkError('Please enter a URL');
      return;
    }

    const validatedUrl = validateUrl(trimmedLink);
    if (!validatedUrl) {
      setLinkError('Invalid URL format');
      return;
    }

    setAttachedLink(validatedUrl);
    setLinkInput('');
    setLinkError('');
    setOpenLinkDialog(false);
  };

  // Remove attached image
  const removeImage = (index) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getFirstName = (name) => name ? name.split(' ')[0] : '';
  const adminName = getFirstName(session?.user?.name) || 'Admin';
  const clientName = getFirstName(ticket?.customerName) || 'Customer';

  // Combine and sort all messages
  const allMessages = [
    ...(ticket?.communications?.map(comm => ({
      ...comm,
      type: 'admin',
      sender: comm.fromName || (comm.from === 'artisan' ? 'Artisan' : 'Admin'),
      timestamp: comm.date || comm.timestamp,
      messageType: 'chat'
    })) || []),
    ...(ticket?.clientFeedback?.map(feedback => ({
      ...feedback,
      type: 'client',
      sender: clientName,
      timestamp: feedback.timestamp || feedback.date,
      messageType: 'chat'
    })) || [])
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachedImages.length === 0 && !attachedLink) return;

    console.log('📤 MessageInterface.handleSendMessage - Sending:', {
      messageLength: newMessage.length,
      imagesCount: attachedImages.length,
      firstImageName: attachedImages[0]?.name,
      hasLink: !!attachedLink,
      attachedImages: attachedImages.map(img => ({ name: img.name, type: img.type, hasData: !!img.data }))
    });

    const communicationData = {
      message: newMessage,
      type: 'chat',
      from: session?.user?.role === 'artisan' ? 'artisan' : 'admin',
      fromName: adminName,
      to: 'client',
      date: new Date().toISOString(),
      images: attachedImages.length > 0 ? attachedImages : undefined,
      link: attachedLink || undefined
    };

    await onAddCommunication(communicationData);
    setNewMessage('');
    setAttachedImages([]);
    setAttachedLink('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        handleSendMessage();
      }
    }
  };

  const getMessageIcon = () => {
    return <ChatIcon fontSize="inherit" />;
  };

  const getMessageTypeColor = () => {
    return '#9c27b0'; // Chat message color
  };

  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Messages Container */}
      <Box
        sx={{
          flex: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          borderRadius: 2,
          p: 2,
          mb: 2,
          overflow: 'auto',
          border: `1px solid ${theme.palette.divider}`,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            borderRadius: '3px',
          },
        }}
      >
        {allMessages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h4" sx={{ mb: 1 }}>💬</Typography>
            <Typography variant="body1" sx={{ mb: 1, color: 'text.secondary' }}>No messages yet</Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allMessages.map((message, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.type === 'admin' ? 'flex-end' : 'flex-start'
                }}
              >
                <Box
                  sx={{
                    maxWidth: '75%',
                    bgcolor: message.type === 'admin' 
                      ? 'primary.main' 
                      : theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                    color: message.type === 'admin' 
                      ? 'primary.contrastText'
                      : 'text.primary',
                    borderRadius: '18px',
                    px: 2,
                    py: 1.5,
                    ml: message.type === 'client' ? 0 : 2,
                    mr: message.type === 'admin' ? 0 : 2,
                  }}
                >
                  {/* Message Header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 0.5 
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 600, 
                          opacity: 0.8,
                          fontSize: '0.7rem'
                        }}
                      >
                        {message.sender}
                      </Typography>
                      <Box 
                        sx={{ 
                          fontSize: '0.7rem',
                          opacity: 0.7,
                          color: getMessageTypeColor()
                        }}
                      >
                        {getMessageIcon()}
                      </Box>
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.6, 
                        fontSize: '0.65rem' 
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                  </Box>

                  {/* Message Content */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.4,
                      fontSize: '0.875rem'
                    }}
                  >
                    {message.message || message.content}
                  </Typography>

                  {/* Display attached images */}
                  {message.images && message.images.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {message.images.map((img, idx) => {
                        // Handle both formats: { url, name, type } from S3 and { data, name, type } from preview
                        const imgSrc = img.url || img.data;
                        const imgName = img.name || `Image ${idx + 1}`;
                        
                        return (
                          <Box key={idx} sx={{ borderRadius: 1, overflow: 'hidden', maxWidth: '100%' }}>
                            <img 
                              src={imgSrc} 
                              alt={imgName}
                              style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', borderRadius: '8px' }}
                            />
                            {imgName && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                                {imgName}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {/* Display attached link */}
                  {message.link && (
                    <Box sx={{ 
                      mt: 1, 
                      p: 1,
                      bgcolor: 'rgba(0,0,0,0.2)',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                      <LinkIcon sx={{ fontSize: '0.875rem', opacity: 0.7 }} />
                      <Typography
                        component="a"
                        href={message.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          opacity: 0.9,
                          '&:hover': {
                            opacity: 1
                          }
                        }}
                      >
                        {message.link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}...
                      </Typography>
                    </Box>
                  )}

                  {/* Message Footer */}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.6, 
                      fontSize: '0.65rem',
                      display: 'block',
                      mt: 0.5
                    }}
                  >
                    {new Date(message.timestamp).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Message Input */}
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
                    width: 80,
                    height: 80,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: `2px solid ${theme.palette.primary.main}`,
                    backgroundImage: `url(${img.data})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeImage(idx)}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                    width: 24,
                    height: 24
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
            mb: 2, 
            p: 1.5,
            bgcolor: 'primary.light',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <LinkIcon />
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {attachedLink.slice(0, 60)}...
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setAttachedLink('')}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Input controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 1 }}>
          <TextField
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newMessage.trim() || attachedImages.length > 0 || attachedLink) {
                  handleSendMessage();
                }
              }
            }}
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
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.text.secondary,
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'text.secondary',
              },
            }}
          />
          
          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            size="small"
            title="Attach images"
            sx={{ height: 40, width: 40 }}
          >
            <ImageIcon />
          </IconButton>

          {/* Link button */}
          <IconButton
            onClick={() => setOpenLinkDialog(true)}
            size="small"
            title="Attach link"
            sx={{ height: 40, width: 40 }}
          >
            <LinkIcon />
          </IconButton>
          
          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && attachedImages.length === 0 && !attachedLink) || isSubmitting}
            variant="contained"
            size="small"
            sx={{ 
              minWidth: 'auto',
              height: 40,
              px: 2
            }}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    border: '2px solid currentColor',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </Box>
            ) : (
              <SendIcon fontSize="small" />
            )}
          </Button>
        </Box>
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary', 
            fontSize: '0.65rem',
            display: 'block'
          }}
        >
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
    </Box>
  );
};

export default MessageInterface;