"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { Box, Modal, Stepper, Step, StepLabel, Button, Typography } from '@mui/material';
import ClientStep from './newRepairSteps/clientStep.component';
import RepairDetailsStep from './newRepairSteps/repairDetailsStep.component';
import CaptureImageStep from './newRepairSteps/captureImageStep.component';
import ReviewSubmitStep from './newRepairSteps/reviewSubmitStep.component';

// ✅ Steps Definition
const steps = ['Select Client', 'Repair Details', 'Capture Image', 'Review & Submit'];

export default function NewRepairModal({ open, onClose, onSubmit }) {
    const [activeStep, setActiveStep] = React.useState(0);
    const [formData, setFormData] = React.useState({
        userID: '',
        firstName: '',
        lastName: '',
        description: '',
        promiseDate: '',
        metalType: '',
        repairTasks: '',
        picture: '',
    });

    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleSubmit = () => {
        onSubmit(formData);
        onClose();
    };

    const stepComponents = [
        <ClientStep key="clientStep" formData={formData} setFormData={setFormData} />,
        <RepairDetailsStep key="repairDetailsStep" formData={formData} setFormData={setFormData} />,
        <CaptureImageStep key="captureImageStep" formData={formData} setFormData={setFormData} />,
        <ReviewSubmitStep key="reviewSubmitStep" formData={formData} />,
    ];

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    maxWidth: 600,
                }}
            >
                <Typography variant="h6" sx={{ mb: 2 }}>Add New Repair</Typography>
                
                {/* ✅ Stepper UI */}
                <Stepper activeStep={activeStep}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* ✅ Step Content */}
                <Box sx={{ mt: 3, mb: 2 }}>
                    {stepComponents[activeStep]}
                </Box>

                {/* ✅ Stepper Control Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button disabled={activeStep === 0} onClick={handleBack}>
                        Back
                    </Button>
                    {activeStep === steps.length - 1 ? (
                        <Button variant="contained" onClick={handleSubmit}>
                            Submit Repair
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleNext}>
                            Next
                        </Button>
                    )}
                </Box>
            </Box>
        </Modal>
    );
}

NewRepairModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
};
