/**
 * Client-side RepairsService for Quality Control operations
 * Wraps API calls to the repairs endpoints
 */

export class RepairsService {
    /**
     * Update repair status
     * @param {string} repairId - The repair ID to update
     * @param {string} status - New status for the repair
     * @returns {Promise<Object>} Updated repair object
     */
    static async updateRepairStatus(repairId, status) {
        try {
            const response = await fetch(`/api/repairs/${repairId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error(`Failed to update repair status: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating repair status:', error);
            throw error;
        }
    }

    /**
     * Complete quality control with notes and photos
     * @param {string} repairId - The repair ID
     * @param {Object} qcData - Quality control data including decision, notes, photos
     * @returns {Promise<Object>} Updated repair object
     */
    static async completeQualityControl(repairId, qcData) {
        try {
            const formData = new FormData();
            formData.append('repairID', repairId);
            
            // Add basic QC data
            formData.append('status', qcData.decision === 'APPROVE' ? 'ready_for_pickup' : 'ready_for_work');
            formData.append('notes', qcData.notes || '');
            
            // Add quality control specific data
            const qcDetails = {
                decision: qcData.decision,
                inspector: qcData.inspector,
                qualityRating: qcData.qualityRating,
                issues: qcData.issues || [],
                completedAt: new Date().toISOString(),
                ...qcData.additionalData
            };
            
            formData.append('checklist', JSON.stringify(qcDetails));
            
            // Add photos if provided
            if (qcData.photos && qcData.photos.length > 0) {
                qcData.photos.forEach((photo, index) => {
                    if (photo.file) {
                        formData.append(`qcPicture`, photo.file);
                    }
                });
            }

            const response = await fetch('/api/repairs/quality-control', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to complete quality control: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error completing quality control:', error);
            throw error;
        }
    }

    /**
     * Upload QC photos
     * @param {string} repairId - The repair ID
     * @param {Array} photos - Array of photo files
     * @returns {Promise<Array>} Array of uploaded photo URLs
     */
    static async uploadQcPhotos(repairId, photos) {
        try {
            const formData = new FormData();
            formData.append('repairID', repairId);
            
            photos.forEach((photo, index) => {
                if (photo.file) {
                    formData.append(`photo_${index}`, photo.file);
                }
            });

            const response = await fetch('/api/repairs/quality-control/photos', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to upload photos: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading QC photos:', error);
            throw error;
        }
    }
}

export default RepairsService;
