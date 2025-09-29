/**
 * Ticket Details Step Component
 * Constitutional Architecture: Component Layer - Specialized Form Step
 * Responsibility: Handle ticket details form step
 */

"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    Box, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { INTERNAL_STATUSES } from '@/config/statuses';

export default function TicketDetailsStep({ formData, setFormData, error }) {
    const handleInputChange = (field, value) => {
        if (field.startsWith('clientInfo.')) {
            const clientField = field.split('.')[1];
            setFormData(prev => ({
                ...prev,
                clientInfo: {
                    ...prev.clientInfo,
                    [clientField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <TextField
                fullWidth
                label="Ticket Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                margin="normal"
                required
                error={error && error.includes('Title')}
            />
            
            <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                margin="normal"
                multiline
                rows={3}
                required
                error={error && error.includes('Description')}
            />

            <FormControl fullWidth margin="normal">
                <InputLabel>Ticket Type</InputLabel>
                <Select
                    value={formData.type}
                    label="Ticket Type"
                    onChange={(e) => handleInputChange('type', e.target.value)}
                >
                    <MenuItem value="custom-design">Custom Design</MenuItem>
                    <MenuItem value="repair">Repair</MenuItem>
                    <MenuItem value="consultation">Consultation</MenuItem>
                    <MenuItem value="quote">Quote</MenuItem>
                    <MenuItem value="rush-order">Rush Order</MenuItem>
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
                <InputLabel>Initial Status</InputLabel>
                <Select
                    value={formData.status}
                    label="Initial Status"
                    onChange={(e) => handleInputChange('status', e.target.value)}
                >
                    <MenuItem value={INTERNAL_STATUSES.PENDING}>Pending</MenuItem>
                    <MenuItem value={INTERNAL_STATUSES.IN_CONSULTATION}>In Consultation</MenuItem>
                    <MenuItem value={INTERNAL_STATUSES.SUBMITTED}>Submitted</MenuItem>
                </Select>
            </FormControl>

            <TextField
                fullWidth
                label="Client Name"
                value={formData.clientInfo.name}
                onChange={(e) => handleInputChange('clientInfo.name', e.target.value)}
                margin="normal"
                required
                error={error && error.includes('Client name')}
            />

            <TextField
                fullWidth
                label="Client Email"
                type="email"
                value={formData.clientInfo.email}
                onChange={(e) => handleInputChange('clientInfo.email', e.target.value)}
                margin="normal"
                required
                error={error && error.includes('Client email')}
            />

            <TextField
                fullWidth
                label="Client Phone"
                value={formData.clientInfo.phone}
                onChange={(e) => handleInputChange('clientInfo.phone', e.target.value)}
                margin="normal"
            />
        </Box>
    );
}

TicketDetailsStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
    error: PropTypes.string
};