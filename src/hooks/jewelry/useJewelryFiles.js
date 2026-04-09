export const useJewelryFiles = ({ formData, setFormData, isNew, setSaving, jewelryId }) => {
    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        const validImages = files.filter(file => file.type.startsWith('image/'));
        if (validImages.length > 0) {
            setFormData(prev => ({ ...prev, images: [...prev.images, ...validImages] }));
        }
    };

    const handleRemoveNewImage = (index) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleRemoveExistingImage = (index) => {
        setFormData(prev => ({ ...prev, existingImages: prev.existingImages.filter((_, i) => i !== index) }));
    };

    const handleFileUpload = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        if (isNew) {
            alert("Please save the jewelry item first before uploading 3D files.");
            return;
        }

        try {
            setSaving(true);
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('type', type);

            const res = await fetch(`/api/products/jewelry/${jewelryId}/files`, {
                method: 'POST',
                body: uploadFormData
            });

            if (!res.ok) throw new Error('Upload failed');
            
            const result = await res.json();
            setFormData(prev => ({ ...prev, [`${type}File`]: result.fileUrl }));
        } catch (e) {
            console.error(e);
            alert(`Failed to upload ${type.toUpperCase()} file`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFile = async (type) => {
        if (!confirm(`Delete ${type.toUpperCase()} file?`)) return;
        try {
            setSaving(true);
            setFormData(prev => ({ ...prev, [`${type}File`]: null }));
        } finally {
            setSaving(false);
        }
    };

    return {
        handleImageUpload,
        handleRemoveNewImage,
        handleRemoveExistingImage,
        handleFileUpload,
        handleDeleteFile
    };
};
