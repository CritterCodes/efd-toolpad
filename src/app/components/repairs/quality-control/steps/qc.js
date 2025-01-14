import React from 'react';
import { Typography, Box, FormControlLabel, Checkbox, TextField, Button } from "@mui/material";

const QCChecklistStep = ({ checklist, handleChecklistChange, notes, setNotes, handleSendToOven }) => {
    return (
        <>
            <Typography sx={{ mt: 2 }}>Perform the following checks:</Typography>
            <Box sx={{ mt: 2 }}>
                <FormControlLabel
                    control={<Checkbox name="cleanAndPolish" checked={checklist.cleanAndPolish} onChange={handleChecklistChange} />}
                    label="Clean and Polish Completed"
                />
                <FormControlLabel
                    control={<Checkbox name="allRepairTasks" checked={checklist.allRepairTasks} onChange={handleChecklistChange} />}
                    label="All Repair Tasks Completed"
                />
                <FormControlLabel
                    control={<Checkbox name="stonesTightened" checked={checklist.stonesTightened} onChange={handleChecklistChange} />}
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
            <Button variant="outlined" color="error" sx={{ mt: 2 }} onClick={handleSendToOven}>
                Send to the Oven
            </Button>
        </>
    );
};

export default QCChecklistStep;
