import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/lib/database';

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
      business: settings.business,
      version: settings.version,
      updatedAt: settings.updatedAt,
      security: {
        requiresCode: settings.security?.requiresCodeForPricing || true,
        codeExpired: settings.security?.expiresAt ? new Date() > new Date(settings.security.expiresAt) : true
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
    const { pricing, securityCode, business } = body;

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
    const isCodeValid = adminSettings.security?.securityCode === securityCode;
    const isCodeExpired = adminSettings.security?.expiresAt ? 
      new Date() > new Date(adminSettings.security.expiresAt) : true;

    if (!isCodeValid || isCodeExpired) {
      return NextResponse.json({ error: 'Invalid or expired security code' }, { status: 403 });
    }

    // Validate pricing inputs
    if (pricing) {
      const { wage, administrativeFee, businessFee, consumablesFee } = pricing;
      
      if (wage < 0 || wage > 200) {
        return NextResponse.json({ error: 'Invalid wage amount' }, { status: 400 });
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
    }

    // Update settings
    const updatedSettings = {
      ...adminSettings,
      pricing: pricing || adminSettings.pricing,
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
        const materialMarkup = task.materialCost * 1.5;
        const subtotal = laborCost + materialMarkup;
        
        const businessMultiplier = pricingSettings.administrativeFee + 
                                 pricingSettings.businessFee + 
                                 pricingSettings.consumablesFee + 1;
        
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
                  businessMultiplier: businessMultiplier,
                  wage: pricingSettings.wage,
                  fees: {
                    administrative: pricingSettings.administrativeFee,
                    business: pricingSettings.businessFee,
                    consumables: pricingSettings.consumablesFee
                  }
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
