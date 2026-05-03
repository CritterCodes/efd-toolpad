import React from 'react';
import {
    Grid, TextField, FormControl, InputLabel, Select, MenuItem,
    FormControlLabel, Switch, Divider, Typography, Paper
} from '@mui/material';

export default function JewelryBasicInfo({ formData, handleInputChange }) {
    return (
        <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom>Product Details</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth label="Title" value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={formData.type} label="Type"
                            onChange={(e) => handleInputChange('type', e.target.value)}
                        >
                            {['Ring', 'Pendant', 'Bracelet', 'Earrings', 'Other'].map(t => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Price" type="number" 
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
                    />
                </Grid>

                {formData.type === 'Ring' && (
                    <>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Ring Specifics</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Current Size" value={formData.ringSize}
                                onChange={(e) => handleInputChange('ringSize', e.target.value)}
                                placeholder="e.g. 6.5"
                            />
                        </Grid>
                        <Grid item xs={12} sm={8} sx={{ display: 'flex', alignItems: 'center', minHeight: { sm: 56 } }}>
                            <FormControlLabel
                                control={<Switch checked={formData.canBeSized} onChange={(e) => handleInputChange('canBeSized', e.target.checked)} />}
                                label="Can be sized?"
                            />
                        </Grid>
                        {formData.canBeSized && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Sizing Range (Up)" type="number"
                                        value={formData.sizingRangeUp}
                                        onChange={(e) => handleInputChange('sizingRangeUp', e.target.value)}
                                        InputProps={{ endAdornment: <Typography variant="caption">sizes</Typography> }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Sizing Range (Down)" type="number"
                                        value={formData.sizingRangeDown}
                                        onChange={(e) => handleInputChange('sizingRangeDown', e.target.value)}
                                        InputProps={{ endAdornment: <Typography variant="caption">sizes</Typography> }}
                                    />
                                </Grid>
                            </>
                        )}
                    </>
                )}

                {formData.type === 'Pendant' && (
                    <>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Pendant Specifics</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={formData.chainIncluded} onChange={(e) => handleInputChange('chainIncluded', e.target.checked)} />}
                                label="Chain Included?"
                            />
                        </Grid>
                        {formData.chainIncluded && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label="Chain Length" value={formData.chainLength} onChange={(e) => handleInputChange('chainLength', e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label="Chain Material" value={formData.chainMaterial} onChange={(e) => handleInputChange('chainMaterial', e.target.value)} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label="Chain Style" value={formData.chainStyle} onChange={(e) => handleInputChange('chainStyle', e.target.value)} />
                                </Grid>
                            </>
                        )}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Dimensions" value={formData.dimensions} onChange={(e) => handleInputChange('dimensions', e.target.value)} />
                        </Grid>
                    </>
                )}

                {formData.type === 'Bracelet' && (
                    <>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Bracelet Specifics</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Length" value={formData.length} onChange={(e) => handleInputChange('length', e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Clasp Type" value={formData.claspType} onChange={(e) => handleInputChange('claspType', e.target.value)} />
                        </Grid>
                    </>
                )}

                {(formData.type === 'Other' || formData.type === 'Earrings') && (
                    <>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Details</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Dimensions / Size Description" value={formData.dimensions} onChange={(e) => handleInputChange('dimensions', e.target.value)} />
                        </Grid>
                    </>
                )}

                <Grid item xs={12}>
                    <TextField
                        fullWidth multiline rows={4} label="Notes (Internal)"
                        value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)}
                    />
                </Grid>
            </Grid>
        </Paper>
    );
}
