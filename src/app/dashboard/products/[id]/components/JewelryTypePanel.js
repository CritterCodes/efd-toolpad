'use client';

import React from 'react';
import { Card, CardContent, Typography, Grid, TextField } from '@mui/material';
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

export default function JewelryTypePanel({ form, onChange }) {
    return (
        <Card sx={cardSx}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 2 }}>
                    Jewelry Details
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Category" size="small" value={form.jewelryCategory} onChange={(e) => onChange('jewelryCategory', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Size" size="small" value={form.size} onChange={(e) => onChange('size', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Metal" size="small" value={form.metalType} onChange={(e) => onChange('metalType', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Karat" size="small" value={form.karat} onChange={(e) => onChange('karat', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Metal weight (g)" size="small" type="number" value={form.metalWeight} onChange={(e) => onChange('metalWeight', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Findings" size="small" value={form.findings} onChange={(e) => onChange('findings', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Hallmark" size="small" value={form.hallmark} onChange={(e) => onChange('hallmark', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Linked gemstones"
                            size="small"
                            placeholder="Gemstone IDs, comma-separated"
                            value={form.linkedGemstones}
                            onChange={(e) => onChange('linkedGemstones', e.target.value)}
                            sx={inputSx}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
