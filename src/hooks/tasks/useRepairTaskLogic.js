import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

export const useRepairTaskLogic = (formData, setFormData, setError, setSuccess) => {
  const router = useRouter();
  const params = useParams();
  const isEdit = !!params?.taskId;
  
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (isEdit && params.taskId) {
      loadTask(params.taskId);
    }
  }, [isEdit, params.taskId]);

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

  return { isEdit, loading, saving, handleSubmit, handleCancel, loadTask };
};
