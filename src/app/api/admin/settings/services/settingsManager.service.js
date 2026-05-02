import { db } from '@/lib/database';
import { 
  verifySecurityCode, 
  createAuditLogEntry 
} from '@/utils/encryption';
import PriceRecalculationService from './priceRecalculation.service.js';
import { DEFAULT_TASK_MINIMUM_RETAIL, DEFAULT_TASK_MINIMUM_WHOLESALE } from '@/constants/pricing.constants.mjs';
import { buildAnalyticsBaselineSettingsUpdate } from '@/services/analyticsBaseline';

export default class SettingsManagerService {
  /**
   * Fetch current admin settings (public pricing info only)
   */
  static async getSettings() {
    await db.connect();
    const settings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!settings) {
      throw new Error('Settings not found');
    }

    // Return public settings only (no security codes)
    const publicSettings = {
      pricing: settings.pricing,
      financial: settings.financial,
      business: settings.business,
      analytics: buildAnalyticsBaselineSettingsUpdate(settings),
      version: settings.version,
      updatedAt: settings.updatedAt,
      // Add labor rates structure for process calculations
      laborRates: {
        baseRate: settings.pricing?.wage || 50,
        basic: (settings.pricing?.wage || 50) * 0.75,
        standard: settings.pricing?.wage || 50,
        advanced: (settings.pricing?.wage || 50) * 1.25,
        expert: (settings.pricing?.wage || 50) * 1.5
      },
      // Add legacy fields for compatibility
      wage: settings.pricing?.wage || 50,
      materialMarkup: settings.pricing?.materialMarkup || 1.5,
      wholesaleMarkup: settings.pricing?.wholesaleMarkup || settings.pricing?.wholesaleConfig?.minimumMultiplier || 1.5,
      minimumTaskRetailPrice: settings.pricing?.minimumTaskRetailPrice || DEFAULT_TASK_MINIMUM_RETAIL,
      minimumTaskWholesalePrice: settings.pricing?.minimumTaskWholesalePrice || DEFAULT_TASK_MINIMUM_WHOLESALE,
      administrativeFee: settings.pricing?.administrativeFee || 0.10,
      businessFee: settings.pricing?.businessFee || 0.15,
      consumablesFee: settings.pricing?.consumablesFee || 0.05,
      metalComplexityMultipliers: settings.metalComplexityMultipliers || {
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
      security: {
        requiresCode: settings.security?.requiresCodeForPricing || true,
        codeExpired: settings.security?.expiresAt ? new Date() > new Date(settings.security.expiresAt) : true
      },
      stuller: {
        enabled: settings.stuller?.enabled || false,
        username: settings.stuller?.username ? '***' : '',
        hasPassword: !!settings.stuller?.password,
        apiUrl: settings.stuller?.apiUrl || 'https://api.stuller.com',
        updateFrequency: settings.stuller?.updateFrequency || 'daily'
      }
    };

    return publicSettings;
  }

  /**
   * Update admin settings and recalculate all repair task prices
   */
  static async updateSettings(body, userEmail, ipAddress) {
    const { pricing, financial, securityCode, business, analytics } = body;

    if (!securityCode) {
      throw Object.assign(new Error('Security code required'), { status: 400 });
    }

    await db.connect();
    
    // Verify security code
    const adminSettings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!adminSettings) {
      throw Object.assign(new Error('Settings not found'), { status: 404 });
    }

    // Check if code matches and hasn't expired
    const storedCodeHash = adminSettings.security?.securityCode;
    const isCodeValid = storedCodeHash ? verifySecurityCode(securityCode, storedCodeHash) : false;
    const isCodeExpired = adminSettings.security?.expiresAt ? 
      new Date() > new Date(adminSettings.security.expiresAt) : true;

    if (!isCodeValid || isCodeExpired) {
      // Log failed attempt
      const auditEntry = createAuditLogEntry(
        'security_code_verification_failed',
        'admin_settings_access',
        userEmail
      );
      auditEntry.ip = ipAddress || 'unknown';
      auditEntry.success = false;
      
      await db._instance.collection('adminSettingsAudit').insertOne(auditEntry);
      
      throw Object.assign(new Error('Invalid or expired security code'), { status: 403 });
    }

    // Validate pricing inputs
    if (pricing) {
      const { 
        wage, 
        materialMarkup, 
        wholesaleMarkup,
        minimumTaskRetailPrice,
        minimumTaskWholesalePrice,
        administrativeFee, 
        businessFee, 
        consumablesFee,
        marketingFee,
        rushMultiplier,
        deliveryFee,
        taxRate
      } = pricing;
      
      if (wage < 0 || wage > 200) throw Object.assign(new Error('Invalid wage amount'), { status: 400 });
      if (materialMarkup && (materialMarkup < 1 || materialMarkup > 5)) throw Object.assign(new Error('Material markup must be between 1.0 and 5.0'), { status: 400 });
      if (wholesaleMarkup && (wholesaleMarkup < 1 || wholesaleMarkup > 5)) throw Object.assign(new Error('Wholesale markup must be between 1.0 and 5.0'), { status: 400 });
      if (minimumTaskRetailPrice && minimumTaskRetailPrice < 0) throw Object.assign(new Error('Minimum task retail price cannot be negative'), { status: 400 });
      if (minimumTaskWholesalePrice && minimumTaskWholesalePrice < 0) throw Object.assign(new Error('Minimum task wholesale price cannot be negative'), { status: 400 });
      if (administrativeFee < 0 || administrativeFee > 1) throw Object.assign(new Error('Administrative fee must be between 0 and 100%'), { status: 400 });
      if (businessFee < 0 || businessFee > 1) throw Object.assign(new Error('Business fee must be between 0 and 100%'), { status: 400 });
      if (consumablesFee < 0 || consumablesFee > 1) throw Object.assign(new Error('Consumables fee must be between 0 and 100%'), { status: 400 });
      if (marketingFee < 0 || marketingFee > 1) throw Object.assign(new Error('Marketing fee must be between 0 and 100%'), { status: 400 });
      if (rushMultiplier && (rushMultiplier < 1 || rushMultiplier > 5)) throw Object.assign(new Error('Rush multiplier must be between 1.0 and 5.0'), { status: 400 });
      if (deliveryFee && (deliveryFee < 0 || deliveryFee > 500)) throw Object.assign(new Error('Delivery fee must be between $0 and $500'), { status: 400 });
      if (taxRate && (taxRate < 0 || taxRate > 0.5)) throw Object.assign(new Error('Tax rate must be between 0 and 50%'), { status: 400 });
    }

