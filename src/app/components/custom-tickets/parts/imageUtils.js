export const handleDownload = async (imageUrl, imageName) => {
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

export const getImageName = (imageUrl, index) => {
  if (typeof imageUrl === 'string') {
    return imageUrl.split('/').pop() || `image-${index + 1}`;
  }
  if (imageUrl?.name) {
    return imageUrl.name;
  }
  if (imageUrl?.url) {
    return imageUrl.url.split('/').pop() || `image-${index + 1}`;
  }
  return `attachment-${index + 1}`;
};
