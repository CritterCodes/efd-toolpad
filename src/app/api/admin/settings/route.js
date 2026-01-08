import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/lib/database';
import { 
  hashSecurityCode, 
  verifySecurityCode, 
  createAuditLogEntry,
  maskSensitiveData 
} from '@/utils/encryption';

/**
 * GET /api/admin/settings
 * Fetch current admin settings (public pricing info only)
 */
export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();
    const settings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Return public settings only (no security codes)
    const publicSettings = {
      pricing: settings.pricing,
      financial: settings.financial,
      business: settings.business,
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

    return NextResponse.json(publicSettings);

  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Update admin settings and recalculate all repair task prices
 */
export async function PUT(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pricing, financial, securityCode, business } = body;

    if (!securityCode) {
      return NextResponse.json({ error: 'Security code required' }, { status: 400 });
    }

    await db.connect();
    
    // Verify security code
    const adminSettings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!adminSettings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
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
        session.user.email
      );
      auditEntry.ip = request.headers.get('x-forwarded-for') || 'unknown';
      auditEntry.success = false;
      
      await db._instance.collection('adminSettingsAudit').insertOne(auditEntry);
      
      return NextResponse.json({ error: 'Invalid or expired security code' }, { status: 403 });
    }

    // Validate pricing inputs
    if (pricing) {
      const { 
        wage, 
        materialMarkup, 
        administrativeFee, 
        businessFee, 
        consumablesFee,
        marketingFee,
        rushMultiplier,
        deliveryFee,
        taxRate
      } = pricing;
      
      if (wage < 0 || wage > 200) {
        return NextResponse.json({ error: 'Invalid wage amount' }, { status: 400 });
      }
      
      if (materialMarkup && (materialMarkup < 1 || materialMarkup > 5)) {
        return NextResponse.json({ error: 'Material markup must be between 1.0 and 5.0' }, { status: 400 });
      }
      
      if (administrativeFee < 0 || administrativeFee > 1) {
        return NextResponse.json({ error: 'Administrative fee must be between 0 and 100%' }, { status: 400 });
      }
      
      if (businessFee < 0 || businessFee > 1) {
        return NextResponse.json({ error: 'Business fee must be between 0 and 100%' }, { status: 400 });
      }
      
      if (consumablesFee < 0 || consumablesFee > 1) {
        return NextResponse.json({ error: 'Consumables fee must be between 0 and 100%' }, { status: 400 });
      }

      if (marketingFee < 0 || marketingFee > 1) {
        return NextResponse.json({ error: 'Marketing fee must be between 0 and 100%' }, { status: 400 });
      }

      if (rushMultiplier && (rushMultiplier < 1 || rushMultiplier > 5)) {
        return NextResponse.json({ error: 'Rush multiplier must be between 1.0 and 5.0' }, { status: 400 });
      }

      if (deliveryFee && (deliveryFee < 0 || deliveryFee > 500)) {
        return NextResponse.json({ error: 'Delivery fee must be between $0 and $500' }, { status: 400 });
      }

      if (taxRate && (taxRate < 0 || taxRate > 0.5)) {
        return NextResponse.json({ error: 'Tax rate must be between 0 and 50%' }, { status: 400 });
      }
    }

    // Update settings
    const updatedSettings = {
      ...adminSettings,
      pricing: pricing || adminSettings.pricing,
      financial: financial || adminSettings.financial,
      business: business || adminSettings.business,
      updatedAt: new Date(),
      lastModifiedBy: session.user.email
    };

    await db._instance.collection('adminSettings').replaceOne(
      { _id: 'repair_task_admin_settings' },
      updatedSettings
    );

    // Recalculate all repair task prices
    const recalculationResult = await recalculateAllPrices(db._instance, updatedSettings.pricing);

    // Log the change
    await db._instance.collection('adminSettingsAudit').insertOne({
      timestamp: new Date(),
      userId: session.user.email,
      action: 'settings_update',
      changes: {
        pricing: pricing || null,
        business: business || null
      },
      recalculationResult,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      recalculation: recalculationResult,
      settings: {
        pricing: updatedSettings.pricing,
        financial: updatedSettings.financial,
        business: updatedSettings.business,
        updatedAt: updatedSettings.updatedAt
      }
    });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Recalculate all repair task prices with new settings
 */
async function recalculateAllPrices(dbInstance, pricingSettings) {
  try {
    const repairTasks = await dbInstance.collection('repairTasks').find({}).toArray();
    const bulkOps = [];
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const task of repairTasks) {
      try {
        // Calculate new price using the business formula
        const laborCost = task.laborHours * pricingSettings.wage;
        const materialMarkup = task.materialCost * (pricingSettings.materialMarkup || 1.5);
        const subtotal = laborCost + materialMarkup;
        
        const businessMultiplier = pricingSettings.administrativeFee + 
                                 pricingSettings.businessFee + 
                                 pricingSettings.consumablesFee + 
                                 (pricingSettings.marketingFee || 0) + 1;
        
        const newBasePrice = Math.round(subtotal * businessMultiplier * 100) / 100;

        bulkOps.push({
          updateOne: {
            filter: { _id: task._id },
            update: {
              $set: {
                basePrice: newBasePrice,
                'pricing.calculatedAt': new Date(),
                'pricing.formula': 'v2.0_business_formula',
                'pricing.components': {
                  laborHours: task.laborHours,
                  laborCost: laborCost,
                  materialCost: task.materialCost,
                  materialMarkup: materialMarkup,
                  materialMarkupMultiplier: pricingSettings.materialMarkup || 1.5,
                  businessMultiplier: businessMultiplier,
                  wage: pricingSettings.wage,
                  fees: {
                    administrative: pricingSettings.administrativeFee,
                    business: pricingSettings.businessFee,
                    consumables: pricingSettings.consumablesFee,
                    marketing: pricingSettings.marketingFee || 0
                  },
                  // New pricing components
                  rushMultiplier: pricingSettings.rushMultiplier || 1.5,
                  deliveryFee: pricingSettings.deliveryFee || 0,
                  taxRate: pricingSettings.taxRate || 0
                }
              }
            }
          }
        });

        successCount++;

      } catch (error) {
        errorCount++;
        errors.push({
          taskId: task._id,
          sku: task.sku,
          error: error.message
        });
      }
    }

    // Execute bulk update
    if (bulkOps.length > 0) {
      const result = await dbInstance.collection('repairTasks').bulkWrite(bulkOps);
      
      return {
        totalTasks: repairTasks.length,
        updated: result.modifiedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 5), // Limit error details
        timestamp: new Date()
      };
    }

    return {
      totalTasks: 0,
      updated: 0,
      errors: 0,
      errorDetails: [],
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Price recalculation error:', error);
    throw error;
  }
}

/**
 * POST /api/admin/settings
 * Update financial settings (no security code required)
 */
export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { financial } = body;

    if (!financial) {
      return NextResponse.json({ error: 'Financial settings required' }, { status: 400 });
    }

    await db.connect();
    
    const adminSettings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!adminSettings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Invalid financial values' }, { status: 400 });
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
    await createAuditLogEntry(db._instance, {
      action: 'UPDATE_FINANCIAL_SETTINGS',
      userId: session.user.email,
      details: {
        financial: financial,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Financial settings updated successfully',
      data: {
        financial: updatedSettings.financial,
        updatedAt: updatedSettings.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating financial settings:', error);
    return NextResponse.json(
      { error: 'Failed to update financial settings: ' + error.message },
      { status: 500 }
    );
  }
}
