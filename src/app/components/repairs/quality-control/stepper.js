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
    Modal
} from "@mui/material";
import { useRouter } from "next/navigation";
import RepairsService from "@/services/repairs";
import QCChecklistStep from "./steps/qc";
import QCPhotoStep from "./steps/picture";
import QCFinalStep from "./steps/review";

const steps = ["QC Checklist", "Photograph for Liability", "Final Approval"];

const QCStepper = ({ repair, qcRepairs }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");
    const [image, setImage] = useState(null);
    const [notes, setNotes] = useState("");
    const [checklist, setChecklist] = useState({
        cleanAndPolish: false,
        allRepairTasks: false,
        stonesTightened: false,
    });
    const [modalOpen, setModalOpen] = useState(true);
    const router = useRouter();

    const handleNext = async () => {
        try {
            if (activeStep === 0) {
                const approve = checklist.cleanAndPolish && checklist.allRepairTasks && checklist.stonesTightened;
                if (!approve) {
                    alert("All checklist items must be approved to proceed.");
                    return;
                }
            }

            if (activeStep === 1 && !image) {
                setSnackbarMessage("Please upload an image before proceeding.");
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
                if (image) {
                    formData.append("picture", image);
                }

                await RepairsService.updateQualityControl(formData);

                setSnackbarMessage(`✅ Repair ${repair.repairID} successfully passed QC!`);
                setSnackbarSeverity("success");
                setSnackbarOpen(true);

                const currentIndex = qcRepairs.findIndex((r) => r.repairID === repair.repairID);
                const nextRepair = qcRepairs[currentIndex + 1];

                if (nextRepair) {
                    router.push(`/dashboard/repairs/quality-control/${nextRepair.repairID}`);
                } else {
                    router.push(`/dashboard/repairs/quality-control`);
                }
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

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleChecklistChange = (event) => {
        const { name, checked } = event.target;
        setChecklist((prev) => ({ ...prev, [name]: checked }));
    };

    const handleImageUpload = (e) => {
        setImage(e.target.files[0]);
    };

    const handleSendToOven = async () => {
        try {
            await RepairsService.moveRepairStatus([repair.repairID], "READY FOR WORK");
            setSnackbarMessage(`🔥 Repair ${repair.repairID} sent to READY FOR WORK!`);
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
            const currentIndex = qcRepairs.findIndex((r) => r.repairID === repair.repairID);
            const nextRepair = qcRepairs[currentIndex + 1];
            router.push(nextRepair ? `/dashboard/repairs/quality-control/${nextRepair.repairID}` : `/dashboard/repairs/quality-control`);
            setModalOpen(false);
        } catch (error) {
            setSnackbarMessage("❌ Error updating repair status.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    // ✅ Redirect user back to QC dashboard when modal is closed
    const handleModalClose = () => {
        setModalOpen(false);
        router.push(`/dashboard/repairs/quality-control`);
    };

    return (
        <Modal open={modalOpen} onClose={handleModalClose}>
            <Box sx={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", maxWidth: "600px", margin: "auto", mt: "10%" }}>
                <Typography variant="h4" sx={{ mb: 2 }}>
                    Quality Control for {repair.clientName}
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Stepper activeStep={activeStep}>
                    {steps.map((label, index) => (
                        <Step key={index}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ mt: 4 }}>
                    {activeStep === 0 && (
                        <QCChecklistStep
                            checklist={checklist}
                            handleChecklistChange={handleChecklistChange}
                            notes={notes}
                            setNotes={setNotes}
                            handleSendToOven={handleSendToOven}
                        />
                    )}
                    {activeStep === 1 && <QCPhotoStep handleImageUpload={handleImageUpload} />}
                    {activeStep === 2 && <QCFinalStep />}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                    <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                        Back
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleNext}>
                        {activeStep === steps.length - 1 ? "Complete QC" : "Next Step"}
                    </Button>
                </Box>

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
