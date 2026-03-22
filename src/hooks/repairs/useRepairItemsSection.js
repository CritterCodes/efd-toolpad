import { useState, useMemo } from 'react';
import { supportsMetalType, getMetalSpecificPrice } from '@/utils/repair-pricing.util';

export const useRepairItemsSection = ({
  formData,
  availableTasks = [],
  availableProcesses = [],
  availableMaterials = [],
  adminSettings
}) => {
  const [expandedSection, setExpandedSection] = useState('tasks');

  const { metalType, karat, isWholesale } = formData || {};

  // Filter tasks that support the selected metal type
  const compatibleTasks = useMemo(() => {
    return (availableTasks || []).filter(task => 
      supportsMetalType(task, metalType, karat)
    );
  }, [availableTasks, metalType, karat]);

  // Filter processes that support the selected metal type
  const compatibleProcesses = useMemo(() => {
    return (availableProcesses || []).filter(process =>
      supportsMetalType(process, metalType, karat)
    );
  }, [availableProcesses, metalType, karat]);
  
  // Filter materials that support the selected metal type
  const compatibleMaterials = useMemo(() => {
    return (availableMaterials || []).filter(material =>
      supportsMetalType(material, metalType, karat)
    );
  }, [availableMaterials, metalType, karat]);
  
  // Get price display helper
  const getPriceDisplay = (item) => {
    if (!metalType || !karat) return '0.00';
    const price = getMetalSpecificPrice(item, metalType, karat, isWholesale, adminSettings);
    return (price || 0).toFixed(2);
  };

  const handleExpand = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  return {
    expandedSection,
    handleExpand,
    compatibleTasks,
    compatibleProcesses,
    compatibleMaterials,
    getPriceDisplay,
    metalType,
    karat
  };
};
