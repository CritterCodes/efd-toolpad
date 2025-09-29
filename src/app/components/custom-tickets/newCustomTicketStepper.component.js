/**
 * New Custom Ticket Stepper Component
 * Constitutional Architecture: Component Layer - Main Stepper Controller
 * Responsibility: Orchestrate multi-step ticket creation form
 */

"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    Box, Button, Step, StepLabel, Stepper, Typography, Modal,
    useMediaQuery, IconButton, Alert, LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { INTERNAL_STATUSES } from '@/config/statuses';

// Import step components
import TicketDetailsStep from './steps/TicketDetailsStep';
import FinancialInfoStep from './steps/FinancialInfoStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';

const steps = ['Ticket Details', 'Financial Info', 'Review & Submit'];

const defaultFormData = {
    ticketID: '',
    title: '',
    description: '',
    type: 'custom-design',
    status: INTERNAL_STATUSES.PENDING,
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
    cardPaymentStatus: 'unpaid',
    paymentAmount: 0,
    paymentNotes: ''
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
                if ((formData.materialsCost || 0) < 0) {
                    setError('Materials cost cannot be negative');
                    return false;
                }
                if ((formData.laborCost || 0) < 0) {
                    setError('Labor cost cannot be negative');
                    return false;
                }
                break;
            case 2: // Review & Submit
                // Final validation before submit
                return true;
            default:
                return true;
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
                quoteTotal: (formData.materialsCost || 0) + (formData.laborCost || 0),
                customerName: formData.clientInfo.name,
                customerEmail: formData.clientInfo.email,
                customerPhone: formData.clientInfo.phone || '',
            };

            await onSubmit(ticketData);
            handleClose();
        } catch (err) {
            setError(err.message || 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <TicketDetailsStep 
                        formData={formData} 
                        setFormData={setFormData} 
                        error={error}
                    />
                );
            case 1:
                return (
                    <FinancialInfoStep 
                        formData={formData} 
                        setFormData={setFormData} 
                        error={error}
                    />
                );
            case 2:
                return <ReviewSubmitStep formData={formData} />;
            default:
                return null;
        }
    };

    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '95%' : '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: 2,
        overflow: 'auto'
    };

    return (
        <Modal
            open={open}
            onClose={loading ? undefined : handleClose}
            disableEscapeKeyDown={loading}
        >
            <Box sx={modalStyle}>
                {loading && <LinearProgress />}
                
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" component="h2">
                            Create New Ticket
                        </Typography>
                        <IconButton 
                            onClick={handleClose} 
                            disabled={loading}
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {renderStepContent(activeStep)}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button 
                            onClick={handleBack} 
                            disabled={activeStep === 0 || loading}
                        >
                            Back
                        </Button>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                                onClick={handleClose} 
                                disabled={loading}
                                color="inherit"
                            >
                                Cancel
                            </Button>
                            
                            {activeStep === steps.length - 1 ? (
                                <Button 
                                    variant="contained" 
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    Create Ticket
                                </Button>
                            ) : (
                                <Button 
                                    variant="contained" 
                                    onClick={handleNext}
                                    disabled={loading}
                                >
                                    Next
                                </Button>
                            )}
                        </Box>
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
