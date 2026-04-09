'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { calculateAnalyticMetrics } from '@/utilities/helpers/quote.helpers';

export const useCustomTicketQuote = (ticket, onUpdateFinancials) => {
  const [editMode, setEditMode] = useState(true);
  const [isPublished, setIsPublished] = useState(ticket?.quote?.quotePublished || false);
  const [financialSettings, setFinancialSettings] = useState({
    customDesignFee: 100.00,
    commissionPercentage: 0.10,
    jewelerLaborRate: 45.00,
    cadDesignerRate: 50.00,
    materialMarkupPercentage: 0.30,
    shippingRate: 25.00,
    rushMultiplier: 1.5
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const getInitialFormData = () => ({
    centerstone: {
      item: ticket?.quote?.centerstone?.description || ticket?.quote?.centerstone?.item || '',
      cost: ticket?.quote?.centerstone?.cost || 0,
      markup: 0
    },
    accentStones: ticket?.quote?.accentStones || [],
    mounting: {
      item: ticket?.quote?.mounting?.description || ticket?.quote?.mounting?.item || '',
      cost: ticket?.quote?.mounting?.cost || 0,
      markup: 0
    },
    additionalMaterials: ticket?.quote?.additionalMaterials || [],
    laborTasks: ticket?.quote?.laborTasks || [],
    shippingCosts: ticket?.quote?.shippingCosts || [],
    isRush: ticket?.quote?.isRush || false,
    includeCustomDesign: ticket?.quote?.includeCustomDesign || false
  });

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    loadFinancialSettings();
  }, []);

  const loadFinancialSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      
      if (result && result.pricing) {
        setFinancialSettings({
          customDesignFee: result.financial?.customDesignFee || 100.00,
          commissionPercentage: result.financial?.commissionPercentage || 0.10,
          jewelerLaborRate: result.financial?.jewelerLaborRate || result.pricing?.wage || 45.00,
          cadDesignerRate: result.financial?.cadDesignerRate || 50.00,
          materialMarkupPercentage: result.financial?.materialMarkupPercentage || 
                                   (result.pricing?.materialMarkup ? (result.pricing.materialMarkup - 1) : 1.0),
          shippingRate: result.financial?.shippingRate || result.pricing?.deliveryFee || 25.00,
          rushMultiplier: result.financial?.rushMultiplier || result.pricing?.rushMultiplier || 1.5
        });
      }
    } catch (error) {
      console.error('Error loading financial settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const analytics = useMemo(() => {
    return calculateAnalyticMetrics(formData, financialSettings);
  }, [formData, financialSettings]);

  // Array item handlers
  const handleItemChange = useCallback((field, action, payload) => {
    setFormData(prev => {
      const array = [...prev[field]];
      
      switch (action) {
        case 'ADD':
          array.push(payload.newItem);
          break;
        case 'REMOVE':
          array.splice(payload.index, 1);
          break;
        case 'UPDATE':
          array[payload.index] = { ...array[payload.index], [payload.key]: payload.value };
          break;
        default:
          return prev;
      }
      
      return { ...prev, [field]: array };
    });
  }, []);

  // Root level field update
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Nested field update (for centerstone, mounting)
  const updateNestedField = useCallback((parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: { ...prev[parentField], [childField]: value }
    }));
  }, []);

  const buildSaveData = (publishUpdates = {}) => ({
    quote: {
      centerstone: formData.centerstone,
      accentStones: formData.accentStones,
      mounting: formData.mounting,
      additionalMaterials: formData.additionalMaterials,
      laborTasks: formData.laborTasks,
      shippingCosts: formData.shippingCosts,
      isRush: formData.isRush,
      includeCustomDesign: formData.includeCustomDesign,
      customDesignFee: financialSettings.customDesignFee,
      quoteTotal: analytics.total,
      analytics: analytics,
      ...publishUpdates
    }
  });

  const handleSave = async () => {
    if (!onUpdateFinancials) return;
    setSaving(true);
    try {
      const result = await onUpdateFinancials(buildSaveData());
      if (result?.success) {
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublishQuote = async () => {
    if (!onUpdateFinancials) return;
    setSaving(true);
    try {
      const publishData = { quotePublished: true, publishedAt: new Date().toISOString() };
      const result = await onUpdateFinancials(buildSaveData(publishData));

      if (result?.success) {
        setIsPublished(true);
        setEditMode(false);
        try {
          await fetch('/api/notifications/quote-published', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ticketId: ticket?.ticketID,
              quoteTotal: analytics.total 
            })
          });
        } catch (error) {
          console.log('Notification failed', error);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublishQuote = async () => {
    if (!onUpdateFinancials) return;
    setSaving(true);
    try {
      const publishData = { quotePublished: false, publishedAt: null };
      const result = await onUpdateFinancials(buildSaveData(publishData));

      if (result?.success) {
        setIsPublished(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(getInitialFormData());
    setEditMode(false);
  };

  return {
    editMode,
    setEditMode,
    isPublished,
    financialSettings,
    loadingSettings,
    saving,
    formData,
    analytics,
    handleItemChange,
    updateField,
    updateNestedField,
    handleSave,
    handlePublishQuote,
    handleUnpublishQuote,
    handleCancel
  };
};