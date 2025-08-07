"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    TextField,
    FormControl,
    FormLabel,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Autocomplete,
    Chip
} from '@mui/material';
import tasksService from '@/services/tasks.service';

const metalOptions = ["SS", "WG", "YG"];
const goldKarats = ["10k", "14k", "18k"];

export default function RepairDetailsStep({ formData, setFormData }) {
    const [selectedMetal, setSelectedMetal] = React.useState(formData.metalType || "");
    const [karatOptions, setKaratOptions] = React.useState(
        goldKarats.reduce((acc, karat) => ({ ...acc, [karat]: false }), {})
    );

    const handleMetalChange = (metal) => {
        setSelectedMetal(metal);
    
        // Set the formData metalType as a properly formatted object
        if (metal === "YG" || metal === "WG") {
            setFormData(prev => ({
                ...prev,
                metalType: {
                    type: metal,
                    karat: goldKarats[0]  // Defaulting to the first karat option
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                metalType: {
                    type: metal,
                    karat: null  // Resetting karat for non-gold metals
                }
            }));
        }
    
        // Reset the internal karat selection state as well
        setKaratOptions(goldKarats.reduce((acc, karat) => ({ ...acc, [karat]: false }), {}));
    };
    
    
    const handleKaratChange = (karat) => {
        const updatedKaratOptions = Object.fromEntries(
            Object.entries(karatOptions).map(([key]) => [key, key === karat])
        );
        setKaratOptions(updatedKaratOptions);
    
        // Ensure metalType stays an object with both properties
        setFormData(prev => ({
            ...prev,
            metalType: {
                type: selectedMetal, // Keeping type intact
                karat: karat // Updating only the karat
            }
        }));
    };

    return (
        <div>
            {/* ✅ Description */}
            <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
            />

            {/* ✅ Promise Date */}
            {/* ✅ Promise Date */}
            <TextField
                fullWidth
                label="Promise Date"
                type="date"
                value={formData.promiseDate}
                onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })}
                margin="normal"
                InputLabelProps={{
                    shrink: true // ✅ Prevents overlapping of the label
                }}
            />


            {/* ✅ Metal Type Selection */}
            <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">Metal Type</FormLabel>
                <FormGroup>
                    {metalOptions.map((metal) => (
                        <FormControlLabel
                            key={metal}
                            control={
                                <Checkbox
                                    checked={selectedMetal === metal}
                                    onChange={() => handleMetalChange(metal)}
                                />
                            }
                            label={metal}
                        />
                    ))}
                </FormGroup>
            </FormControl>

            {/* ✅ Karat Selection */}
            {(selectedMetal === "WG" || selectedMetal === "YG") && (
                <FormControl component="fieldset" margin="normal">
                    <FormLabel component="legend">Karat</FormLabel>
                    <FormGroup>
                        {goldKarats.map((karat) => (
                            <FormControlLabel
                                key={karat}
                                control={
                                    <Checkbox
                                        checked={karatOptions[karat]}
                                        onChange={() => handleKaratChange(karat)}
                                    />
                                }
                                label={karat}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            )}
        </div>
    );
}

RepairDetailsStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
};
