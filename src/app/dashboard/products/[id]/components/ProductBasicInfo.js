'use client';

import React from 'react';
import { Card, CardContent, Typography, Box, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const cardSx = {
    mb: 3,
    backgroundColor: REPAIRS_UI.bgPanel,
    backgroundImage: 'none',
    border: `1px solid ${REPAIRS_UI.border}`,
    borderRadius: 2,
    boxShadow: 'none',
};

const inputSx = {
    '& .MuiOutlinedInput-root': { backgroundColor: REPAIRS_UI.bgTertiary },
    '& .MuiInputLabel-root': { color: REPAIRS_UI.textSecondary },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
    '& .MuiInputBase-input': { color: REPAIRS_UI.textPrimary },
};

export default function ProductBasicInfo({ form, onChange }) {
    return (
        <Card sx={cardSx}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 2 }}>
                    Basic Info
                </Typography>

                <TextField
                    fullWidth
                    required
                    label="Title"
                    size="small"
                    value={form.title}
                    onChange={(e) => onChange('title', e.target.value)}
                    sx={{ ...inputSx, mb: 2 }}
                />

                <TextField
                    fullWidth
                    label="Description"
                    size="small"
                    multiline
                    minRows={4}
                    value={form.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    sx={{ ...inputSx, mb: 2 }}
                />

                <TextField
                    fullWidth
                    label="SKU"
                    size="small"
                    value={form.sku}
                    onChange={(e) => onChange('sku', e.target.value)}
                    sx={{ ...inputSx, mb: 2.5 }}
                />

                <Box>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 1 }}>
                        Product Type
                    </Typography>
                    <ToggleButtonGroup
                        value={form.productType}
                        exclusive
                        fullWidth
                        onChange={(_, val) => { if (val) onChange('productType', val); }}
                        sx={{ '& .MuiToggleButtonGroup-grouped': { border: `1px solid ${REPAIRS_UI.border}` } }}
                    >
                        <ToggleButton
                            value="gemstone"
                            sx={{
                                color: REPAIRS_UI.textSecondary,
                                '&.Mui-selected': {
                                    backgroundColor: REPAIRS_UI.bgTertiary,
                                    color: REPAIRS_UI.accent,
                                    borderColor: REPAIRS_UI.accent,
                                },
                                '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary },
                            }}
                        >
                            Gemstone
                        </ToggleButton>
                        <ToggleButton
                            value="jewelry"
                            sx={{
                                color: REPAIRS_UI.textSecondary,
                                '&.Mui-selected': {
                                    backgroundColor: REPAIRS_UI.bgTertiary,
                                    color: REPAIRS_UI.accent,
                                    borderColor: REPAIRS_UI.accent,
                                },
                                '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary },
                            }}
                        >
                            Jewelry
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </CardContent>
        </Card>
    );
}
