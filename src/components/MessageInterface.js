'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  IconButton,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Chat as ChatIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

const MessageInterface = ({ 
  ticket, 
  onAddCommunication, 
  isSubmitting = false 
}) => {
  const theme = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.communications]);

  // Combine and sort all messages
  const allMessages = [
    ...(ticket?.communications?.map(comm => ({
      ...comm,
      type: 'admin',
      sender: comm.from || 'Admin',
      timestamp: comm.date || comm.timestamp,
      messageType: 'chat'
    })) || []),
    ...(ticket?.clientFeedback?.map(feedback => ({
      ...feedback,
      type: 'client',
      sender: 'Customer',
      timestamp: feedback.timestamp || feedback.date,
      messageType: 'chat'
    })) || [])
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const communicationData = {
      message: newMessage,
      type: 'chat',
      from: 'admin',
      to: 'client',
      date: new Date().toISOString()
    };

    await onAddCommunication(communicationData);
    setNewMessage('');
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
              Start the conversation with your customer below
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allMessages.map((message, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.type === 'client' ? 'flex-end' : 'flex-start'
                }}
              >
                <Box
                  sx={{
                    maxWidth: '75%',
                    bgcolor: message.type === 'client' 
                      ? 'primary.main' 
                      : theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                    color: message.type === 'client' 
                      ? 'primary.contrastText'
                      : 'text.primary',
                    borderRadius: '18px',
                    px: 2,
                    py: 1.5,
                    ml: message.type === 'admin' ? 0 : 2,
                    mr: message.type === 'client' ? 0 : 2,
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
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
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSubmitting}
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
            mt: 1,
            display: 'block'
          }}
        >
          Press Enter to prepare message, Shift+Enter for new line
        </Typography>
      </Box>

    </Box>
  );
};

export default MessageInterface;