import { Card, CardContent, Typography, Grid, TextField, Autocomplete, Chip } from '@mui/material';

const specialtiesSuggestions = [
    'Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Brooches', 'Pendants',
    'Custom Designs', 'Vintage Restoration', 'Stone Setting', 'Engraving',
    'Chain Making', 'Enameling'
];

const servicesSuggestions = [
    'Custom Design', 'Jewelry Repair', 'Stone Setting', 'Engraving',
    'Resizing', 'Restoration', 'Appraisal', 'Consultation',
    'Education/Classes', 'Stone Cutting', 'Metal Fabrication'
];

const materialsSuggestions = [
    'Gold', 'Silver', 'Platinum', 'Palladium', 'Copper', 'Brass',
    'Precious Stones', 'Semi-Precious Stones', 'Pearls', 'Alternative Materials'
];

const techniquesSuggestions = [
    'Hand Fabrication', 'Lost Wax Casting', 'Stone Setting', 'Engraving',
    'Enameling', 'Granulation', 'Filigree', 'Repoussé', 'Chain Making',
    'Wire Wrapping', 'Electroforming', 'CAD/CAM'
];

export default function SpecialtiesServicesSection({ profileData, handleInputChange }) {
    return (
        <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom>
                    Specialties & Services
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            multiple
                            options={specialtiesSuggestions}
                            value={profileData.specialties}
                            onChange={(event, newValue) => handleInputChange('specialties', newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip key={index} variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Specialties" placeholder="Select or type your specialties..." size="small" />
                            )}
                            freeSolo
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            multiple
                            options={servicesSuggestions}
                            value={profileData.services}
                            onChange={(event, newValue) => handleInputChange('services', newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip key={index} variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Services Offered" placeholder="Select or type your services..." size="small" />
                            )}
                            freeSolo
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            multiple
                            options={materialsSuggestions}
                            value={profileData.materials}
                            onChange={(event, newValue) => handleInputChange('materials', newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip key={index} variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Materials You Work With" placeholder="Select or type materials..." size="small" />
                            )}
                            freeSolo
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            multiple
                            options={techniquesSuggestions}
                            value={profileData.techniques}
                            onChange={(event, newValue) => handleInputChange('techniques', newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip key={index} variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Techniques" placeholder="Select or type techniques..." size="small" />
                            )}
                            freeSolo
                            size="small"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}