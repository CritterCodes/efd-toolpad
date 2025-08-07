"use client";
import React, { useState } from "react";
import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Button,
    Snackbar,
    Divider,
    Modal,
} from "@mui/material";
import { useRouter } from "next/navigation";
import RepairsService from "@/services/repairs";
import { useRepairs } from "@/app/context/repairs.context";
import QCChecklistStep from "./steps/qc";
import QCPhotoStep from "./steps/picture";
import QCFinalStep from "./steps/review";

const steps = ["QC Checklist", "Photograph for Liability", "Final Approval"];

const QCStepper = ({ repair, qcRepairs }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");
    const [qcPicture, setQcPicture] = useState(null); // Stores File object
    const [qcPicturePreview, setQcPicturePreview] = useState(null); // Stores preview URL
    const [notes, setNotes] = useState("");
    const [checklist, setChecklist] = useState({
        cleanAndPolish: false,
        allRepairTasks: false,
        stonesTightened: false,
    });
    const [modalOpen, setModalOpen] = useState(true);
    const router = useRouter();
    
    // Repairs context for updating the repairs list
    const { updateRepair } = useRepairs();

    /**
     * ✅ Handle moving to the next step
     */
    const handleNext = async () => {
        try {
            if (activeStep === 0) {
                const allChecked = Object.values(checklist).every(Boolean);
                if (!allChecked) {
                    alert("Please complete all checklist items before proceeding.");
                    return;
                }
            }
    
            if (activeStep === 1 && !qcPicture) {
                setSnackbarMessage("Please upload a QC image before proceeding.");
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
                return;
            }
            
    
            if (activeStep === 2) {
                const formData = new FormData();
                formData.append("repairID", repair.repairID);
                formData.append("status", "READY FOR PICK-UP");
                formData.append("notes", notes);
                formData.append("checklist", JSON.stringify(checklist));

                if (qcPicture) {
                    formData.append("qcPicture", qcPicture);
                }

                await RepairsService.updateQualityControl(formData);
                
                // ✅ Update the repair status in context
                updateRepair(repair.repairID, { 
                    status: "READY FOR PICK-UP",
                    notes: notes,
                    qcDate: new Date(),
                    completedAt: new Date()
                });

                setSnackbarMessage(`✅ Repair ${repair.repairID} successfully passed QC!`);
                setSnackbarSeverity("success");
                setSnackbarOpen(true);

                const currentIndex = qcRepairs.findIndex(
                    (r) => r.repairID === repair.repairID
                );
                const nextRepair = qcRepairs[currentIndex + 1];

                router.push(
                    nextRepair
                        ? `/dashboard/repairs/quality-control/${nextRepair.repairID}`
                        : `/dashboard/repairs/quality-control`
                );
                setModalOpen(false);
            } else {
                setActiveStep((prev) => prev + 1);
            }
        } catch (error) {
            setSnackbarMessage(`❌ Error during QC process: ${error.message}`);
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };
    

    /**
     * ✅ Handle Image Upload for QC with Preview
     */
    const handleImageUpload = (file) => {
        if (file) {
            setQcPicture(file); // Save the file
            setQcPicturePreview(URL.createObjectURL(file)); // Save the preview URL
        }
    };
    

    /**
     * ✅ Step Back
     */
    const handleBack = () => setActiveStep((prev) => prev - 1);

    return (
        <Modal
            open={modalOpen}
            onClose={() => router.push("/dashboard/repairs/quality-control")}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Box
                sx={{
                    padding: "20px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    width: "90%",
                    maxWidth: "500px",
                    textAlign: "center",
                    overflowY: "auto",
                    maxHeight: "90vh", // Prevents the modal from overflowing on smaller screens
                }}
            >
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Quality Control for {repair.clientName}
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {/* ✅ Stepper Logic */}
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label, index) => (
                        <Step key={index}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* ✅ Step Content */}
                <Box sx={{ mt: 4 }}>
                    {activeStep === 0 && (
                        <QCChecklistStep
                            checklist={checklist}
                            handleChecklistChange={(e) => {
                                const { name, checked } = e.target;
                                setChecklist((prev) => ({ ...prev, [name]: checked }));
                            }}
                            notes={notes}
                            setNotes={setNotes}
                            repair={repair}
                        />
                    )}
                    {activeStep === 1 && (
                        <QCPhotoStep
                            handleImageUpload={handleImageUpload}
                            qcPicturePreview={qcPicturePreview} // Pass the preview
                        />
                    )}
                    {activeStep === 2 && (
                        <QCFinalStep
                            repair={repair}
                            checklist={checklist}
                            notes={notes}
                            qcPicturePreview={qcPicturePreview}
                        />
                    )}
                </Box>

                {/* ✅ Navigation Controls */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                    <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        variant="outlined"
                        sx={{
                            borderRadius: "8px",
                            padding: "10px 20px",
                        }}
                    >
                        Back
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleNext}
                        sx={{
                            borderRadius: "8px",
                            padding: "10px 20px",
                        }}
                    >
                        {activeStep === steps.length - 1 ? "Complete QC" : "Next Step"}
                    </Button>
                </Box>

                {/* ✅ Snackbar for Notifications */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={5000}
                    onClose={() => setSnackbarOpen(false)}
                    message={snackbarMessage}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                />
            </Box>
        </Modal>
    );
};

export default QCStepper;
