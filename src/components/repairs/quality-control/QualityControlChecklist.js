import React from 'react';
import { Paper, Typography, FormGroup, FormControlLabel, Checkbox, Divider } from '@mui/material';

export default function QualityControlChecklist({ checklist = {}, handleValidationChange }) {
    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Quality Control Checklist</Typography>
            <Divider sx={{ mb: 2 }} />
            <FormGroup>
                {Object.keys(checklist).map(key => (
                    <FormControlLabel
                        key={key}
                        control={<Checkbox checked={checklist[key]} onChange={(e) => handleValidationChange(key, e.target.checked)} />}
                        label={key}
                    />
                ))}
            </FormGroup>
        </Paper>
    );
}
