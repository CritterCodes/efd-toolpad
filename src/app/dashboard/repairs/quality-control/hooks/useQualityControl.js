import { useState, useEffect } from 'react';

export const useQualityControl = () => {
    const [qcDecision, setQcDecision] = useState('');
    const [inspector, setInspector] = useState('');
    const [qcNotes, setQcNotes] = useState('');
    const [issueCategory, setIssueCategory] = useState('');
    const [severityLevel, setSeverityLevel] = useState('low');
    const [photos, setPhotos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    
    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const closeSnackbar = () => {
        setSnackbarOpen(false);
    };

    const addPhoto = (photoData) => {
        setPhotos(prev => [...prev, {
            id: Date.now(),
            file: photoData.file,
            url: photoData.url,
            type: photoData.type || 'After QC',
            caption: photoData.caption || '',
            timestamp: new Date().toISOString()
        }]);
    };

    const removePhoto = (photoId) => {
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    };

    const updatePhotoCaption = (photoId, caption) => {
        setPhotos(prev => prev.map(photo => 
            photo.id === photoId ? { ...photo, caption } : photo
        ));
    };

    const validateQcForm = () => {
        const errors = {};

        // Inspector is required
        if (!inspector.trim()) {
            errors.inspector = 'Inspector is required';
        }

        // Decision is required
        if (!qcDecision) {
            errors.qcDecision = 'QC decision is required';
        }

        // If rejecting, additional fields are required
        if (qcDecision === 'REJECT') {
            if (!qcNotes.trim()) {
                errors.qcNotes = 'Notes are required when rejecting';
            }
            if (!issueCategory) {
                errors.issueCategory = 'Issue category is required when rejecting';
            }
        }

        // At least one photo is required
        if (photos.length === 0) {
            errors.photos = 'At least one photo is required for quality control';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetForm = () => {
        setQcDecision('');
        setInspector('');
        setQcNotes('');
        setIssueCategory('');
        setSeverityLevel('low');
        setPhotos([]);
        setValidationErrors({});
    };

    const getQcFormData = () => ({
        decision: qcDecision,
        inspector,
        notes: qcNotes,
        issueCategory: qcDecision === 'REJECT' ? issueCategory : null,
        severityLevel: qcDecision === 'REJECT' ? severityLevel : null,
        photos: photos.map(photo => ({
            url: photo.url,
            type: photo.type,
            caption: photo.caption,
            timestamp: photo.timestamp
        })),
        qcCompletedAt: new Date().toISOString(),
        qcCompletedBy: inspector
    });

    return {
        // Form state
        qcDecision,
        setQcDecision,
        inspector,
        setInspector,
        qcNotes,
        setQcNotes,
        issueCategory,
        setIssueCategory,
        severityLevel,
        setSeverityLevel,
        photos,
        setPhotos,
        isSubmitting,
        setIsSubmitting,
        validationErrors,

        // Snackbar
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        showSnackbar,
        closeSnackbar,

        // Photo management
        addPhoto,
        removePhoto,
        updatePhotoCaption,

        // Form management
        validateQcForm,
        resetForm,
        getQcFormData
    };
};
