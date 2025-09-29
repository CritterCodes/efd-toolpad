/**
 * Financial Info Step Component
 * Constitutional Architecture: Component Layer - Specialized Form Step
 * Responsibility: Handle financial information form step
 */

"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    Box, TextField, FormControlLabel, Switch, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

export default function FinancialInfoStep({ formData, setFormData, error }) {
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const calculateTotalCost = () => {
        return (formData.materialsCost || 0) + (formData.laborCost || 0);
    };

    return (
        <Box sx={{ mt: 2 }}>
            <TextField
                fullWidth
                label="Labor Hours"
                type="number"
                value={formData.laborHours}
                onChange={(e) => handleInputChange('laborHours', parseFloat(e.target.value) || 0)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
            />

            <TextField
                fullWidth
                label="Materials Cost ($)"
                type="number"
                value={formData.materialsCost}
                onChange={(e) => handleInputChange('materialsCost', parseFloat(e.target.value) || 0)}
                margin="normal"
                inputProps={{ min: 0, step: 0.01 }}
                error={error && error.includes('Materials cost')}
            />

            <TextField
                fullWidth
                label="Labor Cost ($)"
                type="number"
                value={formData.laborCost}
                onChange={(e) => handleInputChange('laborCost', parseFloat(e.target.value) || 0)}
                margin="normal"
                inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
                fullWidth
                label="Total Cost ($)"
                value={calculateTotalCost().toFixed(2)}
                margin="normal"
                disabled
                helperText="Automatically calculated from materials and labor costs"
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={formData.paymentReceived}
                        onChange={(e) => handleInputChange('paymentReceived', e.target.checked)}
                    />
                }
                label="Payment Received"
                sx={{ mt: 2 }}
            />

            <FormControl fullWidth margin="normal">
                <InputLabel>Card Payment Status</InputLabel>
                <Select
                    value={formData.cardPaymentStatus}
                    label="Card Payment Status"
                    onChange={(e) => handleInputChange('cardPaymentStatus', e.target.value)}
                >
                    <MenuItem value="unpaid">Unpaid</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="refunded">Refunded</MenuItem>
                    <MenuItem value="disputed">Disputed</MenuItem>
                </Select>
            </FormControl>

            {formData.paymentReceived && (
                <TextField
                    fullWidth
                    label="Payment Amount ($)"
                    type="number"
                    value={formData.paymentAmount || ''}
                    onChange={(e) => handleInputChange('paymentAmount', parseFloat(e.target.value) || 0)}
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Amount actually received"
                />
            )}

            <TextField
                fullWidth
                label="Payment Notes"
                value={formData.paymentNotes || ''}
                onChange={(e) => handleInputChange('paymentNotes', e.target.value)}
                margin="normal"
                multiline
                rows={2}
                helperText="Optional notes about payment or billing"
            />
        </Box>
    );
}

FinancialInfoStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
    error: PropTypes.string
};