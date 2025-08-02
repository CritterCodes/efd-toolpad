"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    Box, Button, Step, StepLabel, Stepper, Typography, Modal,
    useMediaQuery, IconButton, TextField, FormControl, InputLabel,
    Select, MenuItem, FormControlLabel, Switch, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';

const steps = ['Ticket Details', 'Financial Info', 'Review & Submit'];

const defaultFormData = {
    ticketID: '',
    title: '',
    description: '',
    type: 'custom-design',
    status: 'pending',
    clientInfo: {
        name: '',
        email: '',
        phone: ''
    },
    materials: [],
    laborHours: 0,
    materialsCost: 0,
    laborCost: 0,
    paymentReceived: false,
    cardPaymentStatus: 'unpaid'
};

export default function NewCustomTicketStepper({ open, onClose, onSubmit }) {
    const [activeStep, setActiveStep] = React.useState(0);
    const [formData, setFormData] = React.useState({ ...defaultFormData });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleNext = () => {
        if (validateStep()) {
            setActiveStep((prevStep) => prevStep + 1);
        }
    };
    
    const handleBack = () => setActiveStep((prevStep) => prevStep - 1);

    const handleClose = () => {
        setFormData({ ...defaultFormData });
        setActiveStep(0);
        setError(null);
        onClose();
    };

    const validateStep = () => {
        setError(null);
        
        switch (activeStep) {
            case 0: // Ticket Details
                if (!formData.title.trim()) {
                    setError('Title is required');
                    return false;
                }
                if (!formData.description.trim()) {
                    setError('Description is required');
                    return false;
                }
                if (!formData.clientInfo.name.trim()) {
                    setError('Client name is required');
                    return false;
                }
                if (!formData.clientInfo.email.trim()) {
                    setError('Client email is required');
                    return false;
                }
                break;
            case 1: // Financial Info
                if (formData.materialsCost < 0 || formData.laborCost < 0) {
                    setError('Costs cannot be negative');
                    return false;
                }
                break;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;
        
        setLoading(true);
        setError(null);

        try {
            const ticketData = {
                ...formData,
                ticketID: `CT-${Date.now()}`,
                quoteTotal: (formData.materialsCost * 2) + (formData.laborCost * 1.25), // 2x materials, 25% markup on labor
                createdAt: new Date().toISOString()
            };

            await onSubmit(ticketData);
            handleClose();
        } catch (error) {
            console.error('Error creating ticket:', error);
            setError(error.message || 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="Ticket Title"
                            variant="outlined"
                            fullWidth
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        />
                        
                        <TextField
                            label="Description"
                            variant="outlined"
                            fullWidth
                            required
                            multiline
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                label="Type"
                            >
                                <MenuItem value="repair">Repair</MenuItem>
                                <MenuItem value="custom-design">Custom Design</MenuItem>
                            </Select>
                        </FormControl>

                        <Typography variant="h6" sx={{ mt: 2 }}>Client Information</Typography>
                        
                        <TextField
                            label="Client Name"
                            variant="outlined"
                            fullWidth
                            required
                            value={formData.clientInfo.name}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                clientInfo: { ...prev.clientInfo, name: e.target.value }
                            }))}
                        />

                        <TextField
                            label="Client Email"
                            variant="outlined"
                            fullWidth
                            required
                            type="email"
                            value={formData.clientInfo.email}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                clientInfo: { ...prev.clientInfo, email: e.target.value }
                            }))}
                        />

                        <TextField
                            label="Client Phone"
                            variant="outlined"
                            fullWidth
                            value={formData.clientInfo.phone}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                clientInfo: { ...prev.clientInfo, phone: e.target.value }
                            }))}
                        />
                    </Box>
                );

            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Typography variant="h6">Financial Information</Typography>
                        
                        <TextField
                            label="Materials Cost"
                            variant="outlined"
                            fullWidth
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={formData.materialsCost}
                            onChange={(e) => setFormData(prev => ({ ...prev, materialsCost: parseFloat(e.target.value) || 0 }))}
                        />

                        <TextField
                            label="Labor Hours"
                            variant="outlined"
                            fullWidth
                            type="number"
                            inputProps={{ min: 0, step: 0.25 }}
                            value={formData.laborHours}
                            onChange={(e) => setFormData(prev => ({ ...prev, laborHours: parseFloat(e.target.value) || 0 }))}
                        />

                        <TextField
                            label="Labor Cost"
                            variant="outlined"
                            fullWidth
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={formData.laborCost}
                            onChange={(e) => setFormData(prev => ({ ...prev, laborCost: parseFloat(e.target.value) || 0 }))}
                        />

                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Quote Calculation</Typography>
                            <Typography variant="body2">Materials: ${formData.materialsCost.toFixed(2)} × 2 = ${(formData.materialsCost * 2).toFixed(2)}</Typography>
                            <Typography variant="body2">Labor: ${formData.laborCost.toFixed(2)} × 1.25 = ${(formData.laborCost * 1.25).toFixed(2)}</Typography>
                            <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold' }}>
                                Total Quote: ${((formData.materialsCost * 2) + (formData.laborCost * 1.25)).toFixed(2)}
                            </Typography>
                        </Box>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.paymentReceived}
                                    onChange={(e) => setFormData(prev => ({ ...prev, paymentReceived: e.target.checked }))}
                                />
                            }
                            label="Payment Received"
                        />

                        <FormControl fullWidth>
                            <InputLabel>Card Payment Status</InputLabel>
                            <Select
                                value={formData.cardPaymentStatus}
                                onChange={(e) => setFormData(prev => ({ ...prev, cardPaymentStatus: e.target.value }))}
                                label="Card Payment Status"
                            >
                                <MenuItem value="unpaid">Unpaid</MenuItem>
                                <MenuItem value="partial">Partial</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                );

            case 2:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Review Ticket Details</Typography>
                        
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="subtitle1" gutterBottom><strong>{formData.title}</strong></Typography>
                            <Typography variant="body2" gutterBottom>{formData.description}</Typography>
                            <Typography variant="body2">Type: {formData.type}</Typography>
                            <Typography variant="body2">Client: {formData.clientInfo.name} ({formData.clientInfo.email})</Typography>
                            {formData.clientInfo.phone && (
                                <Typography variant="body2">Phone: {formData.clientInfo.phone}</Typography>
                            )}
                        </Box>

                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Financial Summary</Typography>
                            <Typography variant="body2">Materials Cost: ${formData.materialsCost.toFixed(2)}</Typography>
                            <Typography variant="body2">Labor Cost: ${formData.laborCost.toFixed(2)} ({formData.laborHours} hours)</Typography>
                            <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
                                Quote Total: ${((formData.materialsCost * 2) + (formData.laborCost * 1.25)).toFixed(2)}
                            </Typography>
                            <Typography variant="body2">Payment Received: {formData.paymentReceived ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">Card Payment Status: {formData.cardPaymentStatus}</Typography>
                        </Box>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
            }}
        >
            <Box
                sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    boxShadow: 24,
                    p: 4,
                    width: '100%',
                    maxWidth: 600,
                    maxHeight: '90vh',
                    overflow: 'auto'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight="600">
                        New Custom Ticket
                    </Typography>
                    <IconButton onClick={handleClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {renderStepContent(activeStep)}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        sx={{ mr: 1 }}
                    >
                        Back
                    </Button>
                    <Box>
                        {activeStep === steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Ticket'}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                            >
                                Next
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Modal>
    );
}

NewCustomTicketStepper.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired
};
