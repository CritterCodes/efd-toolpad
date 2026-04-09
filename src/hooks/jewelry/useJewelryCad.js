'use client';

import { useState } from 'react';

export const useJewelryCad = () => {
    const [cadDialogOpen, setCadDialogOpen] = useState(false);
    const [editingCadRequest, setEditingCadRequest] = useState(null);
    const [cadFormData, setCadFormData] = useState({
        mountingType: '',
        styleDescription: '',
        ringSize: '',
        specialRequests: '',
        assignedDesigner: ''
    });

    const handleOpenCadDialog = (request = null) => {
        if (request) {
            setEditingCadRequest(request);
            setCadFormData({
                mountingType: request.mountingDetails?.mountingType || '',
                styleDescription: request.mountingDetails?.styleDescription || '',
                ringSize: request.mountingDetails?.ringSize || '',
                specialRequests: request.mountingDetails?.specialRequests || '',
                assignedDesigner: request.assignedDesigner || ''
            });
        } else {
            setEditingCadRequest(null);
            setCadFormData({
                mountingType: '', styleDescription: '', ringSize: '',
                specialRequests: '', assignedDesigner: ''
            });
        }
        setCadDialogOpen(true);
    };

    const handleCloseCadDialog = () => {
        setCadDialogOpen(false);
        setEditingCadRequest(null);
    };

    return {
        cadDialogOpen,
        editingCadRequest,
        cadFormData,
        setCadFormData,
        handleOpenCadDialog,
        handleCloseCadDialog
    };
};
