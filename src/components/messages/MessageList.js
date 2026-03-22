'use client';

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Chat as ChatIcon, Link as LinkIcon } from '@mui/icons-material';

const MessageList = ({ allMessages, messagesEndRef }) => {
  const theme = useTheme();

  const getMessageIcon = () => <ChatIcon fontSize="inherit" />;
  const getMessageTypeColor = () => '#9c27b0';

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
        borderRadius: 2,
        p: 2,
        mb: 2,
        overflow: 'auto',
        border: `1px solid ${theme.palette.divider}`,
        '&::-webkit-scrollbar': { width: '6px' },
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
                      sx={{ fontWeight: 600, opacity: 0.8, fontSize: '0.7rem' }}
                    >
                      {message.sender}
                    </Typography>
                    <Box sx={{ fontSize: '0.7rem', opacity: 0.7, color: getMessageTypeColor() }}>
                      {getMessageIcon()}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>

                {/* Message Content */}
                <Typography 
                  variant="body2" 
                  sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.4, fontSize: '0.875rem' }}
                >
                  {message.message || message.content}
                </Typography>

                {/* Display attached images */}
                {message.images && message.images.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {message.images.map((img, idx) => {
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
                    mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5
                  }}>
                    <LinkIcon sx={{ fontSize: '0.875rem', opacity: 0.7 }} />
                    <Typography
                      component="a"
                      href={message.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      sx={{
                        textDecoration: 'underline', cursor: 'pointer', opacity: 0.9, '&:hover': { opacity: 1 }
                      }}
                    >
                      {message.link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}...
                    </Typography>
                  </Box>
                )}

                {/* Message Footer */}
                <Typography 
                  variant="caption" 
                  sx={{ opacity: 0.6, fontSize: '0.65rem', display: 'block', mt: 0.5 }}
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
  );
};

export default MessageList;