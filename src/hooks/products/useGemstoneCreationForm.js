'use client';

import { useState, useCallback } from 'react';
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

      return { formData, setFormData, errors, isSubmitting, handleInputChange, handleSelectChange, handlePhotoUpload, handleSubmit, removePhoto, calculateCalculatedPrice };
