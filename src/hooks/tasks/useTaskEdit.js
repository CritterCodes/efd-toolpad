import * as React from 'react';
import { useRouter } from 'next/navigation';
import { VALID_SKILL_LEVELS } from '@/constants/pricing.constants.mjs';

export function useTaskEdit(taskId) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: 'shanks',
    subcategory: '',
    metalType: 'yellow_gold',
    karat: '14k',
    requiresMetalType: true,
    processes: [],
    materials: [],
    basePrice: '',
    laborHours: '',
    service: {
      estimatedDays: 3,
      rushDays: 1,
      rushMultiplier: 1.5,
      requiresApproval: true,
      requiresInspection: true,
      canBeBundled: true,
      skillLevel: 'standard',
      riskLevel: 'low'
    },
    display: {
      isActive: true,
      isFeatured: false,
      sortOrder: 0
    }
  });

  const loadTask = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks?taskId=${taskId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load task');
      }
      
      const data = await response.json();
      
      if (data.success && data.task) {
        const task = data.task;
        setFormData({
          title: task.title || '',
          description: task.description || '',
          category: task.category || 'shanks',
          subcategory: task.subcategory || '',
          metalType: task.metalType || 'yellow_gold',
          karat: task.karat || '14k',
          requiresMetalType: task.requiresMetalType !== false,
          processes: task.processes || [],
          materials: task.materials || [],
          basePrice: task.pricing?.retailPrice?.toString() || task.basePrice?.toString() || '',
          laborHours: task.pricing?.totalLaborHours?.toString() || task.laborHours?.toString() || '',
          service: {
            estimatedDays: task.service?.estimatedDays || 3,
            rushDays: task.service?.rushDays || 1,
            rushMultiplier: task.service?.rushMultiplier || 1.5,
            requiresApproval: task.service?.requiresApproval !== false,
            requiresInspection: task.service?.requiresInspection !== false,
            canBeBundled: task.service?.canBeBundled !== false,
            skillLevel: task.service?.skillLevel || task.skillLevel || VALID_SKILL_LEVELS[1],
            riskLevel: task.service?.riskLevel || task.riskLevel || 'low'
          },
          display: {
            isActive: task.display?.isActive !== false && task.isActive !== false,
            isFeatured: task.display?.isFeatured || false,
            sortOrder: task.display?.sortOrder || 0
          }
        });
      } else {
        throw new Error('Task not found');
      }
    } catch (error) {
      console.error('Error loading task:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId, loadTask]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const updateData = {
        taskId,
        ...formData,
        basePrice: parseFloat(formData.basePrice) || 0,
        laborHours: parseFloat(formData.laborHours) || 0,
      };
      
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task');
      }

      setSuccess('Task updated successfully!');
      setTimeout(() => {
        router.push('/dashboard/admin/tasks');
      }, 2000);

    } catch (error) {
      console.error('Error updating task:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleNestedChange = (parentField, childField) => (event) => {
    setFormData({
      ...formData,
      [parentField]: {
        ...formData[parentField],
        [childField]: event.target.type === 'number' ? parseFloat(event.target.value) || 0 : event.target.value
      }
    });
  };

  const handleToggle = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.checked });
  };

  const handleNestedToggle = (parentField, childField) => (event) => {
    setFormData({
      ...formData,
      [parentField]: {
        ...formData[parentField],
        [childField]: event.target.checked
      }
    });
  };

  return {
    loading,
    saving,
    error,
    success,
    formData,
    handleChange,
    handleNestedChange,
    handleToggle,
    handleNestedToggle,
    handleSubmit
  };
}