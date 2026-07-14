'use client';

import React, { useRef, useState } from 'react';
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

export default function GemstoneTypePanel({ form, onChange, productId }) {
    const certificateRef = useRef(null);
    const [certificateBusy, setCertificateBusy] = useState(false);
    const [certificateError, setCertificateError] = useState('');
    const isNew = !productId || productId === 'new';

    const uploadCertificate = async (file) => {
        if (!file || isNew) return;
        setCertificateBusy(true);
        setCertificateError('');
        try {
            const body = new FormData();
            body.append('file', file);
            const response = await fetch(`/api/products/${productId}/certificate`, { method: 'POST', body });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'Certificate upload failed');
            onChange('certFile', result.url || '');
        } catch (error) {
            setCertificateError(error.message);
        } finally {
            setCertificateBusy(false);
            if (certificateRef.current) certificateRef.current.value = '';
        }
    };

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
                                variant="outlined"
                                size="small"
                                startIcon={<UploadFileIcon />}
                                disabled={certificateBusy || isNew}
                                onClick={() => certificateRef.current?.click()}
                                sx={{
                                    borderColor: REPAIRS_UI.border,
                                    color: form.certFile ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary,
                                    '&:hover': { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent },
                                }}
                            >
                                {certificateBusy ? 'Uploading...' : form.certFile ? 'Replace certificate' : 'Upload certificate'}
                                <input
                                    ref={certificateRef}
                                    type="file"
                                    hidden
                                    accept=".pdf,image/jpeg,image/png,image/webp"
                                    onChange={(e) => uploadCertificate(e.target.files?.[0])}
                                />
                            </Button>
                            {isNew && (
                                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.75rem', mt: 0.75 }}>
                                    Save the product before uploading its certificate.
                                </Typography>
                            )}
                            {form.certFile && !certificateError && (
                                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.75rem', mt: 0.75 }}>
                                    Certificate attached
                                </Typography>
                            )}
                            {certificateError && (
                                <Typography sx={{ color: '#EF5350', fontSize: '0.75rem', mt: 0.75 }}>
                                    {certificateError}
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
