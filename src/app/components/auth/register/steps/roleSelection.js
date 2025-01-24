"use client";
import React from "react";
import { Box, Typography, Button, Grid } from "@mui/material";

const RoleSelectionStep = ({selectedRole, setSelectedRole, form, setForm, handleNext }) => {
    const handleRoleSelection = (role) => {
        setSelectedRole(role); // Update the selected role
        setForm((prevForm) => ({ ...prevForm, role })); // Update the role in the form state
    };

    return (
        <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" gutterBottom>
                What type of account are you creating?
            </Typography>
            <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                <Grid item>
                    <Button
                        variant={selectedRole === "client" ? "contained" : "outlined"}
                        onClick={() => handleRoleSelection("client")}
                        fullWidth
                    >
                        I’m a Client
                    </Button>
                </Grid>
                <Grid item>
                    <Button
                        variant={selectedRole === "store" ? "contained" : "outlined"}
                        onClick={() => handleRoleSelection("store")}
                        fullWidth
                    >
                        I’m a Jewelry Store
                    </Button>
                </Grid>
            </Grid>
            <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                sx={{ mt: 4 }}
                disabled={!form.role} // Ensure the button is disabled until a role is selected
            >
                Next
            </Button>
        </Box>
    );
};

export default RoleSelectionStep;
