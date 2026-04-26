'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Category as CategoryIcon,
  Build as BuildIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useRouter, useParams } from 'next/navigation';
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';


'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Category as CategoryIcon,
  Build as BuildIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useRouter, useParams } from 'next/navigation';
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

export function useRepairTaskCreator() {
  const router = useRouter();
  const params = useParams();
  const isEdit = !!params?.taskId;
  
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  
  // Form state
  const [formData, setFormData] = React.useState({
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
  });

  const [calculatedPrice, setCalculatedPrice] = React.useState(0);

  // Load existing task for editing
  React.useEffect(() => {
    if (isEdit && params.taskId) {
      loadTask(params.taskId);
    }
  }, [isEdit, params.taskId]);

  // Calculate price when labor hours or material cost changes
  React.useEffect(() => {
    if (!formData.laborHours || !formData.materialCost) return;
    
    const calculatePrice = async () => {
      try {
        // Fetch current admin settings for accurate calculation
        const settingsResponse = await fetch('/api/admin/settings');
        let wage = 45; // Default fallback
        let materialMarkup = 1.5; // Default fallback
        let businessMultiplier = 1.48; // Default fallback
        
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          wage = settings.pricing?.wage || 45;
          materialMarkup = settings.pricing?.materialMarkup || 1.5;
          businessMultiplier = (settings.pricing?.administrativeFee || 0.15) + 
                              (settings.pricing?.businessFee || 0.25) + 
                              (settings.pricing?.consumablesFee || 0.08) + 1;
        }
        
        const laborCost = formData.laborHours * wage;
        const materialCost = formData.materialCost * materialMarkup;
        const subtotal = laborCost + materialCost;
        const estimatedPrice = subtotal * businessMultiplier;
        
        setCalculatedPrice(Math.round(estimatedPrice * 100) / 100);
      } catch (error) {
        console.error('Price calculation error:', error);
      }
    };
    
    calculatePrice();
  }, [formData.laborHours, formData.materialCost]);

  const loadTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/repair-tasks/crud/${taskId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load repair task');
      }
      
      const task = data.task;
      setFormData({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        subcategory: task.subcategory || '',
        metalType: task.metalType || '',
        requiresMetalType: task.requiresMetalType || false,
        laborHours: task.laborHours || 1.0,
        materialCost: task.materialCost || 10.0,
        service: {
          estimatedDays: task.service?.estimatedDays || 3,
          rushDays: task.service?.rushDays || 1,
          rushMultiplier: task.service?.rushMultiplier || 1.5,
          requiresApproval: task.service?.requiresApproval || false,
          requiresInspection: task.service?.requiresInspection !== false,
          canBeBundled: task.service?.canBeBundled !== false,
          skillLevel: task.service?.skillLevel || SKILL_LEVEL.STANDARD,
          riskLevel: task.service?.riskLevel || 'low'
        },
        workflow: {
          departments: task.workflow?.departments || ['workshop'],
          equipmentNeeded: task.workflow?.equipmentNeeded || [],
          qualityChecks: task.workflow?.qualityChecks || ['measurement', 'fit', 'finish'],
          safetyRequirements: task.workflow?.safetyRequirements || ['protective_gear']
        },
        constraints: {
          minQuantity: task.constraints?.minQuantity || 1,
          maxQuantity: task.constraints?.maxQuantity || 10,
          sizeRange: task.constraints?.sizeRange || null,
          weightLimits: task.constraints?.weightLimits || { minGrams: null, maxGrams: null }
        },
        display: {
          isActive: task.display?.isActive !== false,
          isFeatured: task.display?.isFeatured || false,
          sortOrder: task.display?.sortOrder || 100,
          tags: task.display?.tags || []
        }
      });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };



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

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const url = isEdit 
        ? `/api/repair-tasks/crud/${params.taskId}`
        : '/api/repair-tasks/crud';
        
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} repair task`);
      }
      
      setSuccess(`Repair task ${isEdit ? 'updated' : 'created'} successfully!`);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/admin/repair-tasks');
      }, 1500);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/admin/repair-tasks');
  };

  if (loading) {
    
return { isEdit, loading, saving, error, setError, success, setSuccess, formData, setFormData, calculatedPrice, handleInputChange, handleArrayChange, handleSubmit, handleCancel};
}

