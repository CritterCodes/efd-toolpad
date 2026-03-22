import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    DialogContentText,
    Button,
    TextField,
    Box,
    Alert,
    Typography,
    Snackbar,
    CircularProgress
} from '@mui/material';
import {
    Shield as ShieldIcon,
    CheckCircle as CheckCircleIcon,
    Save as SaveIcon
} from '@mui/icons-material';

export default function SystemUpdateDialog({
    showSecurityDialog,
    setShowSecurityDialog,
    securityCodeInput,
    setSecurityCodeInput,
    handleSaveSettings,
    saving,
    error,
    showPinDialog,
    setShowPinDialog,
    generatedPin,
    setGeneratedPin,
    showSnackbar,
    setShowSnackbar,
    success
}) {
    return (
        <>
            {/* Security Code Dialog */}
            <Dialog 
                open={showSecurityDialog} 
                onClose={() => setShowSecurityDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <ShieldIcon color="warning" />
                        Security Verification Required
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        These settings affect pricing calculations. Please enter your 4-digit security PIN to confirm the changes.
                    </DialogContentText>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        fullWidth
                        label="Security PIN"
                        type="password"
                        variant="outlined"
                        value={securityCodeInput}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (value.length <= 4 && /^\d+$/.test(value))) {
                                setSecurityCodeInput(value);
                            }
                        }}
                        placeholder="Enter 4-digit PIN"
                        inputProps={{ 
                            maxLength: 4,
                            min: 1000,
                            max: 9999,
                            step: 1
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSecurityDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSaveSettings} 
                        variant="contained"
                        disabled={saving || !securityCodeInput || securityCodeInput.length !== 4}
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* PIN Display Dialog */}
            <Dialog 
                open={showPinDialog} 
                onClose={() => {
                    setShowPinDialog(false);
                    setGeneratedPin(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon color="success" />
                        New Security PIN Generated
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="h4" align="center" sx={{ mb: 1, fontFamily: 'monospace', letterSpacing: 3 }}>
                            {generatedPin}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Please write down this PIN. You&apos;ll need it to save admin settings.
                            This PIN will expire in 1 hour.
                        </Typography>
                    </Alert>
                    <Alert severity="warning">
                        <Typography variant="body2">
                            <strong>Security Notice:</strong> This PIN will only be displayed once. 
                            Keep it secure and don&apos;t share it with others.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setShowPinDialog(false);
                            setGeneratedPin(null);
                        }} 
                        variant="contained"
                    >
                        I&apos;ve Saved the PIN
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Success Snackbar */}
            <Snackbar
                open={showSnackbar}
                autoHideDuration={6000}
                onClose={() => setShowSnackbar(false)}
                message={success}
            />
        </>
    );
}
