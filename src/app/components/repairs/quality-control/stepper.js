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
    TextField,
    Checkbox,
    FormControlLabel,
} from "@mui/material";
import { useRouter } from "next/navigation";
import RepairsService from "@/services/repairs";

const steps = ["QC Checklist", "Photograph for Liability", "Final Approval"];

const QCStepper = ({ repair, nextRepair }) => {
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
    const router = useRouter();

    const handleNext = async () => {
        try {
            if (activeStep === 0) {
                // Ensure all checklist items are approved before proceeding
                const approve =
                    checklist.cleanAndPolish &&
                    checklist.allRepairTasks &&
                    checklist.stonesTightened;
    
                if (!approve) {
                    alert("All checklist items must be approved to proceed.");
                    return;
                }
    
                // Append checklist and notes to the repair object
                repair.checklist = { ...checklist };
                if (notes) {
                    repair.notes = repair.notes ? `${repair.notes}\n${notes}` : notes;
                }
            }
    
            if (activeStep === 1) {
                // Ensure an image is uploaded before proceeding
                if (!image) {
                    setSnackbarMessage("Please upload an image before proceeding.");
                    setSnackbarSeverity("error");
                    setSnackbarOpen(true);
                    return;
                }
    
                // Save the uploaded image to the repair object
                repair.image = image; // Assuming `image` is the file or URL
            }
    
            if (activeStep === 2) {
                // Finalize QC: Save notes, checklist, and image, and update status
                repair.status = "READY FOR PICK-UP";
    
                await RepairsService.updateRepair(repair.repairID, repair); // Save updated repair object
    
                setSnackbarMessage(`✅ Repair ${repair.repairID} successfully passed QC and client notified!`);
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
    
                // Redirect to the next repair in the QC queue
                router.push(`/dashboard/repairs/quality-control/${nextRepair?.repairID}`);
            } else {
                // Proceed to the next step
                setActiveStep((prev) => prev + 1);
            }
        } catch (error) {
            setSnackbarMessage(`❌ Error during QC process: ${error.message || "Unknown error"}`);
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

    return (
        <Box sx={{ padding: "20px" }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
                Quality Control for {repair.clientName}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Stepper Component */}
            <Stepper activeStep={activeStep}>
                {steps.map((label, index) => (
                    <Step key={index}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Step Content */}
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6">{steps[activeStep]}</Typography>
                {activeStep === 0 && (
                    <>
                        <Typography sx={{ mt: 2 }}>Perform the following checks:</Typography>
                        <Box sx={{ mt: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="cleanAndPolish"
                                        checked={checklist.cleanAndPolish}
                                        onChange={handleChecklistChange}
                                    />
                                }
                                label="Clean and Polish Completed"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="allRepairTasks"
                                        checked={checklist.allRepairTasks}
                                        onChange={handleChecklistChange}
                                    />
                                }
                                label="All Repair Tasks Completed"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="stonesTightened"
                                        checked={checklist.stonesTightened}
                                        onChange={handleChecklistChange}
                                    />
                                }
                                label="Stones Tightened"
                            />
                        </Box>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Notes (Optional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            sx={{ mt: 2 }}
                        />

                        {/* Send to the Oven Button */}
                        <Button
                            variant="outlined"
                            color="error"
                            sx={{ mt: 2 }}
                            onClick={async () => {
                                try {
                                    await RepairsService.updateRepairNotes(repair.repairID, notes);
                                    await RepairsService.moveRepairStatus([repair.repairID], "READY FOR WORK");
                                    setSnackbarMessage(`🔥 Repair ${repair.repairID} sent to READY FOR WORK!`);
                                    setSnackbarSeverity("info");
                                    setSnackbarOpen(true);
                                    router.push(`/dashboard/repairs/quality-control/${nextRepair?.repairID}`);
                                } catch (error) {
                                    setSnackbarMessage("❌ Error updating repair status.");
                                    setSnackbarSeverity("error");
                                    setSnackbarOpen(true);
                                }
                            }}
                        >
                            Send to the Oven
                        </Button>
                    </>
                )}

                {activeStep === 1 && (
                    <>
                        <Typography sx={{ mt: 2 }}>
                            Upload a picture for liability and documentation.
                        </Typography>
                        <TextField
                            type="file"
                            onChange={handleImageUpload}
                            fullWidth
                            sx={{ mt: 2 }}
                        />
                    </>
                )}
                {activeStep === 2 && (
                    <Typography sx={{ mt: 2 }}>
                        Final review complete. Confirm to mark as &quot;READY FOR PICK-UP&quot; and notify the client.
                    </Typography>
                )}
            </Box>

            {/* Control Buttons */}
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    variant="outlined"
                >
                    Back
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                >
                    {activeStep === steps.length - 1 ? "Complete QC" : "Next Step"}
                </Button>
            </Box>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: {
                        backgroundColor:
                            snackbarSeverity === "success"
                                ? "green"
                                : snackbarSeverity === "error"
                                    ? "red"
                                    : "orange",
                        color: "white",
                        fontWeight: "bold",
                    },
                }}
            />
        </Box>
    );
};

export default QCStepper;
