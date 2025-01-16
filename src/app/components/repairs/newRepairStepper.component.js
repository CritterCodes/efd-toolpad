"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    Box, Button, Step, StepLabel, Stepper, Typography, Modal,
    useMediaQuery, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ClientStep from './newRepairSteps/clientStep.component';
import RepairDetailsStep from './newRepairSteps/repairDetailsStep.component';
import CaptureImageStep from './newRepairSteps/captureImageStep.component';
import { useTheme } from '@mui/material/styles';
import RepairsService from '@/services/repairs';
import TasksStep from './newRepairSteps/tasks';

const steps = ['Select Client', 'Repair Details', 'Capture Image', 'Review & Submit'];

// ✅ Default Form Data
const defaultFormData = {
    userID: '',
    firstName: '',
    lastName: '',
    description: '',
    promiseDate: '',
    metalType: '',
    repairTasks: [],
    picture: '',
};

export default function NewRepairStepper({ open, onClose, onSubmit, userID = null }) {
    const [activeStep, setActiveStep] = React.useState(0);
    const [formData, setFormData] = React.useState({ ...defaultFormData });
    const [loading, setLoading] = React.useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleNext = () => setActiveStep((prevStep) => prevStep + 1);
    const handleBack = () => setActiveStep((prevStep) => prevStep - 1);

    // ✅ Close and Reset
    const handleClose = () => {
        setFormData({ ...defaultFormData });
        setActiveStep(0);
        onClose();
    };
    const handleSubmit = async () => {
        setLoading(true);
    
        if (!formData.userID || !formData.firstName || !formData.lastName) {
            alert("Please complete all required fields.");
            setLoading(false);
            return;
        }
    
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('userID', formData.userID);
            formDataToSend.append('clientName', `${formData.firstName} ${formData.lastName}`.trim());
            formDataToSend.append('description', formData.description);
            formDataToSend.append('promiseDate', formData.promiseDate);
    
            // ✅ Flatten the metalType correctly before sending
            const metalTypeString = formData.metalType.karat
                ? `${formData.metalType.type} - ${formData.metalType.karat}`
                : formData.metalType.type;
            formDataToSend.append('metalType', metalTypeString);
    
            formDataToSend.append('repairTasks', JSON.stringify(formData.repairTasks));
            const totalCost = formData.repairTasks.reduce(
                (acc, task) => acc + (parseFloat(task.price || 0) * (task.quantity || 1)),
                0
            );
            
            formDataToSend.append('cost', totalCost.toString());
            formDataToSend.append('completed', "false");
    
            if (formData.picture && formData.picture instanceof File) {
                formDataToSend.append('picture', formData.picture);
            }
    
            console.log("📤 Submitting FormData:", [...formDataToSend.entries()]);
    
            const response = await RepairsService.createRepair(formDataToSend);
    
            console.log("📥 Submitted Repair:", response)
            onSubmit(response);
            handleClose();
        } catch (error) {
            console.error("Error submitting repair:", error.message);
            alert("Error submitting repair: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    
    

    // ✅ Step Components with `handleNext` properly passed
    const stepComponents = [
        <ClientStep key="clientStep" formData={formData} setFormData={setFormData} handleNext={handleNext} userID={userID} />,
        <RepairDetailsStep key="repairDetailsStep" formData={formData} setFormData={setFormData} handleNext={handleNext} />,
        <CaptureImageStep key="captureImageStep" formData={formData} setFormData={setFormData} handleNext={handleNext} />,
        <TasksStep key="tasksStep" formData={formData} setFormData={setFormData} handleNext={handleNext} />,
    ];

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="new-repair-modal"
            aria-describedby="new-repair-stepper-description"
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: isMobile ? 0 : '50%',
                    left: isMobile ? 0 : '50%',
                    transform: isMobile ? 'none' : 'translate(-50%, -50%)',
                    width: isMobile ? '100%' : '600px',
                    height: isMobile ? '100%' : 'auto',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: isMobile ? 2 : 4,
                    borderRadius: isMobile ? 0 : 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    maxHeight: isMobile ? '100vh' : '90vh',
                    overflowY: 'auto',
                }}
            >
                {/* ✅ Close Button */}
                <IconButton 
                    onClick={handleClose} 
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    aria-label="close"
                >
                    <CloseIcon />
                </IconButton>

                {/* ✅ Title */}
                <Typography variant="h5" sx={{ textAlign: 'center', mb: 2 }}>
                    New Repair
                </Typography>

                {/* ✅ Stepper Component */}
                <Stepper activeStep={activeStep} alternativeLabel={isMobile} sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* ✅ Step Content */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {stepComponents[activeStep]}
                </Box>

                {/* ✅ Navigation Buttons */}
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mt: 2 }}>
                    <Button disabled={activeStep === 0} onClick={handleBack} fullWidth={isMobile}>
                        Back
                    </Button>
                    {activeStep === steps.length - 1 ? (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            fullWidth={isMobile}
                            disabled={loading}
                        >
                            {loading ? 'Submitting...' : 'Submit Repair'}
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleNext} fullWidth={isMobile}>
                            Next
                        </Button>
                    )}
                </Box>
            </Box>
        </Modal>
    );
}

NewRepairStepper.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
};
