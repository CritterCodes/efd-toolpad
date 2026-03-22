'use client';

import { useStoreSettings } from '@/hooks/admin/useStoreSettings';
import { 
    Alert,
    AlertTitle,
    Box,
    Grid,
    CircularProgress,
    Button
} from '@mui/material';
import { 
    Refresh as RefreshCwIcon,
    Lock as LockIcon,
    Save as SaveIcon
} from '@mui/icons-material';

import LaborSettings from './store-settings/LaborSettings';
import PricingMultiplierConfig from './store-settings/PricingMultiplierConfig';
import LaborRateSummary from './store-settings/LaborRateSummary';
import SampleProjectExamples from './store-settings/SampleProjectExamples';
import SystemUpdateDialog from './store-settings/SystemUpdateDialog';

export default function StoreSettingsTab() {
    const {
        contextLoading,
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
    } = useStoreSettings();

    if (contextLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const sampleProject = calculateSampleProject();

    return (
        <Box>
            {error && !showSecurityDialog && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <AlertTitle>Error</AlertTitle>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <LaborSettings 
                        localSettings={localSettings} 
                        handleSettingChange={handleSettingChange} 
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <PricingMultiplierConfig 
                        localSettings={localSettings} 
                        handleSettingChange={handleSettingChange} 
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <LaborRateSummary 
                        localSettings={localSettings} 
                        calculateLaborRate={calculateLaborRate} 
                    />
                </Grid>

                <Grid item xs={12} md={6}>
                    <SampleProjectExamples 
                        sampleProject={sampleProject} 
                        calculateLaborRate={calculateLaborRate} 
                    />
                </Grid>

                <Grid item xs={12}>
                    <Box display="flex" justifyContent="center" gap={2}>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveClick}
                            disabled={!hasChanges || saving}
                            size="large"
                        >
                            Save Store Settings
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshCwIcon />}
                            onClick={refreshSettings}
                            disabled={contextLoading}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<LockIcon />}
                            onClick={handleGeneratePin}
                            disabled={generatingPin}
                            color="warning"
                        >
                            {generatingPin ? 'Generating...' : 'Generate New PIN'}
                        </Button>
                    </Box>
                    {hasChanges && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <AlertTitle>Unsaved Changes</AlertTitle>
                            You have unsaved changes. Click &quot;Save Store Settings&quot; to apply them.
                        </Alert>
                    )}
                </Grid>
            </Grid>

            <SystemUpdateDialog 
                showSecurityDialog={showSecurityDialog}
                setShowSecurityDialog={setShowSecurityDialog}
                securityCodeInput={securityCodeInput}
                setSecurityCodeInput={setSecurityCodeInput}
                handleSaveSettings={handleSaveSettings}
                saving={saving}
                error={error}
                showPinDialog={showPinDialog}
                setShowPinDialog={setShowPinDialog}
                generatedPin={generatedPin}
                setGeneratedPin={setGeneratedPin}
                showSnackbar={showSnackbar}
                setShowSnackbar={setShowSnackbar}
                success={success}
            />
        </Box>
    );
}
