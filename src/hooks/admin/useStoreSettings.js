import { useState, useEffect } from 'react';
import { useAdminSettings } from '@/context/AdminSettingsContext';

export const useStoreSettings = () => {
    const { 
        adminSettings, 
        loading: contextLoading, 
        error: contextError, 
        updateAdminSettings, 
        refreshSettings,
        getTotalEffectiveWage 
    } = useAdminSettings();
    
    const [localSettings, setLocalSettings] = useState({
        wage: 30.00,
        materialMarkup: 1.5,
        wholesaleMarkup: 1.5,
        minimumTaskRetailPrice: 0,
        minimumTaskWholesalePrice: 0,
        administrativeFee: 0.15,
        businessFee: 0.25,
        consumablesFee: 0.08,
        rushMultiplier: 1.5,
        deliveryFee: 25.00,
        taxRate: 0.0875
    });
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [showSecurityDialog, setShowSecurityDialog] = useState(false);
    const [securityCodeInput, setSecurityCodeInput] = useState('');
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [generatingPin, setGeneratingPin] = useState(false);
    const [generatedPin, setGeneratedPin] = useState(null);
    const [showPinDialog, setShowPinDialog] = useState(false);

    useEffect(() => {
        if (adminSettings) {
            setLocalSettings({
                wage: adminSettings.wage || 30.00,
                materialMarkup: adminSettings.materialMarkup || 1.5,
                wholesaleMarkup: adminSettings.wholesaleMarkup || 1.5,
                minimumTaskRetailPrice: adminSettings.minimumTaskRetailPrice ?? 0,
                minimumTaskWholesalePrice: adminSettings.minimumTaskWholesalePrice ?? 0,
                administrativeFee: adminSettings.administrativeFee || 0.15,
                businessFee: adminSettings.businessFee || 0.25,
                consumablesFee: adminSettings.consumablesFee || 0.08,
                rushMultiplier: adminSettings.rushMultiplier || 1.5,
                deliveryFee: adminSettings.deliveryFee || 25.00,
                taxRate: adminSettings.taxRate || 0.0875
            });
        }
    }, [adminSettings]);

    useEffect(() => {
        if (!adminSettings) return;
        
        const changed = Object.keys(localSettings).some(key => 
            parseFloat(localSettings[key]) !== parseFloat(adminSettings[key])
        );
        setHasChanges(changed);
    }, [localSettings, adminSettings]);

    const handleSettingChange = (field, value) => {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 0) {
            if (field === 'administrativeFee' || field === 'businessFee' || field === 'consumablesFee' || field === 'taxRate') {
                setLocalSettings(prev => ({
                    ...prev,
                    [field]: numericValue / 100
                }));
            } else {
                setLocalSettings(prev => ({
                    ...prev,
                    [field]: numericValue
                }));
            }
        }
    };

    const handleSaveClick = () => {
        setShowSecurityDialog(true);
        setSecurityCodeInput('');
        setError(null);
    };

    const handleSaveSettings = async () => {
        if (!securityCodeInput || securityCodeInput.length !== 4) {
            setError('Please enter a 4-digit security code');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const updateData = {
                ...localSettings,
                securityCode: securityCodeInput
            };

            const result = await updateAdminSettings(updateData);

            if (result.success) {
                console.log('🔄 Admin settings saved, triggering cascading updates...');
                
                try {
                    const adminSettingsForUpdate = {
                        laborRates: {
                            basic: localSettings.wage * 0.75,
                            standard: localSettings.wage,
                            advanced: localSettings.wage * 1.25,
                            expert: localSettings.wage * 1.5
                        },
                        materialMarkup: localSettings.materialMarkup,
                        pricing: {
                            wage: localSettings.wage,
                            materialMarkup: localSettings.materialMarkup,
                            wholesaleMarkup: localSettings.wholesaleMarkup,
                            minimumTaskRetailPrice: localSettings.minimumTaskRetailPrice,
                            minimumTaskWholesalePrice: localSettings.minimumTaskWholesalePrice,
                            administrativeFee: localSettings.administrativeFee,
                            businessFee: localSettings.businessFee,
                            consumablesFee: localSettings.consumablesFee,
                            rushMultiplier: localSettings.rushMultiplier,
                            deliveryFee: localSettings.deliveryFee,
                            taxRate: localSettings.taxRate,
                            wholesaleConfig: {
                                minimumMultiplier: localSettings.wholesaleMarkup
                            }
                        }
                    };
                    
                    setSuccess('Settings saved successfully! Prices are computed live — no cascade needed.');
                
                setShowSecurityDialog(false);
                setSecurityCodeInput('');
                setShowSnackbar(true);
            }

        } catch (error) {
            console.error('Settings save error:', error);
            setError(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePin = async () => {
        try {
            setGeneratingPin(true);
            setError(null);

            const response = await fetch('/api/admin/settings/verify-code', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate PIN');
            }

            if (data.success) {
                setGeneratedPin(data.securityCode);
                setShowPinDialog(true);
                setSuccess('New security PIN generated successfully');
            }

        } catch (error) {
            console.error('PIN generation error:', error);
            setError(error.message);
        } finally {
            setGeneratingPin(false);
        }
    };

    const calculateLaborRate = () => {
        const adminFee = localSettings.wage * localSettings.administrativeFee;
        const bizFee = localSettings.wage * localSettings.businessFee;
        const consumablesFee = localSettings.wage * localSettings.consumablesFee;
        return localSettings.wage + adminFee + bizFee + consumablesFee;
    };

    const calculateSampleProject = () => {
        const laborRate = calculateLaborRate();
        const laborTime = 2; // 2 hours
        const materialCost = 25; // $25 in materials
        
        const laborCost = laborTime * laborRate;
        const materialTotal = materialCost * localSettings.materialMarkup;
        const total = laborCost + materialTotal;
        
        return {
            laborCost,
            materialTotal,
            total
        };
    };

    return {
        contextLoading,
        contextError,
        localSettings,
        saving,
        error,
        success,
        hasChanges,
        showSecurityDialog,
        securityCodeInput,
        showSnackbar,
        generatingPin,
        generatedPin,
        showPinDialog,
        refreshSettings,
        handleSettingChange,
        handleSaveClick,
        handleSaveSettings,
        handleGeneratePin,
        calculateLaborRate,
        calculateSampleProject,
        setSecurityCodeInput,
        setShowSecurityDialog,
        setShowPinDialog,
        setGeneratedPin,
        setShowSnackbar
    };
};
