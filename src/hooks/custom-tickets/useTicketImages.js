/**
 * Custom Ticket Images Management Hook
 * Handles image gallery state and operations
 */

import { useState } from 'react';

export function useTicketImages(ticket) {
  const [imageModal, setImageModal] = useState({ 
    open: false, 
    image: null, 
    index: 0 
  });

  const openImageModal = (image, index = 0) => {
    setImageModal({
      open: true,
      image,
      index
    });
  };

  const closeImageModal = () => {
    setImageModal({
      open: false,
      image: null,
      index: 0
    });
  };

  const nextImage = () => {
    const images = ticket?.images || [];
    if (images.length === 0) return;
    
    const nextIndex = (imageModal.index + 1) % images.length;
    setImageModal(prev => ({
      ...prev,
      image: images[nextIndex],
      index: nextIndex
    }));
  };

  const previousImage = () => {
    const images = ticket?.images || [];
    if (images.length === 0) return;
    
    const prevIndex = imageModal.index === 0 ? images.length - 1 : imageModal.index - 1;
    setImageModal(prev => ({
      ...prev,
      image: images[prevIndex],
      index: prevIndex
    }));
  };

  return {
    imageModal,
    openImageModal,
    closeImageModal,
    nextImage,
    previousImage,
    hasImages: ticket?.images && ticket.images.length > 0,
    imageCount: ticket?.images?.length || 0
  };
}

export default useTicketImages;