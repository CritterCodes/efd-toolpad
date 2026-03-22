import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
export default function RepairDetailsSection({ formData, errors, handleInputChange }) { 
    return (
        <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Customer Name"
                                        value={formData.customerName}
                                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                                        error={!!errors.customerName}
                                        helperText={errors.customerName}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Phone Number"
                                        value={formData.customerPhone}
                                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                                        error={!!errors.customerPhone}
                                        helperText={errors.customerPhone}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        value={formData.customerEmail}
                                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                                        error={!!errors.customerEmail}
                                        helperText={errors.customerEmail}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Item & Repair Details */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader 
                            title="Repair Details" 
                            sx={{ pb: 1 }}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required error={!!errors.itemType}>
                                        <InputLabel>Item Type</InputLabel>
                                        <Select
                                            value={formData.itemType}
                                            onChange={(e) => handleInputChange('itemType', e.target.value)}
                                            label="Item Type"
                                        >
                                            {ITEM_TYPES.map(type => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required error={!!errors.repairType}>
                                        <InputLabel>Repair Type</InputLabel>
                                        <Select
                                            value={formData.repairType}
                                            onChange={(e) => handleInputChange('repairType', e.target.value)}
                                            label="Repair Type"
                                        >
                                            {REPAIR_TYPES.map(type => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        required
                                        multiline
                                        rows={3}
                                        label="Repair Description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        error={!!errors.description}
                                        helperText={errors.description || 'Describe the specific repair needed'}
                                        placeholder="Example: Resize ring from size 7 to size 8..."
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="Special Instructions"
                                        value={formData.specialInstructions}
                                        onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                                        placeholder="Any special requests, rush orders, or important notes..."
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Promise Date"
                                        type="date"
                                        value={formData.promiseDate}
                                        onChange={(e) => handleInputChange('promiseDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        helperText="When customer expects completion"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Photos */}
                    <Card>
                        <CardHeader 
                            title="Photos" 
                            sx={{ pb: 1 }}
                            action={
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<PhotoCameraIcon />}
                                    size="small"
                                >
                                    Add Photo
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                    />
                                </Button>
                            }
                        />
                        <CardContent>
                            {photoError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {photoError}
                                </Alert>
                            )}
                            
                            {formData.photos.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                    No photos added yet. Photos help ensure accurate repairs.
                                </Typography>
                            ) : (
                                <Grid container spacing={2}>
                                    {formData.photos.map((photo) => (
                                        <Grid item xs={6} sm={4} md={3} key={photo.id}>
                                            <Box sx={{ position: 'relative' }}>
                                                <Avatar
                                                    src={photo.data}
                                                    sx={{ 
                                                        width: '100%', 
                                                        height: 120, 
                                                        borderRadius: 1,
                                                        mb: 1
                                                    }}
                                                    variant="rounded"
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removePhoto(photo.id)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        bgcolor: 'background.paper',
                                                        '&:hover': { bgcolor: 'error.light', color: 'white' }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                                                    {photo.name}
                                                </Typography>
                                            
    );
}
