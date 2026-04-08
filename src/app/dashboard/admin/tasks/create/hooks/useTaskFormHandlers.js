import { useRouter } from 'next/navigation';

function normalizeVariantPricingAdjustments(variantPricingAdjustments) {
  if (!variantPricingAdjustments || typeof variantPricingAdjustments !== 'object') {
    return {};
  }

  return Object.entries(variantPricingAdjustments).reduce((acc, [variantKey, value]) => {
    const retailMultiplier = parseFloat(value?.retailMultiplier);
    if (Number.isFinite(retailMultiplier) && retailMultiplier > 0 && Math.abs(retailMultiplier - 1) > 0.0001) {
      acc[variantKey] = { retailMultiplier };
    }
    return acc;
  }, {});
}

export function useTaskFormHandlers({
  formData,
  setFormData,
  setError,
  setSuccess,
  setLoading,
  availableProcesses = [],
  availableMaterials = [],
  pricesByMetal = {},
  pricePreview = null,
  mode = 'create',
  taskId = null
}) {
  const router = useRouter();

  const addProcess = () => {
    setFormData(prev => ({
      ...prev,
      processes: [...prev.processes, { processId: '', quantity: 1 }]
    }));
  };

  const removeProcess = (index) => {
    setFormData(prev => ({
      ...prev,
      processes: prev.processes.filter((_, i) => i !== index)
    }));
  };

  const updateProcess = (index, field, value) => {
    setFormData(prev => {
      const newProcesses = [...prev.processes];
      newProcesses[index] = { ...newProcesses[index], [field]: value };
      return { ...prev, processes: newProcesses };
    });
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { materialId: '', quantity: 1 }]
    }));
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const updateMaterial = (index, field, value) => {
    setFormData(prev => {
      const newMaterials = [...prev.materials];
      newMaterials[index] = { ...newMaterials[index], [field]: value };
      return { ...prev, materials: newMaterials };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const enrichedProcesses = formData.processes.map((selection) => {
        const process = availableProcesses.find((p) => p._id === selection.processId);
        return {
          processId: selection.processId,
          quantity: selection.quantity || 1,
          processName: process?.displayName || process?.name || '',
          displayName: process?.displayName || process?.name || '',
          baseLaborHours: process?.laborHours || 0,
          skillLevel: process?.skillLevel || ''
        };
      });

      const enrichedMaterials = formData.materials.map((selection) => {
        const material = availableMaterials.find((m) => m._id === selection.materialId);
        return {
          materialId: selection.materialId,
          quantity: selection.quantity || 1,
          materialName: material?.displayName || material?.name || '',
          displayName: material?.displayName || material?.name || ''
        };
      });

      const hasUniversalPricing = pricesByMetal && Object.keys(pricesByMetal).length > 0;
      const universalPricing = hasUniversalPricing ? pricesByMetal : null;

      const taskData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        isUniversal: true,
        baseMetal: formData.metalType,
        baseKarat: formData.karat,
        processes: enrichedProcesses,
        materials: enrichedMaterials,
        universalPricing,
        pricing: pricePreview
          ? {
              retailPrice: pricePreview.retailPrice || 0,
              wholesalePrice: pricePreview.wholesalePrice || 0,
              baseCost: pricePreview.baseCost || 0,
              totalProcessCost: pricePreview.totalProcessCost || 0,
              totalMaterialCost: pricePreview.totalMaterialCost || 0,
              totalLaborHours: pricePreview.totalLaborHours || 0,
              businessMultiplier: pricePreview.businessMultiplier || 1,
              calculatedAt: new Date().toISOString()
            }
          : null,
        basePrice: pricePreview?.retailPrice || 0,
        service: formData.service,
        display: formData.display,
        minimumPrice: parseFloat(formData.minimumPrice) > 0 ? parseFloat(formData.minimumPrice) : null,
        priceOverride: parseFloat(formData.priceOverride) > 0 ? parseFloat(formData.priceOverride) : null,
        minimumWholesalePrice: parseFloat(formData.minimumWholesalePrice) > 0 ? parseFloat(formData.minimumWholesalePrice) : null,
        minimumLaborPrice: parseFloat(formData.minimumLaborPrice) > 0 ? parseFloat(formData.minimumLaborPrice) : null,
        variantPricingAdjustments: normalizeVariantPricingAdjustments(formData.variantPricingAdjustments)
      };

      const isEditMode = mode === 'edit' && taskId;
      const requestUrl = isEditMode ? '/api/tasks' : '/api/tasks/universal';
      const requestMethod = isEditMode ? 'PUT' : 'POST';
      const requestBody = isEditMode
        ? {
            taskId,
            ...taskData,
            isUniversal: true,
            isActive: formData.display?.isActive !== false
          }
        : taskData;

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create task');
      }

      const result = await response.json();
      setSuccess(isEditMode ? 'Task updated successfully! Redirecting...' : 'Task created successfully! Redirecting...');
      
      setTimeout(() => {
        router.push('/dashboard/admin/tasks');
      }, 1500);

    } catch (error) {
      console.error('Error creating task:', error);
      const fallbackMessage = mode === 'edit' ? 'Failed to update task' : 'Failed to create task';
      const errorMessage = typeof error === 'string' ? error : (error.message || fallbackMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    addProcess,
    removeProcess,
    updateProcess,
    addMaterial,
    removeMaterial,
    updateMaterial,
    handleSubmit
  };
}
