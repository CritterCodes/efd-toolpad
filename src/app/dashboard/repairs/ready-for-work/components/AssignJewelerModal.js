import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Chip,
    Alert
} from '@mui/material';
import { JEWELER_ASSIGNMENTS } from '../constants';

const AssignJewelerModal = ({ 
    open, 
    onClose, 
    onSave, 
    repairID, 
    selectedRepairs = [], 
    isBulkMode = false 
}) => {
    const [selectedJeweler, setSelectedJeweler] = useState('');

    const handleSave = () => {
        if (!selectedJeweler) return;

        if (isBulkMode) {
            onSave(Array.from(selectedRepairs), selectedJeweler);
        } else {
            onSave([repairID], selectedJeweler);
        }

        handleClose();
    };

    const handleClose = () => {
        setSelectedJeweler('');
        onClose();
    };

    const repairCount = isBulkMode ? selectedRepairs.length : 1;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Assign Jeweler
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    {isBulkMode ? (
                        <Alert severity="info">
                            <Typography variant="body2">
                                Assigning jeweler to <strong>{repairCount} selected repair{repairCount > 1 ? 's' : ''}</strong>
                            </Typography>
                        </Alert>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Select a jeweler to assign to repair: <strong>{repairID}</strong>
                        </Typography>
                    )}
                </Box>

                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Select Jeweler</InputLabel>
                    <Select
                        value={selectedJeweler}
                        onChange={(e) => setSelectedJeweler(e.target.value)}
                        label="Select Jeweler"
                    >
                        {JEWELER_ASSIGNMENTS.map((jeweler) => (
                            <MenuItem key={jeweler} value={jeweler}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {jeweler === 'Unassigned' ? (
                                        <Chip label={jeweler} size="small" color="default" />
                                    ) : (
                                        <Chip label={jeweler} size="small" color="primary" />
                                    )}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedJeweler && selectedJeweler !== 'Unassigned' && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            {repairCount} repair{repairCount > 1 ? 's' : ''} will be assigned to <strong>{selectedJeweler}</strong>
                        </Typography>
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained"
                    disabled={!selectedJeweler}
                >
                    Assign {repairCount > 1 ? `${repairCount} Repairs` : 'Repair'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignJewelerModal;
