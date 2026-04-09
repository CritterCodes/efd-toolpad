import { useCallback, useMemo, useState } from 'react';

const DEFAULT_FORM_DATA = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
};

export const useNewRepair = ({ onSubmit } = {}) => {
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [submitting, setSubmitting] = useState(false);

    const submitForm = useCallback(async () => {
        if (typeof onSubmit !== 'function') {
            return { success: true, data: formData };
        }

        try {
            setSubmitting(true);
            await onSubmit(formData);
            return { success: true, data: formData };
        } catch (error) {
            return { success: false, error };
        } finally {
            setSubmitting(false);
        }
    }, [formData, onSubmit]);

    const resetForm = useCallback(() => {
        setFormData(DEFAULT_FORM_DATA);
    }, []);

    return useMemo(() => ({
        formData,
        setFormData,
        submitForm,
        resetForm,
        submitting
    }), [formData, resetForm, submitForm, submitting]);
};
