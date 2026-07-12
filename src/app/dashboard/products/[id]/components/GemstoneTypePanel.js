'use client';

import React from 'react';
import { Card, CardContent, Typography, Grid, TextField, Button, Box } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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

export default function GemstoneTypePanel({ form, onChange }) {
    return (
        <Card sx={cardSx}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 2 }}>
                    Gemstone Details
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth required label="Species" size="small" value={form.species} onChange={(e) => onChange('species', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Variety" size="small" value={form.variety} onChange={(e) => onChange('variety', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Cut" size="small" value={form.cut} onChange={(e) => onChange('cut', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Dimensions" size="small" placeholder="6.5 × 4.2 mm" value={form.dimensions} onChange={(e) => onChange('dimensions', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Carat" size="small" type="number" value={form.carat} onChange={(e) => onChange('carat', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Color" size="small" value={form.color} onChange={(e) => onChange('color', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Clarity" size="small" value={form.clarity} onChange={(e) => onChange('clarity', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Origin" size="small" value={form.origin} onChange={(e) => onChange('origin', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Treatment" size="small" value={form.treatment} onChange={(e) => onChange('treatment', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Cert #" size="small" value={form.certNumber} onChange={(e) => onChange('certNumber', e.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid item xs={12}>
                        <Box>
                            <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.75 }}>
                                Certificate File
                            </Typography>
                            <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<UploadFileIcon />}
                                sx={{
                                    borderColor: REPAIRS_UI.border,
                                    color: form.certFile ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary,
                                    '&:hover': { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent },
                                }}
                            >
                                {form.certFile ? form.certFile : 'Upload cert'}
                                <input
                                    type="file"
                                    hidden
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => onChange('certFile', e.target.files[0]?.name || '')}
                                />
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
