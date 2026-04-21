import { useState, useMemo } from 'react';
import { supportsMetalType, getMetalSpecificPrice } from '@/utils/repair-pricing.util';

export const useRepairItemsSection = ({
  formData,
  availableTasks = [],
  availableMaterials = [],
  adminSettings
}) => {
  const [expandedSection, setExpandedSection] = useState('tasks');

  const { metalType, karat, isWholesale } = formData || {};

  const compatibleTasks = useMemo(() => {
    return (availableTasks || []).filter(task =>
      supportsMetalType(task, metalType, karat)
    );
  }, [availableTasks, metalType, karat]);

  const compatibleMaterials = useMemo(() => {
    return (availableMaterials || []).filter(material =>
      supportsMetalType(material, metalType, karat)
    );
  }, [availableMaterials, metalType, karat]);

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
    compatibleMaterials,
    getPriceDisplay,
    metalType,
    karat
  };
};