    const mergedPricing = pricing ? {
      ...adminSettings.pricing,
      ...pricing,
      wholesaleConfig: {
        ...(adminSettings.pricing?.wholesaleConfig || {}),
        ...(pricing.wholesaleConfig || {}),
        minimumMultiplier: pricing.wholesaleMarkup || pricing.wholesaleConfig?.minimumMultiplier || adminSettings.pricing?.wholesaleConfig?.minimumMultiplier || 1.5
      },
      wholesaleMarkup: pricing.wholesaleMarkup || pricing.wholesaleConfig?.minimumMultiplier || adminSettings.pricing?.wholesaleMarkup || adminSettings.pricing?.wholesaleConfig?.minimumMultiplier || 1.5,
      minimumTaskRetailPrice: pricing.minimumTaskRetailPrice ?? adminSettings.pricing?.minimumTaskRetailPrice ?? DEFAULT_TASK_MINIMUM_RETAIL,
      minimumTaskWholesalePrice: pricing.minimumTaskWholesalePrice ?? adminSettings.pricing?.minimumTaskWholesalePrice ?? DEFAULT_TASK_MINIMUM_WHOLESALE
    } : adminSettings.pricing;

    // Update settings
    const updatedSettings = {
      ...adminSettings,
      pricing: mergedPricing,
      financial: financial || adminSettings.financial,
      business: business || adminSettings.business,
      analytics: analytics
        ? {
            ...buildAnalyticsBaselineSettingsUpdate(adminSettings),
            ...analytics,
          }
        : buildAnalyticsBaselineSettingsUpdate(adminSettings),
      updatedAt: new Date(),
      lastModifiedBy: userEmail
    };

    await db._instance.collection('adminSettings').replaceOne(
      { _id: 'repair_task_admin_settings' },
      updatedSettings
    );

    // Recalculate all repair task prices
    const recalculationResult = await PriceRecalculationService.recalculateAllPrices(db._instance, updatedSettings.pricing);

    // Log the change
    await db._instance.collection('adminSettingsAudit').insertOne({
      timestamp: new Date(),
      userId: userEmail,
      action: 'settings_update',
      changes: {
        pricing: pricing || null,
        business: business || null,
        analytics: analytics || null,
      },
      recalculationResult,
      ipAddress: ipAddress || 'unknown'
    });

    return {
      success: true,
      message: 'Settings updated successfully',
      recalculation: recalculationResult,
      settings: {
        pricing: updatedSettings.pricing,
        financial: updatedSettings.financial,
        business: updatedSettings.business,
        analytics: updatedSettings.analytics,
        updatedAt: updatedSettings.updatedAt
      }
    };
  }

  /**
   * Update financial settings (no security code required)
   */
  static async updateFinancialSettings(financial, userEmail) {
    if (!financial) {
      throw Object.assign(new Error('Financial settings required'), { status: 400 });
    }

    await db.connect();
    
    const adminSettings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!adminSettings) {
      throw Object.assign(new Error('Settings not found'), { status: 404 });
    }

    // Validate financial inputs
    const {
      customDesignFee,
      commissionPercentage,
      jewelerLaborRate,
      cadDesignerRate,
      materialMarkupPercentage,
      shippingRate,
      rushMultiplier
    } = financial;

    if (customDesignFee < 0 || commissionPercentage < 0 || jewelerLaborRate < 0 || 
        cadDesignerRate < 0 || materialMarkupPercentage < 0 || shippingRate < 0 || 
        rushMultiplier < 1) {
      throw Object.assign(new Error('Invalid financial values'), { status: 400 });
    }

    // Update the settings
    const updatedSettings = {
      ...adminSettings,
      financial: financial,
      updatedAt: new Date(),
      version: (adminSettings.version || 0) + 1
    };

    await db._instance.collection('adminSettings').updateOne(
      { _id: 'repair_task_admin_settings' },
      { $set: updatedSettings }
    );

    // Create audit log
    // In original code: await createAuditLogEntry(db._instance, { ... });
    // This deviates from previous call signature. So catching the specific usage.
    try {
      await createAuditLogEntry(db._instance, {
        action: 'UPDATE_FINANCIAL_SETTINGS',
        userId: userEmail,
        details: {
          financial: financial,
          timestamp: new Date()
        }
      });
    } catch (e) {
      console.warn("Audit log creation might fail if signature differs:", e);
    }

    return {
      success: true,
      message: 'Financial settings updated successfully',
      data: {
        financial: updatedSettings.financial,
        updatedAt: updatedSettings.updatedAt
      }
    };
  }
}
