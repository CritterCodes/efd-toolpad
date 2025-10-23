/**
 * Gemstone Creation Form Component
 * Allows gem cutters to add new gemstones to their inventory
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Chip,
  Alert,
  InputAdornment,
  Divider,
  Paper
} from '@mui/material';
import {
  Diamond,
  PhotoCamera,
  Save,
  Preview,
  Add,
  Delete
} from '@mui/icons-material';

export function GemstonCreationForm({ onSubmit, onCancel, initialData = null }) {
  const [formData, setFormData] = useState({
    // Basic information
    title: '',
    quantity: 1,
    price: '',
    description: '',
    
    // Gemstone physical properties
    weight: '', // carats
    dimensions: {
      length: '', // mm
      width: '',  // mm
      depth: ''   // mm
    },
    
    // Classification
    shape: '',
    cut: '',
    species: '',
    subspecies: '',
    
    // Origin and characteristics
    origin: '',
    locale: '',
    color: '',
    clarity: '',
    
    // Treatment and type
    isLabGrown: false,
    isNatural: true,
    treatments: [],
    treatmentDetails: '',
    
    // Certification
    hasCertificate: false,
    certificateType: '',
    certificateNumber: '',
    
    // Quality and additional properties
    quality: '',
    rarity: 'common',
    fluorescence: 'none',
    
    // Mounting requirements
    mountingRequired: false,
    mountingType: '', // 'custom', 'stuller', 'optional'
    mountingNotes: '',
    
    // Images
    images: [],
    
    // Tags for searchability
    tags: []
  });

  const [gemstoneOptions, setGemstoneOptions] = useState({
    shapes: [],
    species: [],
    subspecies: {},
    treatments: [],
    origins: [],
    clarityGrades: []
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load gemstone options on component mount
  useEffect(() => {
    fetchGemstoneOptions();
  }, []);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dimensions: initialData.gemstoneData?.dimensions || { length: '', width: '', depth: '' },
        weight: initialData.gemstoneData?.weight || '',
        shape: initialData.gemstoneData?.shape || '',
        cut: initialData.gemstoneData?.cut || '',
        species: initialData.gemstoneData?.species || '',
        subspecies: initialData.gemstoneData?.subspecies || '',
        origin: initialData.gemstoneData?.origin || '',
        locale: initialData.gemstoneData?.locale || '',
        color: initialData.gemstoneData?.color || '',
        clarity: initialData.gemstoneData?.clarity || '',
        isLabGrown: initialData.gemstoneData?.isLabGrown || false,
        isNatural: initialData.gemstoneData?.isNatural !== false,
        treatments: initialData.gemstoneData?.treatments || [],
        treatmentDetails: initialData.gemstoneData?.treatmentDetails || '',
        hasCertificate: initialData.gemstoneData?.hasCertificate || false,
        certificateType: initialData.gemstoneData?.certificateType || '',
        certificateNumber: initialData.gemstoneData?.certificateNumber || '',
        quality: initialData.gemstoneData?.quality || '',
        rarity: initialData.gemstoneData?.rarity || 'common',
        fluorescence: initialData.gemstoneData?.fluorescence || 'none',
        mountingRequired: initialData.mountingRequired || false,
        mountingType: initialData.mountingType || '',
        mountingNotes: initialData.mountingNotes || ''
      });
    }
  }, [initialData]);

  const fetchGemstoneOptions = async () => {
    try {
      const response = await fetch('/api/products?action=gemstone-options');
      const data = await response.json();
      
      if (data.success) {
        setGemstoneOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching gemstone options:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested fields like dimensions.length
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTreatmentChange = (treatment, isChecked) => {
    const updatedTreatments = isChecked
      ? [...formData.treatments, treatment]
      : formData.treatments.filter(t => t !== treatment);
    
    setFormData(prev => ({ ...prev, treatments: updatedTreatments }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.weight || parseFloat(formData.weight) <= 0) newErrors.weight = 'Weight must be greater than 0';
    if (!formData.shape) newErrors.shape = 'Shape is required';
    if (!formData.species) newErrors.species = 'Species is required';
    if (!formData.color.trim()) newErrors.color = 'Color is required';
    if (!formData.price || parseFloat(formData.price) < 0) newErrors.price = 'Valid price is required';
    
    // Dimension validations
    if (formData.dimensions.length && parseFloat(formData.dimensions.length) <= 0) {
      newErrors['dimensions.length'] = 'Length must be greater than 0';
    }
    if (formData.dimensions.width && parseFloat(formData.dimensions.width) <= 0) {
      newErrors['dimensions.width'] = 'Width must be greater than 0';
    }
    if (formData.dimensions.depth && parseFloat(formData.dimensions.depth) <= 0) {
      newErrors['dimensions.depth'] = 'Depth must be greater than 0';
    }
    
    // Certificate validation
    if (formData.hasCertificate && !formData.certificateType) {
      newErrors.certificateType = 'Certificate type is required when certificate is indicated';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Prepare submission data
      const submissionData = {
        type: 'gemstone',
        title: formData.title,
        description: formData.description,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        mountingRequired: formData.mountingRequired,
        mountingType: formData.mountingType,
        mountingNotes: formData.mountingNotes,
        tags: formData.tags,
        images: formData.images,
        
        gemstoneData: {
          weight: parseFloat(formData.weight),
          dimensions: {
            length: parseFloat(formData.dimensions.length) || 0,
            width: parseFloat(formData.dimensions.width) || 0,
            depth: parseFloat(formData.dimensions.depth) || 0
          },
          shape: formData.shape,
          cut: formData.cut,
          species: formData.species,
          subspecies: formData.subspecies,
          origin: formData.origin,
          locale: formData.locale,
          color: formData.color,
          clarity: formData.clarity,
          isLabGrown: formData.isLabGrown,
          isNatural: formData.isNatural,
          treatments: formData.treatments,
          treatmentDetails: formData.treatmentDetails,
          hasCertificate: formData.hasCertificate,
          certificateType: formData.certificateType,
          certificateNumber: formData.certificateNumber,
          quality: formData.quality,
          rarity: formData.rarity,
          fluorescence: formData.fluorescence
        }
      };
      
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting gemstone:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Diamond sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5" component="h2">
            {initialData ? 'Edit Gemstone' : 'Add New Gemstone'}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Title *"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title || 'Descriptive title for your gemstone listing'}
                    placeholder="e.g., Natural Burma Ruby - 2.5ct Oval"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Quantity *"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Price *"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    error={!!errors.price}
                    helperText={errors.price}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed description of the gemstone, including any special characteristics..."
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Physical Properties */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Physical Properties</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Weight (Carats) *"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    error={!!errors.weight}
                    helperText={errors.weight}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Length (mm)"
                    type="number"
                    value={formData.dimensions.length}
                    onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
                    error={!!errors['dimensions.length']}
                    helperText={errors['dimensions.length']}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Width (mm)"
                    type="number"
                    value={formData.dimensions.width}
                    onChange={(e) => handleInputChange('dimensions.width', e.target.value)}
                    error={!!errors['dimensions.width']}
                    helperText={errors['dimensions.width']}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Depth (mm)"
                    type="number"
                    value={formData.dimensions.depth}
                    onChange={(e) => handleInputChange('dimensions.depth', e.target.value)}
                    error={!!errors['dimensions.depth']}
                    helperText={errors['dimensions.depth']}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Classification */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Classification</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth error={!!errors.shape}>
                    <InputLabel>Shape *</InputLabel>
                    <Select
                      value={formData.shape}
                      onChange={(e) => handleInputChange('shape', e.target.value)}
                      label="Shape *"
                    >
                      {gemstoneOptions.shapes.map(shape => (
                        <MenuItem key={shape} value={shape}>{shape}</MenuItem>
                      ))}
                    </Select>
                    {errors.shape && <Typography variant="caption" color="error">{errors.shape}</Typography>}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Cut Style"
                    value={formData.cut}
                    onChange={(e) => handleInputChange('cut', e.target.value)}
                    placeholder="e.g., Brilliant, Portuguese, Emerald Cut"
                    helperText="Specific cutting style/pattern name"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Clarity</InputLabel>
                    <Select
                      value={formData.clarity}
                      onChange={(e) => handleInputChange('clarity', e.target.value)}
                      label="Clarity"
                    >
                      {gemstoneOptions.clarityGrades?.map(grade => (
                        <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.species}>
                    <InputLabel>Species *</InputLabel>
                    <Select
                      value={formData.species}
                      onChange={(e) => {
                        handleInputChange('species', e.target.value);
                        handleInputChange('subspecies', ''); // Reset subspecies
                      }}
                      label="Species *"
                    >
                      {gemstoneOptions.species.map(species => (
                        <MenuItem key={species} value={species}>{species}</MenuItem>
                      ))}
                    </Select>
                    {errors.species && <Typography variant="caption" color="error">{errors.species}</Typography>}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Subspecies</InputLabel>
                    <Select
                      value={formData.subspecies}
                      onChange={(e) => handleInputChange('subspecies', e.target.value)}
                      label="Subspecies"
                      disabled={!formData.species || !gemstoneOptions.subspecies[formData.species]}
                    >
                      {formData.species && gemstoneOptions.subspecies[formData.species]?.map(subspecies => (
                        <MenuItem key={subspecies} value={subspecies}>{subspecies}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Origin and Characteristics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Origin and Characteristics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Origin Country</InputLabel>
                    <Select
                      value={formData.origin}
                      onChange={(e) => handleInputChange('origin', e.target.value)}
                      label="Origin Country"
                    >
                      {gemstoneOptions.origins?.map(origin => (
                        <MenuItem key={origin} value={origin}>{origin}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Specific Locale"
                    value={formData.locale}
                    onChange={(e) => handleInputChange('locale', e.target.value)}
                    placeholder="e.g., Mogok, Pailin, Ratnapura"
                    helperText="Specific mining location if known"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Color *"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    error={!!errors.color}
                    helperText={errors.color || 'Primary color and any modifying colors'}
                    placeholder="e.g., Vivid Red, Cornflower Blue, Padparadscha"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Fluorescence</InputLabel>
                    <Select
                      value={formData.fluorescence}
                      onChange={(e) => handleInputChange('fluorescence', e.target.value)}
                      label="Fluorescence"
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="faint">Faint</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="strong">Strong</MenuItem>
                      <MenuItem value="very strong">Very Strong</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Treatment and Origin Type */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Treatment and Origin Type</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.isNatural}
                          onChange={(e) => {
                            handleInputChange('isNatural', e.target.checked);
                            if (e.target.checked) handleInputChange('isLabGrown', false);
                          }}
                        />
                      }
                      label="Natural"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.isLabGrown}
                          onChange={(e) => {
                            handleInputChange('isLabGrown', e.target.checked);
                            if (e.target.checked) handleInputChange('isNatural', false);
                          }}
                        />
                      }
                      label="Lab Grown"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Treatments Applied:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {gemstoneOptions.treatments?.map(treatment => (
                      <FormControlLabel
                        key={treatment}
                        control={
                          <Checkbox
                            checked={formData.treatments.includes(treatment)}
                            onChange={(e) => handleTreatmentChange(treatment, e.target.checked)}
                          />
                        }
                        label={treatment}
                      />
                    ))}
                  </Box>
                </Grid>
                {formData.treatments.length > 0 && formData.treatments[0] !== 'None' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Treatment Details"
                      value={formData.treatmentDetails}
                      onChange={(e) => handleInputChange('treatmentDetails', e.target.value)}
                      placeholder="Describe the specific treatments applied and any details..."
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Certification */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Certification</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasCertificate}
                        onChange={(e) => handleInputChange('hasCertificate', e.target.checked)}
                      />
                    }
                    label="Has Certificate"
                  />
                </Grid>
                {formData.hasCertificate && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.certificateType}>
                        <InputLabel>Certificate Type *</InputLabel>
                        <Select
                          value={formData.certificateType}
                          onChange={(e) => handleInputChange('certificateType', e.target.value)}
                          label="Certificate Type *"
                        >
                          <MenuItem value="GIA">GIA</MenuItem>
                          <MenuItem value="AGL">AGL</MenuItem>
                          <MenuItem value="Gübelin">Gübelin</MenuItem>
                          <MenuItem value="SSEF">SSEF</MenuItem>
                          <MenuItem value="Lotus">Lotus</MenuItem>
                          <MenuItem value="GRS">GRS</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                        {errors.certificateType && <Typography variant="caption" color="error">{errors.certificateType}</Typography>}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Certificate Number"
                        value={formData.certificateNumber}
                        onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                        placeholder="Certificate ID/Number"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Quality and Mounting Requirements */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Quality and Mounting Requirements</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Quality Grade</InputLabel>
                    <Select
                      value={formData.quality}
                      onChange={(e) => handleInputChange('quality', e.target.value)}
                      label="Quality Grade"
                    >
                      <MenuItem value="commercial">Commercial</MenuItem>
                      <MenuItem value="good">Good</MenuItem>
                      <MenuItem value="fine">Fine</MenuItem>
                      <MenuItem value="extra fine">Extra Fine</MenuItem>
                      <MenuItem value="investment">Investment Grade</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Rarity</InputLabel>
                    <Select
                      value={formData.rarity}
                      onChange={(e) => handleInputChange('rarity', e.target.value)}
                      label="Rarity"
                    >
                      <MenuItem value="common">Common</MenuItem>
                      <MenuItem value="uncommon">Uncommon</MenuItem>
                      <MenuItem value="rare">Rare</MenuItem>
                      <MenuItem value="very rare">Very Rare</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.mountingRequired}
                        onChange={(e) => handleInputChange('mountingRequired', e.target.checked)}
                      />
                    }
                    label="Mounting Required"
                  />
                </Grid>
                {formData.mountingRequired && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Mounting Type</InputLabel>
                        <Select
                          value={formData.mountingType}
                          onChange={(e) => handleInputChange('mountingType', e.target.value)}
                          label="Mounting Type"
                        >
                          <MenuItem value="custom">Custom Required</MenuItem>
                          <MenuItem value="stuller">Stuller Mounting OK</MenuItem>
                          <MenuItem value="optional">Optional</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Mounting Notes"
                        value={formData.mountingNotes}
                        onChange={(e) => handleInputChange('mountingNotes', e.target.value)}
                        placeholder="Special requirements, suggested settings, etc."
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isLoading}
                startIcon={<Save />}
              >
                {isLoading ? 'Saving...' : 'Save Gemstone'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default GemstonCreationForm;