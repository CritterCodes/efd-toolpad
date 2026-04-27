import React from 'react';
import { TextField, Autocomplete, Box, Typography } from '@mui/material';
import { REPAIR_STATUSES, STATUS_DESCRIPTIONS } from '../constants';

const StatusSelector = ({ value, onChange, options = REPAIR_STATUSES, sx = {} }) => {
    return (
        <Autocomplete
            options={options}
            value={value}
            onChange={onChange}
            getOptionLabel={(option) => option}
            renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                    <Box component="li" key={key} {...otherProps}>
                        <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {option}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {STATUS_DESCRIPTIONS[option]}
                            </Typography>
                        </Box>
                    </Box>
                );
            }}
            renderInput={(params) => (
                <TextField 
                    {...params} 
                    label="Select Destination Status" 
                    fullWidth 
                    helperText={value ? STATUS_DESCRIPTIONS[value] : "Choose where to move the repairs"}
                />
            )}
            sx={sx}
        />
    );
};

export default StatusSelector;
