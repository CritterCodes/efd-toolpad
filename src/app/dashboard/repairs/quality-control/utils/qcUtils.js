import RepairsService from './RepairsService';
import { QC_PHOTO_CONFIG } from '../constants';

export const completeQualityControl = async (repairID, qcData) => {
    try {
        const { decision, inspector, notes, issueCategory, severityLevel, photos, qcCompletedAt, qcCompletedBy } = qcData;
        
        // Determine the new status based on QC decision
        const newStatus = decision === 'APPROVE' ? 'READY FOR PICK-UP' : 'READY FOR WORK';
        
        // Create QC metadata
        const qcMetadata = {
            qcDecision: decision,
            qcInspector: inspector,
            qcNotes: notes,
            qcCompletedAt,
            qcCompletedBy,
            qcPhotos: photos,
            ...(decision === 'REJECT' && {
                rejectionReason: issueCategory,
                severityLevel,
                rejectedAt: qcCompletedAt,
                rejectedBy: inspector
            }),
            ...(decision === 'APPROVE' && {
                approvedAt: qcCompletedAt,
                approvedBy: inspector
            })
        };

        // Update repair status with QC metadata
        const result = await RepairsService.moveRepairStatus([repairID], newStatus, qcMetadata);
        
        if (result.success) {
            return {
                success: true,
                newStatus,
                message: decision === 'APPROVE' 
                    ? 'Quality control approved - repair moved to pickup queue'
                    : 'Quality issues found - repair returned to work queue'
            };
        } else {
            throw new Error(result.error || 'Failed to complete quality control');
        }
    } catch (error) {
        console.error('Error completing quality control:', error);
        return {
            success: false,
            error: error.message || 'Failed to complete quality control'
        };
    }
};

export const uploadQcPhoto = async (file, repairID, photoType = 'After QC') => {
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('repairID', repairID);
        formData.append('photoType', photoType);
        formData.append('uploadType', 'qc-photo');

        // Upload to your file storage endpoint
        const response = await fetch('/api/uploads', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        return {
            success: true,
            url: result.url,
            filename: result.filename
        };
    } catch (error) {
        console.error('Error uploading QC photo:', error);
        return {
            success: false,
            error: error.message || 'Failed to upload photo'
        };
    }
};

export const getQcHistory = (repair) => {
    const qcHistory = [];

    // Extract QC history from repair object
    if (repair.qcHistory && Array.isArray(repair.qcHistory)) {
        return repair.qcHistory;
    }

    // Legacy support - check for single QC entry
    if (repair.qcDecision) {
        qcHistory.push({
            decision: repair.qcDecision,
            inspector: repair.qcInspector || 'Unknown',
            notes: repair.qcNotes || '',
            completedAt: repair.qcCompletedAt || repair.updatedAt,
            photos: repair.qcPhotos || []
        });
    }

    return qcHistory;
};

export const formatQcDecision = (decision) => {
    switch (decision) {
        case 'APPROVE':
            return { text: 'Approved', color: 'success' };
        case 'REJECT':
            return { text: 'Rejected', color: 'error' };
        default:
            return { text: 'Unknown', color: 'default' };
    }
};

export const validatePhotoFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size too large. Maximum 10MB allowed.' };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please use JPEG, PNG, or WebP.' };
    }

    return { valid: true };
};

export const createPhotoPreview = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
