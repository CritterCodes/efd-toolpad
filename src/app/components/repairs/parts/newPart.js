"use client";
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

const AddPartModal = ({ open, onClose, onSave, repairID, initialPart }) => {
    const [partData, setPartData] = useState({
        partName: '',
        sku: '',
        quantity: 1,
        price: 0,  // ✅ Added price field
        cost: 0,   // ✅ Added cost field
        dateOrdered: ''
    });

    // ✅ Prefill data for editing if initialPart is provided
    useEffect(() => {
        if (initialPart) {
            setPartData(initialPart);
        } else {
            setPartData({
                partName: '',
                sku: '',
                quantity: 1,
                price: 0,
                cost: 0,
                dateOrdered: ''
            });
        }
    }, [initialPart, open]);

    // ✅ Handle form changes
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setPartData(prevState => ({ ...prevState, [name]: value }));
    };

    // ✅ Save and validate data
    const handleSave = () => {
        if (!partData.partName || !partData.sku || partData.quantity < 1 || partData.price <= 0 || partData.cost <= 0) {
            alert('Please fill in all required fields and ensure values are valid.');
            return;
        }
        onSave(repairID, partData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {initialPart ? `Edit Part for Repair: ${repairID}` : `Add Part for Repair: ${repairID}`}
            </DialogTitle>
            <DialogContent>
                {/* ✅ Part Name */}
                <TextField
                    fullWidth
                    margin="dense"
                    label="Part Name"
                    name="partName"
                    value={partData.partName}
                    onChange={handleInputChange}
                    required
                />

                {/* ✅ SKU */}
                <TextField
                    fullWidth
                    margin="dense"
                    label="SKU"
                    name="sku"
                    value={partData.sku}
                    onChange={handleInputChange}
                    required
                />

                {/* ✅ Quantity */}
                <TextField
                    fullWidth
                    margin="dense"
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={partData.quantity}
                    onChange={handleInputChange}
                    required
                />

                {/* ✅ Price */}
                <TextField
                    fullWidth
                    margin="dense"
                    label="Price"
                    name="price"
                    type="number"
                    value={partData.price}
                    onChange={handleInputChange}
                    required
                />

                {/* ✅ Cost */}
                <TextField
                    fullWidth
                    margin="dense"
                    label="Cost"
                    name="cost"
                    type="number"
                    value={partData.cost}
                    onChange={handleInputChange}
                    required
                />
            </DialogContent>

            {/* ✅ Action Buttons */}
            <DialogActions>
                <Button onClick={onClose} color="error">Cancel</Button>
                <Button onClick={handleSave} color="primary" variant="contained">
                    {initialPart ? "Update Part" : "Add Part"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddPartModal;
