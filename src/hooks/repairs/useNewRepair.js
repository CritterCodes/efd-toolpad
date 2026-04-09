
import { useState } from 'react';
import { useRepairPhotos } from './useRepairPhotos';
import { useRepairPricing } from './useRepairPricing';
import { useRepairValidation } from './useRepairValidation';

const INITIAL_REPAIR_FORM = {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
};

export const useNewRepair = () => {
        const [formData, setFormData] = useState(INITIAL_REPAIR_FORM);
    const photos = useRepairPhotos();
    const pricing = useRepairPricing();
    const validation = useRepairValidation();

        const submitForm = async () => ({ success: false, message: 'Submit not implemented' });

        return { formData, setFormData, submitForm, ...photos, ...pricing, ...validation };
}
