'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export const useMessageInterface = ({ ticket, onAddCommunication }) => {
  const { data: session } = useSession();
  const [newMessage, setNewMessage] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedLink, setAttachedLink] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.communications, scrollToBottom]);

  const validateUrl = (url) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.toString();
    } catch {
      return null;
    }
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const removeImage = (index) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getFirstName = (name) => name ? name.split(' ')[0] : '';
  const adminName = getFirstName(session?.user?.name) || 'Admin';
  const clientName = getFirstName(ticket?.customerName) || 'Customer';

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

    if (onAddCommunication) {
      await onAddCommunication(communicationData);
    }
    
    setNewMessage('');
    setAttachedImages([]);
    setAttachedLink('');
  };

  return {
    state: {
      newMessage,
      attachedImages,
      attachedLink,
      linkInput,
      linkError,
      openLinkDialog,
      allMessages,
      session
    },
    refs: {
      fileInputRef,
      messagesEndRef
    },
    actions: {
      setNewMessage,
      setLinkInput,
      setLinkError,
      setOpenLinkDialog,
      handleImageSelect,
      handleAddLink,
      removeImage,
      setAttachedLink,
      handleSendMessage
    }
  };
};