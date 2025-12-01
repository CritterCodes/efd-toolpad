/**
 * Temporary Gemstone Creation Form
 * Simple form to test the new hierarchical API structure
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  InputAdornment,
  Paper
} from '@mui/material';

const GEMSTONE_SPECIES = [
  'Diamond', 'Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Garnet', 
  'Amethyst', 'Citrine', 'Peridot', 'Aquamarine', 'Tanzanite',
  'Tourmaline', 'Opal', 'Jade', 'Lapis Lazuli', 'Other'
];

const CUT_STYLES = [
  'Round', 'Princess', 'Emerald', 'Asscher', 'Oval', 'Marquise', 
  'Pear', 'Cushion', 'Heart', 'Radiant', 'Baguette', 'Trillion'
];

const COLORS = [
  'Colorless', 'Yellow', 'Brown', 'Blue', 'Green', 'Pink', 
  'Red', 'Orange', 'Purple', 'Black', 'Gray', 'Multi-color'
];

export default function GemstonCreationForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
    images: [],
    isPublic: true,
    status: 'draft',
    gemstone: {
      species: '',
      subspecies: '',
      carat: '',
      dimensions: { length: '', width: '', height: '' },
      cut: [],
      cutStyle: [],
      treatment: [],
      color: [],
      locale: '',
      naturalSynthetic: 'natural',
      retailPrice: '',
      customMounting: false,
      vendor: '',
      internalNotes: '',
      certification: {},
      designCoverage: 'full'
    }
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (initialData) {
      // Handle both old flat structure and new hierarchical structure
      if (initialData.gemstone) {
        // New hierarchical structure
        setFormData(initialData);
      } else {
        // Legacy flat structure - convert to hierarchical
        setFormData({
          title: initialData.title || '',
          description: initialData.description || '',
          tags: initialData.tags || [],
          images: initialData.images || [],
          isPublic: initialData.isPublic !== undefined ? initialData.isPublic : true,
          status: initialData.status || 'draft',
          gemstone: {
            species: initialData.species || '',
            subspecies: initialData.subspecies || '',
            carat: initialData.carat || '',
            dimensions: initialData.dimensions || { length: '', width: '', height: '' },
            cut: initialData.cut || [],
            cutStyle: initialData.cutStyle || [],
            treatment: initialData.treatment || [],
            color: initialData.color || [],
            locale: initialData.locale || '',
            naturalSynthetic: initialData.naturalSynthetic || 'natural',
            retailPrice: initialData.price || initialData.retailPrice || '',
            customMounting: initialData.customMounting || false,
            vendor: initialData.vendor || '',
            internalNotes: initialData.notes || initialData.internalNotes || '',
            certification: initialData.certification || {},
            designCoverage: initialData.designCoverage || 'full'
          }
        });
      }
    }
  }, [initialData]);

  const handleChange = (field, value, isGemstoneField = false) => {
    if (isGemstoneField) {
      setFormData(prev => ({
        ...prev,
        gemstone: {
          ...prev.gemstone,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayChange = (field, value, isGemstoneField = false) => {
    const currentArray = isGemstoneField ? formData.gemstone[field] : formData[field];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleChange(field, newArray, isGemstoneField);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.gemstone.species) {
      alert('Title and Species are required');
      return;
    }

    onSubmit(formData);
  };

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {initialData ? 'Edit Gemstone' : 'Add New Gemstone'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Universal Product Fields */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublic}
                  onChange={(e) => handleChange('isPublic', e.target.checked)}
                />
              }
              label="Public Listing"
            />
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Box>
              <TextField
                label="Add Tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <Button onClick={handleAddTag}>Add</Button>
                  )
                }}
                sx={{ mb: 1 }}
              />
              <Box>
                {formData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Gemstone-Specific Fields */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
              Gemstone Details
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Species</InputLabel>
              <Select
                value={formData.gemstone.species}
                onChange={(e) => handleChange('species', e.target.value, true)}
              >
                {GEMSTONE_SPECIES.map(species => (
                  <MenuItem key={species} value={species}>{species}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Subspecies/Variety"
              value={formData.gemstone.subspecies}
              onChange={(e) => handleChange('subspecies', e.target.value, true)}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Carat Weight"
              type="number"
              step="0.01"
              value={formData.gemstone.carat}
              onChange={(e) => handleChange('carat', e.target.value, true)}
              InputProps={{
                endAdornment: <InputAdornment position="end">ct</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Retail Price"
              type="number"
              step="0.01"
              value={formData.gemstone.retailPrice}
              onChange={(e) => handleChange('retailPrice', e.target.value, true)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Origin/Locale"
              value={formData.gemstone.locale}
              onChange={(e) => handleChange('locale', e.target.value, true)}
            />
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Natural/Synthetic</InputLabel>
              <Select
                value={formData.gemstone.naturalSynthetic}
                onChange={(e) => handleChange('naturalSynthetic', e.target.value, true)}
              >
                <MenuItem value="natural">Natural</MenuItem>
                <MenuItem value="synthetic">Synthetic</MenuItem>
                <MenuItem value="treated">Treated Natural</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.gemstone.customMounting}
                  onChange={(e) => handleChange('customMounting', e.target.checked, true)}
                />
              }
              label="Custom Mounting Available"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Internal Notes"
              multiline
              rows={2}
              value={formData.gemstone.internalNotes}
              onChange={(e) => handleChange('internalNotes', e.target.value, true)}
            />
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                {initialData ? 'Update Gemstone' : 'Create Gemstone'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}