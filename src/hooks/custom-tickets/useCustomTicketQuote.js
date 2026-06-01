import { useState, useEffect, useMemo, useCallback } from 'react';
import { calculateCustomQuote } from '@/services/pricing/customQuote.pricing';

export const useCustomTicketQuote = (ticket, onUpdateFinancials) => {
  const [editMode, setEditMode] = useState(true);
  const [isPublished, setIsPublished] = useState(ticket?.quote?.quotePublished || false);
  const [financialSettings, setFinancialSettings] = useState({
    cogMarkup: 2.5,
    designFeeMarkup: 1.5,
    rushMultiplier: 1.5,
    commissionPercentage: 0.10,
    targetMarginFloor: 0.45,
    defaultDesignerFee: 0
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
    includeCustomDesign: ticket?.quote?.includeCustomDesign || false,
    cogMarkup: ticket?.quote?.cogMarkup ?? '',          // per-quote override; '' → use settings default
    // Designer fee: a saved quote value wins; otherwise auto-resolve from the
    // assigned artisan's snapshotted fee; else 0 (formula falls back to settings default).
    designerFee: ticket?.quote?.designerFee
      ?? (ticket?.assignedArtisans || [])
           .map(a => a?.customDesignFee)
           .find(v => typeof v === 'number' && v > 0)
      ?? 0
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
      const f = result?.financial || {};

      setFinancialSettings({
        cogMarkup: f.cogMarkup ?? 2.5,
        designFeeMarkup: f.designFeeMarkup ?? 1.5,
        rushMultiplier: f.rushMultiplier ?? result?.pricing?.rushMultiplier ?? 1.5,
        commissionPercentage: f.commissionPercentage ?? 0.10,
        targetMarginFloor: f.targetMarginFloor ?? 0.45,
        defaultDesignerFee: f.defaultDesignerFee ?? 0
      });
    } catch (error) {
      console.error('Error loading financial settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const analytics = useMemo(() => {
    return calculateCustomQuote(formData, financialSettings);
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
      cogMarkup: analytics.cogMarkup,
      designerFee: analytics.designerFee,
      designFeeMarkup: analytics.designFeeMarkup,
      quoteTotal: analytics.total,
      analytics: analytics,
      formulaVersion: analytics.formulaVersion,
      preTax: true, // quotes are pre-tax; Stripe Tax computes tax at payment
      // Snapshot the effective pricing settings so a saved/published quote
      // never silently changes when admin settings move later.
      settingsSnapshot: {
        cogMarkup: analytics.cogMarkup,
        designFeeMarkup: analytics.designFeeMarkup,
        rushMultiplier: financialSettings.rushMultiplier,
        commissionPercentage: analytics.commissionPercentage,
        targetMarginFloor: financialSettings.targetMarginFloor
      },
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