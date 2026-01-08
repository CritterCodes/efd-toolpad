'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const AdminSettingsContext = createContext();

export const useAdminSettings = () => {
  const context = useContext(AdminSettingsContext);
  if (!context) {
    throw new Error('useAdminSettings must be used within an AdminSettingsProvider');
  }
  return context;
};

export const AdminSettingsProvider = ({ children }) => {
  const { data: session } = useSession();
  const [adminSettings, setAdminSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default admin settings structure - memoized to prevent unnecessary re-renders
  const defaultSettings = useMemo(() => ({
    // Labor rates structure expected by process calculations
    laborRates: {
      baseRate: 50,      // Base rate for standard skill level
      basic: 37.5,       // 75% of base rate
      standard: 50,      // 100% of base rate
      advanced: 62.5,    // 125% of base rate
      expert: 75         // 150% of base rate
    },
    
    // Legacy wage field for compatibility
    wage: 50,
    
    // Material markup multiplier
    materialMarkup: 1.5,
    
    // Fee structure (as percentages of base wage)
    administrativeFee: 0.10,  // 10% of base wage
    businessFee: 0.15,        // 15% of base wage
    consumablesFee: 0.05,     // 5% of base wage
    
    // Metal complexity multipliers for different metal types
    metalComplexityMultipliers: {
      gold: 1.0,
      silver: 0.9,
      platinum: 1.3,
      palladium: 1.2,
      copper: 0.8,
      brass: 0.7,
      stainless: 0.8,
      titanium: 1.4,
      other: 1.0
    },
    
    // Store information
    store: {
      name: 'Engel Fine Design',
      address: '',
      phone: '',
      email: '',
      website: ''
    },
    
    // Integration settings
    integrations: {
      stuller: {
        enabled: false,
        apiKey: '',
        environment: 'sandbox'
      },
      shopify: {
        enabled: false,
        shopUrl: '',
        accessToken: '',
        apiVersion: '2023-10'
      }
    }
  }), []);

  // Fetch admin settings from API
  const fetchAdminSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch admin settings: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the API response to our expected structure
      const transformedSettings = {
        // Preserve original pricing structure for PricingEngine compatibility
        pricing: data.pricing || {},

        // Labor rates structure for process calculations
        laborRates: {
          baseRate: data.pricing?.wage || defaultSettings.laborRates.baseRate,
          basic: (data.pricing?.wage || defaultSettings.laborRates.baseRate) * 0.75,
          standard: data.pricing?.wage || defaultSettings.laborRates.baseRate,
          advanced: (data.pricing?.wage || defaultSettings.laborRates.baseRate) * 1.25,
          expert: (data.pricing?.wage || defaultSettings.laborRates.baseRate) * 1.5
        },
        
        // Direct mappings from the API response
        wage: data.pricing?.wage || defaultSettings.wage,
        materialMarkup: data.pricing?.materialMarkup || defaultSettings.materialMarkup,
        administrativeFee: data.pricing?.administrativeFee || defaultSettings.administrativeFee,
        businessFee: data.pricing?.businessFee || defaultSettings.businessFee,
        consumablesFee: data.pricing?.consumablesFee || defaultSettings.consumablesFee,
        rushMultiplier: data.pricing?.rushMultiplier || 1.5,
        deliveryFee: data.pricing?.deliveryFee || 0,
        taxRate: data.pricing?.taxRate || 0,
        
        // Metal complexity multipliers (use defaults if not in API response)
        metalComplexityMultipliers: data.metalComplexityMultipliers || defaultSettings.metalComplexityMultipliers,
        
        // Store information
        store: data.business ? {
          name: 'Engel Fine Design',
          defaultEstimatedDays: data.business.defaultEstimatedDays || 3,
          defaultRushDays: data.business.defaultRushDays || 1,
          workingDaysPerWeek: data.business.workingDaysPerWeek || 5,
          maxRushJobs: data.business.maxRushJobs || 5
        } : defaultSettings.store,
        
        // Integration settings
        integrations: {
          stuller: {
            enabled: data.stuller?.enabled || false,
            username: data.stuller?.username || '',
            apiUrl: data.stuller?.apiUrl || 'https://api.stuller.com',
            updateFrequency: data.stuller?.updateFrequency || 'monthly',
            hasPassword: !!data.stuller?.password
          },
          shopify: {
            enabled: data.shopify?.enabled || false,
            shopUrl: data.shopify?.shopUrl || '',
            apiVersion: data.shopify?.apiVersion || '2025-07',
            webhooksEnabled: data.shopify?.webhooksEnabled || false,
            hasAccessToken: !!data.shopify?.accessToken
          }
        },
        
        // Security and metadata (read-only)
        security: data.security || {},
        version: data.version || '2.0.0',
        updatedAt: data.updatedAt,
        lastModifiedBy: data.lastModifiedBy
      };
      
      setAdminSettings(transformedSettings);
    } catch (err) {
      console.error('Error fetching admin settings:', err);
      setError(err.message);
      // Use defaults on error
      setAdminSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [defaultSettings]);

  // Update admin settings
  const updateAdminSettings = async (newSettings) => {
    try {
      setError(null);
      
      // Transform our internal structure back to the API format
      const apiPayload = {
        pricing: {
          wage: newSettings.wage || adminSettings?.wage,
          materialMarkup: newSettings.materialMarkup || adminSettings?.materialMarkup,
          administrativeFee: newSettings.administrativeFee || adminSettings?.administrativeFee,
          businessFee: newSettings.businessFee || adminSettings?.businessFee,
          consumablesFee: newSettings.consumablesFee || adminSettings?.consumablesFee,
          rushMultiplier: newSettings.rushMultiplier || adminSettings?.rushMultiplier || 1.5,
          deliveryFee: newSettings.deliveryFee || adminSettings?.deliveryFee || 0,
          taxRate: newSettings.taxRate || adminSettings?.taxRate || 0
        },
        business: newSettings.store ? {
          defaultEstimatedDays: newSettings.store.defaultEstimatedDays || adminSettings?.store?.defaultEstimatedDays || 3,
          defaultRushDays: newSettings.store.defaultRushDays || adminSettings?.store?.defaultRushDays || 1,
          workingDaysPerWeek: newSettings.store.workingDaysPerWeek || adminSettings?.store?.workingDaysPerWeek || 5,
          maxRushJobs: newSettings.store.maxRushJobs || adminSettings?.store?.maxRushJobs || 5
        } : adminSettings?.store,
        // Note: We'll need a security code for updates - this should be handled by the component
        securityCode: newSettings.securityCode
      };
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update admin settings: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Refresh the settings after successful update
      await fetchAdminSettings();
      
      return result;
    } catch (err) {
      console.error('Error updating admin settings:', err);
      setError(err.message);
      throw err;
    }
  };

  // Refresh settings from server
  const refreshSettings = () => {
    fetchAdminSettings();
  };

  // Helper function to get effective hourly rate for a skill level
  const getHourlyRateForSkill = (skillLevel) => {
    if (!adminSettings?.laborRates) return defaultSettings.laborRates.standard;
    
    const rates = adminSettings.laborRates;
    switch (skillLevel?.toLowerCase()) {
      case 'basic':
        return rates.basic;
      case 'standard':
        return rates.standard;
      case 'advanced':
        return rates.advanced;
      case 'expert':
        return rates.expert;
      default:
        return rates.standard;
    }
  };

  // Helper function to calculate total effective wage including fees
  const getTotalEffectiveWage = () => {
    if (!adminSettings) return defaultSettings.wage;
    
    const baseWage = adminSettings.wage || adminSettings.laborRates?.baseRate || defaultSettings.wage;
    const adminFee = baseWage * (adminSettings.administrativeFee || 0);
    const bizFee = baseWage * (adminSettings.businessFee || 0);
    const consumablesFee = baseWage * (adminSettings.consumablesFee || 0);
    
    return baseWage + adminFee + bizFee + consumablesFee;
  };

  // Load settings on mount and when session changes
  useEffect(() => {
    if (session?.user) {
      fetchAdminSettings();
    } else {
      // Use defaults when not authenticated
      setAdminSettings(defaultSettings);
      setLoading(false);
    }
  }, [session, fetchAdminSettings, defaultSettings]);

  const contextValue = {
    adminSettings,
    loading,
    error,
    updateAdminSettings,
    refreshSettings,
    getHourlyRateForSkill,
    getTotalEffectiveWage,
    defaultSettings
  };

  return (
    <AdminSettingsContext.Provider value={contextValue}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

export default AdminSettingsContext;
