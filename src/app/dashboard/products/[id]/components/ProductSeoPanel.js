'use client';

import React from 'react';
import { Card, CardContent, Typography, TextField } from '@mui/material';
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
    '& .MuiFormHelperText-root': { color: REPAIRS_UI.textMuted },
};

export default function ProductSeoPanel({ form, onChange }) {
    const metaTitleLen = (form.metaTitle || '').length;
    const metaDescLen = (form.metaDescription || '').length;

    return (
        <Card sx={cardSx}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 2 }}>
                    SEO
                </Typography>

                <TextField
                    fullWidth
                    label="URL handle"
                    size="small"
                    value={form.handle}
                    onChange={(e) => onChange('handle', e.target.value)}
                    helperText="e.g. blue-sapphire-ring"
                    sx={{ ...inputSx, mb: 2 }}
                />

                <TextField
                    fullWidth
                    label="Meta title"
                    size="small"
                    value={form.metaTitle}
                    onChange={(e) => onChange('metaTitle', e.target.value)}
                    inputProps={{ maxLength: 70 }}
                    helperText={`${metaTitleLen}/70`}
                    sx={{ ...inputSx, mb: 2 }}
                />

                <TextField
                    fullWidth
                    label="Meta description"
                    size="small"
                    multiline
                    minRows={2}
                    value={form.metaDescription}
                    onChange={(e) => onChange('metaDescription', e.target.value)}
                    inputProps={{ maxLength: 160 }}
                    helperText={`${metaDescLen}/160`}
                    sx={{ ...inputSx, mb: 2 }}
                />

                <TextField
                    fullWidth
                    label="Tags"
                    size="small"
                    placeholder="comma-separated, e.g. sapphire, gemstone"
                    value={form.tags}
                    onChange={(e) => onChange('tags', e.target.value)}
                    sx={inputSx}
                />
            </CardContent>
        </Card>
    );
}
