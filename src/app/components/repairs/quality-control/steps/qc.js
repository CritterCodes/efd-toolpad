import React from 'react';
import { Typography, Box, FormControlLabel, Checkbox, TextField, Button } from "@mui/material";

/**
 * QC Checklist Step Component
 * Modernized with a mobile-first design and better spacing.
 */
const QCChecklistStep = ({ checklist, handleChecklistChange, notes, setNotes, handleSendToOven }) => {
    return (
        <Box
            sx={{
                padding: "16px",
            }}
        >
            {/* ✅ Title Section */}
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, textAlign: "center" }}>
                Quality Control Checklist
            </Typography>

            {/* ✅ Checklist Items */}
            <Box 
                sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    mb: 2
                }}
            >
                <FormControlLabel
                    control={<Checkbox name="cleanAndPolish" checked={checklist.cleanAndPolish} onChange={handleChecklistChange} />}
                    label="✅ Clean and Polish Completed"
                />
                <FormControlLabel
                    control={<Checkbox name="allRepairTasks" checked={checklist.allRepairTasks} onChange={handleChecklistChange} />}
                    label="✅ All Repair Tasks Completed"
                />
                <FormControlLabel
                    control={<Checkbox name="stonesTightened" checked={checklist.stonesTightened} onChange={handleChecklistChange} />}
                    label="✅ Stones Tightened"
                />
            </Box>

            {/* ✅ Notes Section */}
            <TextField
                fullWidth
                multiline
                rows={4}
                label="Additional Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{
                    mt: 2,
                    borderRadius: "8px",
                    '& .MuiInputBase-root': {
                        borderRadius: "8px"
                    }
                }}
            />

            {/* ✅ Send to Oven Button */}
            <Button
                variant="contained"
                color="error"
                onClick={handleSendToOven}
                sx={{
                    mt: 3,
                    padding: "12px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    textTransform: "none",
                    width: "100%",
                    boxShadow: "0 2px 8px rgba(255,0,0,0.3)"
                }}
            >
                🔥 Send to the Oven
            </Button>
        </Box>
    );
};

export default QCChecklistStep;
