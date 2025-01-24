"use client";
import React, { useState } from "react";
import { Box, Paper, Stepper, Step, StepLabel, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import RoleSelectionStep from "@/app/components/auth/register/steps/roleSelection";
import DetailsStep from "@/app/components/auth/register/steps/details";
import CredentialsStep from "@/app/components/auth/register/steps/credentials";

const steps = ["Select Role", "Enter Details", "Set Credentials"];

const RegisterPage = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [form, setForm] = useState({});
    const [selectedRole, setSelectedRole] = useState("");
    const router = useRouter();

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleSubmit = async () => {
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({ ...form, role: selectedRole }),
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) router.push("/dashboard");
        } catch (error) {
            console.error("Registration failed:", error);
        }
    };

    return (
        <Paper elevation={3} sx={{ padding: 4, margin: "40px auto", maxWidth: 600 }}>
            <Typography variant="h4" align="center" gutterBottom>
                Register
            </Typography>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label, index) => (
                    <Step key={index}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>
            {activeStep === 0 && (
                <RoleSelectionStep
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    handleNext={handleNext}
                    form={form}
                    setForm={setForm}
                />
            )}
            {activeStep === 1 && (
                <DetailsStep
                    selectedRole={selectedRole}
                    form={form}
                    setForm={setForm}
                    handleNext={handleNext}
                    handleBack={handleBack}
                />
            )}
            {activeStep === 2 && (
                <CredentialsStep
                    form={form}
                    setForm={setForm}
                    handleSubmit={handleSubmit}
                    handleBack={handleBack}
                />
            )}
        </Paper>
    );
};

export default RegisterPage;
