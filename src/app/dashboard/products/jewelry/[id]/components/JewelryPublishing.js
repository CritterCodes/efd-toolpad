import React from 'react';
import {
    Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Button
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

export default function JewelryPublishing({ formData, handleInputChange, handleSave, saving }) {
    return (
        <Card sx={{ mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ color: REPAIRS_UI.textHeader }}>Publishing</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Classification</InputLabel>
                    <Select
                        value={formData.classification} label="Classification"
                        onChange={(e) => handleInputChange('classification', e.target.value)}
                        MenuProps={repairsMenuProps}
                    >
                        <MenuItem value="signature">Signature Design</MenuItem>
                        <MenuItem value="one-of-one">One of One</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Availability</InputLabel>
                    <Select
                        value={formData.availability} label="Availability"
                        onChange={(e) => handleInputChange('availability', e.target.value)}
                        MenuProps={repairsMenuProps}
                    >
                        <MenuItem value="ready-to-ship">Ready to Ship</MenuItem>
                        <MenuItem value="made-to-order">Made to Order</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={formData.status} label="Status"
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        MenuProps={repairsMenuProps}
                    >
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="archived">Archived</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="contained" fullWidth startIcon={<SaveIcon />}
                    onClick={() => handleSave()} disabled={saving}
                    sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardContent>
        </Card>
    );
}
