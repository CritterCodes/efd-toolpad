import * as React from 'react';
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

const initialFormState = {
  title: '',
  description: '',
  category: '',
  subcategory: '',
  metalType: '',
  requiresMetalType: false,
  laborHours: 1.0,
  materialCost: 10.0,
  service: {
    estimatedDays: 3,
    rushDays: 1,
    rushMultiplier: 1.5,
    requiresApproval: false,
    requiresInspection: true,
    canBeBundled: true,
    skillLevel: SKILL_LEVEL.STANDARD,
    riskLevel: 'low'
  },
  workflow: {
    departments: ['workshop'],
    equipmentNeeded: [],
    qualityChecks: ['measurement', 'fit', 'finish'],
    safetyRequirements: ['protective_gear']
  },
  constraints: {
    minQuantity: 1,
    maxQuantity: 10,
    sizeRange: null,
    weightLimits: { minGrams: null, maxGrams: null }
  },
  display: {
    isActive: true,
    isFeatured: false,
    sortOrder: 100,
    tags: []
  }
};

export const useRepairTaskForm = (setError, setSuccess) => {
  const [formData, setFormData] = React.useState(initialFormState);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
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
    setError(null);
    setSuccess(null);
  };

  const handleArrayChange = (field, index, value) => {
    const [parent, child] = field.split('.');
    const currentArray = formData[parent][child];
    const newArray = [...currentArray];
    newArray[index] = value;
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: newArray
      }
    }));
  };

  const addArrayItem = (field, defaultValue = '') => {
    const [parent, child] = field.split('.');
    const currentArray = formData[parent][child];
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: [...currentArray, defaultValue]
      }
    }));
  };

  const removeArrayItem = (field, index) => {
    const [parent, child] = field.split('.');
    const currentArray = formData[parent][child];
    const newArray = currentArray.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: newArray
      }
    }));
  };

  return { formData, setFormData, handleInputChange, handleArrayChange, addArrayItem, removeArrayItem };
};
