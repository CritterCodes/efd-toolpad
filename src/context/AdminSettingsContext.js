'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { STAFF_ROLES } from '@/lib/designPermissions';
import {
  ANALYTICS_BASELINE_NOTE,
  DEFAULT_FEDERAL_TAX_RESERVE_RATE,
  DEFAULT_LABOR_ANALYTICS_START_DATE,
  DEFAULT_REPAIR_ANALYTICS_START_DATE,
} from '@/services/analyticsBaseline';

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
    // NO PRICING DEFAULTS. This used to default the wage to $50, the fees to 10/15/5%, the material and
    // wholesale markups to 1.5 and skill-level labor rates — and the settings editor saved whatever it
    // held, so a failed load could write invented prices into the shop's settings. Pricing values come
    // from the server or are absent (owner, 2026-09-30: "there should never be a fallback").
    federalTaxReserveRate: DEFAULT_FEDERAL_TAX_RESERVE_RATE,
    consignmentFeeRate: 0.20,
    
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
      }
    },
    analytics: {
      repairAnalyticsStartDate: DEFAULT_REPAIR_ANALYTICS_START_DATE,
      laborAnalyticsStartDate: DEFAULT_LABOR_ANALYTICS_START_DATE,
      federalTaxReserveRate: DEFAULT_FEDERAL_TAX_RESERVE_RATE,
      note: ANALYTICS_BASELINE_NOTE,
    }
  }), []);

  // Fetch admin settings from API
  const fetchAdminSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/settings/manage');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch admin settings: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the API response to our expected structure
      const transformedSettings = {
        // The raw pricing block — resolvePricingSettings reads it (services/pricing/engine.js)
        pricing: data.pricing || {},

        // The shop's pricing values, exactly as stored — null when missing, never a default.
        wage: data.pricing?.wage ?? null,
        materialMarkup: data.pricing?.materialMarkup ?? null,
        wholesaleMarkup: data.pricing?.wholesaleMarkup ?? null,
        minimumTaskRetailPrice: data.pricing?.minimumTaskRetailPrice ?? null,
        minimumTaskWholesalePrice: data.pricing?.minimumTaskWholesalePrice ?? null,
        administrativeFee: data.pricing?.administrativeFee ?? null,
        businessFee: data.pricing?.businessFee ?? null,
        consumablesFee: data.pricing?.consumablesFee ?? null,
        rushMultiplier: data.pricing?.rushMultiplier ?? null,
        deliveryFee: data.pricing?.deliveryFee ?? null,
        taxRate: data.pricing?.taxRate ?? null,
        federalTaxReserveRate: Number(
          data.analytics?.federalTaxReserveRate ?? defaultSettings.federalTaxReserveRate
        ),
        consignmentFeeRate: data.pricing?.consignmentFeeRate ?? defaultSettings.consignmentFeeRate,
        
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
          }
        },
        analytics: {
          repairAnalyticsStartDate: data.analytics?.repairAnalyticsStartDate || defaultSettings.analytics.repairAnalyticsStartDate,
          laborAnalyticsStartDate: data.analytics?.laborAnalyticsStartDate || defaultSettings.analytics.laborAnalyticsStartDate,
          federalTaxReserveRate: Number(
            data.analytics?.federalTaxReserveRate ?? defaultSettings.analytics.federalTaxReserveRate
          ),
          note: data.analytics?.note || defaultSettings.analytics.note,
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
      // Non-pricing defaults only: the pricing values stay absent, so nothing can save an invented price.
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
          // `??`, not `||`: a real 0 (a fee, the tax) is a value, not a gap. Nothing is invented — the
          // server refuses a save that leaves the engine's settings incomplete (resolvePricingSettings).
          wage: newSettings.wage ?? adminSettings?.wage,
          materialMarkup: newSettings.materialMarkup ?? adminSettings?.materialMarkup,
          wholesaleMarkup: newSettings.wholesaleMarkup ?? adminSettings?.wholesaleMarkup,
          minimumTaskRetailPrice: newSettings.minimumTaskRetailPrice ?? adminSettings?.minimumTaskRetailPrice,
          minimumTaskWholesalePrice: newSettings.minimumTaskWholesalePrice ?? adminSettings?.minimumTaskWholesalePrice,
          administrativeFee: newSettings.administrativeFee ?? adminSettings?.administrativeFee,
          businessFee: newSettings.businessFee ?? adminSettings?.businessFee,
          consumablesFee: newSettings.consumablesFee ?? adminSettings?.consumablesFee,
          rushMultiplier: newSettings.rushMultiplier ?? adminSettings?.rushMultiplier,
          deliveryFee: newSettings.deliveryFee ?? adminSettings?.deliveryFee,
          taxRate: newSettings.taxRate ?? adminSettings?.taxRate,
          consignmentFeeRate: newSettings.consignmentFeeRate ?? adminSettings?.consignmentFeeRate ?? 0.20,
          wholesaleConfig: {
            ...(adminSettings?.pricing?.wholesaleConfig || {}),
            minimumMultiplier: newSettings.wholesaleMarkup ?? adminSettings?.wholesaleMarkup
          }
        },
        business: newSettings.store ? {
          defaultEstimatedDays: newSettings.store.defaultEstimatedDays || adminSettings?.store?.defaultEstimatedDays || 3,
          defaultRushDays: newSettings.store.defaultRushDays || adminSettings?.store?.defaultRushDays || 1,
          workingDaysPerWeek: newSettings.store.workingDaysPerWeek || adminSettings?.store?.workingDaysPerWeek || 5,
          maxRushJobs: newSettings.store.maxRushJobs || adminSettings?.store?.maxRushJobs || 5
        } : adminSettings?.store,
        analytics: {
          ...adminSettings?.analytics,
          federalTaxReserveRate: Number(
            newSettings.federalTaxReserveRate
              ?? adminSettings?.federalTaxReserveRate
              ?? adminSettings?.analytics?.federalTaxReserveRate
              ?? defaultSettings.analytics.federalTaxReserveRate
          ),
        },
        // Note: We'll need a security code for updates - this should be handled by the component
        securityCode: newSettings.securityCode
      };
      
      const response = await fetch('/api/admin/settings/manage', {
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

  // Load settings on mount and when session changes.
  //
  // STAFF ONLY, because /api/admin/settings/manage is staff-gated. This provider is mounted in the
  // ROOT layout, so without this check every artisan and wholesaler fired a guaranteed 403 on every
  // page load — noise in the console that made a real incident harder to read, and a silent fall back
  // to hardcoded defaults (wage 50, materialMarkup 1.5) that would quietly produce wrong numbers if a
  // non-staff surface ever consumed this context. Don't request what you're not allowed to have.
  //
  // The repair intake form doesn't rely on this: it reads /api/admin/settings directly, which now
  // serves a quoting subset to non-staff.
  //
  // Keyed on the user's role, not the session object: useSession hands back a new
  // session object on every /api/auth/session poll, so an identity dep refetches in a loop.
  const sessionRole = session?.user?.role;
  useEffect(() => {
    if (sessionRole && STAFF_ROLES.includes(sessionRole)) {
      fetchAdminSettings();
    } else {
      // Defaults when unauthenticated, or when this caller isn't entitled to the real settings.
      setAdminSettings(defaultSettings);
      setLoading(false);
    }
  }, [sessionRole, fetchAdminSettings, defaultSettings]);

  const contextValue = {
    adminSettings,
    loading,
    error,
    updateAdminSettings,
    refreshSettings,
    defaultSettings
  };

  return (
    <AdminSettingsContext.Provider value={contextValue}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

export default AdminSettingsContext;
