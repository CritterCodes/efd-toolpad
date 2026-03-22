import { useState, useCallback } from 'react';

export function useGallery() {
    const [galleryItems, setGalleryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [availableTags, setAvailableTags] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);

    const loadGalleryItems = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/artisan/gallery');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setGalleryItems(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error loading gallery items:', error);
            setSaveStatus({ type: 'error', message: 'Failed to load gallery items' });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAvailableTags = useCallback(async () => {
        try {
            const response = await fetch('/api/artisan/gallery/tags');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAvailableTags(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }, []);

    const uploadImage = useCallback(async (uploadFile, tags) => {
        setUploading(true);
        setSaveStatus(null);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', uploadFile);
            uploadFormData.append('tags', JSON.stringify(tags));

            const response = await fetch('/api/artisan/gallery', {
                method: 'POST',
                body: uploadFormData
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Image uploaded successfully!' });
                loadGalleryItems();
                loadAvailableTags();
                return true;
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to upload image' });
                return false;
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setSaveStatus({ type: 'error', message: 'Failed to upload image. Please try again.' });
            return false;
        } finally {
            setUploading(false);
        }
    }, [loadGalleryItems, loadAvailableTags]);

    const updateImage = useCallback(async (id, tags) => {
        setUploading(true);
        setSaveStatus(null);
        try {
            const response = await fetch(`/api/artisan/gallery/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags })
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Image updated successfully!' });
                loadGalleryItems();
                loadAvailableTags();
                return true;
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to update image' });
                return false;
            }
        } catch (error) {
            console.error('Error updating image:', error);
            setSaveStatus({ type: 'error', message: 'Failed to update image. Please try again.' });
            return false;
        } finally {
            setUploading(false);
        }
    }, [loadGalleryItems, loadAvailableTags]);

    const deleteImage = useCallback(async (id) => {
        try {
            const response = await fetch(`/api/artisan/gallery/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Image deleted successfully!' });
                loadGalleryItems();
                return true;
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to delete image' });
                return false;
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            setSaveStatus({ type: 'error', message: 'Failed to delete image. Please try again.' });
            return false;
        }
    }, [loadGalleryItems]);

    return {
        galleryItems,
        loading,
        uploading,
        availableTags,
        saveStatus,
        setSaveStatus,
        loadGalleryItems,
        loadAvailableTags,
        uploadImage,
        updateImage,
        deleteImage
    };
}
