import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import pricingEngine from '@/services/PricingEngine';

const fallbackSettings = {
  pricing: {
    wage: 30,
    materialMarkup: 1.5,
    administrativeFee: 0.1,
    businessFee: 0.15,
    consumablesFee: 0.05
  }
};

export const useProcessTaskBuilder = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'shanks',
    subcategory: '',
    metalType: 'yellow_gold',
    karat: '14k',
    requiresMetalType: true,
    processes: [],
    materials: [],
    service: {
      estimatedDays: 3,
      rushDays: 1,
      rushMultiplier: 1.5,
      requiresApproval: true,
      requiresInspection: true,
      canBeBundled: true
    },
    display: {
      isActive: true,
      isFeatured: false,
      sortOrder: 0
    }
  });

  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [adminSettings, setAdminSettings] = useState(null);
  const [dataLoadErrors, setDataLoadErrors] = useState({
    processes: false,
    materials: false,
    settings: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pricePreview, setPricePreview] = useState(null);

  const calculatePricePreview = useCallback(async () => {
    if (!adminSettings || formData.processes.length === 0) {
      setPricePreview(null);
      return;
    }

    try {
      let totalLaborHours = 0;
      let totalProcessCost = 0;
      let processMaterialCost = 0;
      let processMarkedUpMaterialCost = 0;
      let taskMaterialCost = 0;

      for (const processSelection of formData.processes) {
        const process = availableProcesses.find(p => p._id === processSelection.processId);
        if (process) {
          const quantity = processSelection.quantity || 1;
          const laborHours = (process.laborHours || 0) * quantity;
          totalLaborHours += laborHours;
          
          if (process.pricing?.totalCost) {
            totalProcessCost += process.pricing.totalCost * quantity;
            if (process.pricing.baseMaterialsCost) {
              processMaterialCost += process.pricing.baseMaterialsCost * quantity;
            }
            if (process.pricing.materialsCost) {
              processMarkedUpMaterialCost += process.pricing.materialsCost * quantity;
            }
          } else if (process.materials && process.materials.length > 0) {
            for (const processMaterial of process.materials) {
              processMaterialCost += (processMaterial.estimatedCost || 0) * quantity;
            }
          }
        }
      }

      for (const materialSelection of formData.materials) {
        const material = availableMaterials.find(m => m._id === materialSelection.materialId);
        if (material) {
          const quantity = materialSelection.quantity || 1;
          taskMaterialCost += (material.unitCost || material.costPerPortion || 0) * quantity;
        }
      }

      const taskData = {
        processes: formData.processes.map(ps => ({
          processId: ps.processId,
          quantity: ps.quantity || 1
        })),
        materials: formData.materials.map(ms => ({
          materialId: ms.materialId,
          quantity: ms.quantity || 1
        }))
      };
      
      const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings, availableProcesses, availableMaterials);
      
      const retailPrice = pricing.retailPrice;
      const wholesalePrice = pricing.wholesalePrice;
      const businessMultiplier = pricing.businessMultiplier;
      const baseCost = pricing.baseCost;
      const markedUpTaskMaterials = pricing.markedUpMaterialCost - processMarkedUpMaterialCost;
      
      const totalDisplayMaterialCost = processMaterialCost + taskMaterialCost;
      const totalDisplayMarkedUpMaterials = processMarkedUpMaterialCost + markedUpTaskMaterials;

      setPricePreview({
        totalLaborHours: Math.round(totalLaborHours * 100) / 100,
        totalProcessCost: Math.round(totalProcessCost * 100) / 100,
        totalMaterialCost: Math.round(totalDisplayMaterialCost * 100) / 100,
        markedUpMaterialCost: Math.round(totalDisplayMarkedUpMaterials * 100) / 100,
        baseCost: Math.round(baseCost * 100) / 100,
        retailPrice: retailPrice || 0,
        wholesalePrice: wholesalePrice || 0,
        businessMultiplier: Math.round(businessMultiplier * 100) / 100
      });
    } catch (error) {
      console.error('Price calculation error:', error);
    }
  }, [formData.processes, formData.materials, adminSettings, availableProcesses, availableMaterials]);

  useEffect(() => {
    if (formData.processes.length > 0 && adminSettings) {
      calculatePricePreview();
    }
  }, [formData.processes, formData.materials, adminSettings, calculatePricePreview]);

  const loadInitialData = useCallback(async () => {
    try {
      const fetchOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      const [processesRes, materialsRes, settingsRes] = await Promise.all([
        fetch('/api/processes', fetchOptions),
        fetch('/api/materials', fetchOptions),
        fetch('/api/admin/settings', fetchOptions)
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        setAvailableProcesses(processesData.processes || []);
        setDataLoadErrors(prev => ({ ...prev, processes: false }));
      } else {
        setDataLoadErrors(prev => ({ ...prev, processes: true }));
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        setAvailableMaterials(materialsData.materials || []);
        setDataLoadErrors(prev => ({ ...prev, materials: false }));
      } else {
        setDataLoadErrors(prev => ({ ...prev, materials: true }));
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const settings = settingsData.settings || settingsData;
        if (!settings.pricing) setAdminSettings({ ...settings, pricing: fallbackSettings.pricing });
        else setAdminSettings(settings);
      } else {
        setAdminSettings(fallbackSettings);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setAdminSettings(fallbackSettings);
      setError('Some data failed to load. Processes and materials may not be available. Please check your connection and try refreshing the page.');
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const addProcess = () => setFormData(prev => ({ ...prev, processes: [...prev.processes, { processId: '', quantity: 1 }] }));
  const removeProcess = (index) => setFormData(prev => ({ ...prev, processes: prev.processes.filter((_, i) => i !== index) }));
  const updateProcess = (index, field, value) => setFormData(prev => ({
    ...prev, processes: prev.processes.map((p, i) => i === index ? { ...p, [field]: value } : p)
  }));

  const addMaterial = () => setFormData(prev => ({ ...prev, materials: [...prev.materials, { materialId: '', quantity: 1 }] }));
  const removeMaterial = (index) => setFormData(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }));
  const updateMaterial = (index, field, value) => setFormData(prev => ({
    ...prev, materials: prev.materials.map((m, i) => i === index ? { ...m, [field]: value } : m)
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let calculatedPricing = null;
      
      if (formData.processes.length > 0 && adminSettings && pricePreview) {
        calculatedPricing = {
          totalLaborHours: pricePreview.totalLaborHours,
          totalProcessCost: pricePreview.totalProcessCost,
          totalMaterialCost: pricePreview.totalMaterialCost,
          markedUpMaterialCost: pricePreview.markedUpMaterialCost,
          baseCost: pricePreview.baseCost,
          retailPrice: pricePreview.retailPrice,
          wholesalePrice: pricePreview.wholesalePrice,
          businessMultiplier: pricePreview.businessMultiplier,
          adminSettings: {
            materialMarkup: adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup,
            laborRates: adminSettings.laborRates,
            businessFees: {
              administrativeFee: adminSettings.pricing?.administrativeFee || 0,
              businessFee: adminSettings.pricing?.businessFee || 0,
              consumablesFee: adminSettings.pricing?.consumablesFee || 0
            }
          },
          calculatedAt: new Date().toISOString()
        };
      }

      const taskData = {
        ...formData,
        pricing: calculatedPricing,
        createdAt: new Date().toISOString(),
        hasStoredPricing: !!calculatedPricing
      };

      const response = await fetch('/api/tasks/process-based', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Process-based task created successfully!');
        setTimeout(() => {
          router.push('/dashboard/admin/tasks');
        }, 2000);
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCompatibleMaterials = () => {
    return availableMaterials.filter(material => 
      material.compatibleMetals.includes(formData.metalType)
    );
  };

  return {
    formData, setFormData,
    availableProcesses,
    availableMaterials,
    adminSettings,
    dataLoadErrors,
    loading, error, success,
    pricePreview,
    addProcess, removeProcess, updateProcess,
    addMaterial, removeMaterial, updateMaterial,
    handleSubmit, getCompatibleMaterials, loadInitialData
  };
};
