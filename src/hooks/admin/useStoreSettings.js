import { useState, useEffect, useMemo } from 'react';
import { resolvePricingSettings, priceTask } from '@/services/pricing/engine';
import { useAdminSettings } from '@/context/AdminSettingsContext';

export const useStoreSettings = () => {
    const {
        adminSettings,
        loading: contextLoading,
        error: contextError,
        updateAdminSettings,
        refreshSettings
    } = useAdminSettings();

    // Blank until the shop's settings load — never invented. (These used to start at a $30 wage, $25
    // delivery and 8.75% tax, and fall back to them, so saving the form could write them to the shop.)
    const [localSettings, setLocalSettings] = useState({
        wage: '',
        materialMarkup: '',
        wholesaleMarkup: '',
        minimumTaskRetailPrice: '',
        minimumTaskWholesalePrice: '',
        administrativeFee: '',
        businessFee: '',
        consumablesFee: '',
        rushMultiplier: '',
        deliveryFee: '',
        taxRate: '',
        consignmentFeeRate: 0.20,
        federalTaxReserveRate: 0.30
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
                wage: adminSettings.wage ?? '',
                materialMarkup: adminSettings.materialMarkup ?? '',
                wholesaleMarkup: adminSettings.wholesaleMarkup ?? '',
                minimumTaskRetailPrice: adminSettings.minimumTaskRetailPrice ?? '',
                minimumTaskWholesalePrice: adminSettings.minimumTaskWholesalePrice ?? '',
                administrativeFee: adminSettings.administrativeFee ?? '',
                businessFee: adminSettings.businessFee ?? '',
                consumablesFee: adminSettings.consumablesFee ?? '',
                rushMultiplier: adminSettings.rushMultiplier ?? '',
                deliveryFee: adminSettings.deliveryFee ?? '',
                taxRate: adminSettings.taxRate ?? '',
                consignmentFeeRate: adminSettings.consignmentFeeRate ?? 0.20,
                federalTaxReserveRate: Number(
                    adminSettings.federalTaxReserveRate
                    ?? adminSettings.analytics?.federalTaxReserveRate
                    ?? 0.30
                ),
            });
        }
    }, [adminSettings]);

    useEffect(() => {
        if (!adminSettings) return;

        const currentSettings = {
            ...adminSettings,
            federalTaxReserveRate: Number(
                adminSettings.federalTaxReserveRate
                ?? adminSettings.analytics?.federalTaxReserveRate
                ?? 0.30
            ),
        };

        const changed = Object.keys(localSettings).some(
            (key) => parseFloat(localSettings[key]) !== parseFloat(currentSettings[key])
        );
        setHasChanges(changed);
    }, [localSettings, adminSettings]);

    const handleSettingChange = (field, value) => {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 0) {
            if (
                field === 'administrativeFee' ||
                field === 'businessFee' ||
                field === 'consumablesFee' ||
                field === 'taxRate' ||
                field === 'consignmentFeeRate' ||
                field === 'federalTaxReserveRate'
            ) {
                setLocalSettings((prev) => ({
                    ...prev,
                    [field]: numericValue / 100
                }));
            } else {
                setLocalSettings((prev) => ({
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
                console.log('Admin settings saved successfully.');
                setSuccess('Settings saved successfully! Prices are computed live - no cascade needed.');
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

    // What the settings on screen WOULD charge — THE engine on the values being edited, before they're
    // saved. A labor hour at retail and wholesale, and a sample job (2 hours + $25 of materials). Values
    // the engine won't accept show its reason instead of a number.
    const pricingPreview = useMemo(() => {
        let settings;
        try {
            settings = resolvePricingSettings({ pricing: { ...localSettings, quantityTiers: adminSettings?.pricing?.quantityTiers } });
        } catch (e) {
            return { error: e.message };
        }
        const hour = priceTask({ task: { processes: [{ laborHours: 1, quantity: 1 }] }, settings });
        const sample = priceTask({
            task: { processes: [{ laborHours: 2, quantity: 1 }], materials: [{ material: { estimatedCost: 25 }, quantity: 1 }] },
            settings,
        });
        return {
            wage: settings.wage,
            retailMultiplier: settings.retailMultiplier,
            wholesaleMarkup: settings.wholesaleMarkup,
            retailHour: hour.retail.listUnit,
            wholesaleHour: hour.wholesale.listUnit,
            sample: {
                laborCost: sample.laborCost,
                materialsCost: sample.materialsCost,
                baseCost: sample.baseCost,
                retail: sample.retail.listUnit,
                wholesale: sample.wholesale.listUnit,
            },
        };
    }, [localSettings, adminSettings]);

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
        pricingPreview,
        setSecurityCodeInput,
        setShowSecurityDialog,
        setShowPinDialog,
        setGeneratedPin,
        setShowSnackbar
    };
};
