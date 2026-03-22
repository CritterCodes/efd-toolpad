'use client';

import React from 'react';
import { Box } from '@mui/material';
import { useMessageInterface } from '@/hooks/communications/useMessageInterface';
import MessageList from './messages/MessageList';
import MessageInput from './messages/MessageInput';

const MessageInterface = ({ 
  ticket, 
  onAddCommunication, 
  isSubmitting = false 
}) => {
  const { state, refs, actions } = useMessageInterface({ ticket, onAddCommunication });

  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <MessageList 
        allMessages={state.allMessages}
        messagesEndRef={refs.messagesEndRef}
      />
      <MessageInput 
        newMessage={state.newMessage}
        setNewMessage={actions.setNewMessage}
        attachedImages={state.attachedImages}
        removeImage={actions.removeImage}
        attachedLink={state.attachedLink}
        setAttachedLink={actions.setAttachedLink}
        openLinkDialog={state.openLinkDialog}
        setOpenLinkDialog={actions.setOpenLinkDialog}
        linkInput={state.linkInput}
        setLinkInput={actions.setLinkInput}
        linkError={state.linkError}
        setLinkError={actions.setLinkError}
        handleAddLink={actions.handleAddLink}
        handleImageSelect={actions.handleImageSelect}
        fileInputRef={refs.fileInputRef}
        handleSendMessage={actions.handleSendMessage}
        isSubmitting={isSubmitting}
      />
    </Box>
  );
};

export default MessageInterface;