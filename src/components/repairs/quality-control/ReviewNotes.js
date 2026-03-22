import React from 'react';
import { Paper, Typography, TextField } from '@mui/material';

export default function ReviewNotes({ validationNotes, setValidationNotes }) {
    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Review Notes</Typography>
            <TextField
                fullWidth
                multiline
                rows={4}
                value={validationNotes || ''}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Enter any validation notes..."
            />
        </Paper>
    );
}
