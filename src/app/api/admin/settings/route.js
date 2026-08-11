import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import { 
  hashSecurityCode, 
  verifySecurityCode, 
  createAuditLogEntry,
  maskSensitiveData 
} from '@/utils/encryption';
import { STAFF_ROLES } from '@/lib/designPermissions';
import { canReadPricingCatalog } from '@/lib/repairAccess';
// STAFF-ONLY. Every gate in this file was `session.user?.email?.includes('@')` — i.e. ANY
// authenticated user with a plausible email, including an artisan or a client, passed it. These
// endpoints carry pricing/catalog/credential data. The idiom appeared at 24 sites across 12 files;
// swept together rather than one at a time, which is how the last round's fix landed on the wrong
// sibling of this very file.

/**
 * GET /api/admin/settings
 * Fetch current admin settings (public pricing info only)
 */
export async function GET(request) {
  try {
    const session = await auth();
    
    // READ is open to anyone who quotes a repair (canReadPricingCatalog) — an onsite repair-ops
    // artisan or a wholesaler needs the wage/markup/tax values to price a job. WRITES below stay
    // STAFF_ROLES, and POST keeps its security code: reading the numbers is not setting them.
    if (!session?.user || !canReadPricingCatalog(session)) {
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

    // NON-STAFF GET A QUOTING SUBSET, not the whole settings document.
    //
    // Opening read access so an onsite artisan (or a wholesaler) can price a job does not mean handing
    // them EFD's books. `business` is internal operating config, `security` describes the pricing-code
    // state, and `stuller` describes an integration credential — none are needed to quote.
    //
    // `financial` is SPLIT rather than dropped: `cogMarkup` and `targetMarginFloor` are quoting inputs
    // (the customs QuoteTab reads both to price a custom order and show the margin guardrail, and
    // artisans reach customs they're assigned to), while `openingBalance` is bookkeeping. Dropping the
    // whole object would have broken customs quoting for artisans — trading one outage for another.
    //
    // Still narrower than the pre-sweep behaviour, where `email.includes('@')` handed the entire
    // payload to any authenticated caller, clients included.
    if (!STAFF_ROLES.includes(session.user.role)) {
      const { financial, business, security, stuller, ...rest } = publicSettings;
      // A WHOLESALER GETS NO `financial` AT ALL. They are an outside business — a competing retail
      // jeweler — and they never quote customs, so cogMarkup and the target margin floor tell them
      // EFD's markup structure and buy them nothing. Only the artisan side needs those, and only
      // because QuoteTab prices custom orders with them.
      const quotesCustoms = session.user.role !== 'wholesaler';
      return NextResponse.json({
        ...rest,
        ...(quotesCustoms
          // EVERY PRICING TERM QuoteTab USES MUST BE HERE. The subset is curated to withhold EFD's
          // internals, but anything the client-side preview reads and doesn't receive silently falls
          // back to a different number than the server saves — so the screen quotes one price and the
          // stored quote is another. `centerstoneMarkup` and `rushMultiplier` are here for that reason,
          // not because an artisan needs to know them.
          ? {
            financial: {
              cogMarkup: financial?.cogMarkup,
              targetMarginFloor: financial?.targetMarginFloor,
              centerstoneMarkup: financial?.centerstoneMarkup,
              rushMultiplier: financial?.rushMultiplier,
            },
          }
          : {}),
      });
    }

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
    
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
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

    // MERGED per subdocument, same reason as POST below: `pricing: pricing || existing.pricing` only
    // falls back when the key is absent ENTIRELY. Send a partial `pricing` and every key the caller
    // omitted is gone — a form that edits just the tax rate would take wholesaleDiscount, deliveryFee
    // and rushMultiplier with it. Note this is a replaceOne, so there is no server-side floor under it.
    const updatedSettings = {
      ...adminSettings,
      pricing: { ...(adminSettings.pricing || {}), ...(pricing || {}) },
      financial: { ...(adminSettings.financial || {}), ...(financial || {}) },
      business: { ...(adminSettings.business || {}), ...(business || {}) },
      updatedAt: new Date(),
      lastModifiedBy: session.user.email
    };

    await db._instance.collection('adminSettings').replaceOne(
      { _id: 'repair_task_admin_settings' },
      updatedSettings
    );

    // Log the change
    await db._instance.collection('adminSettingsAudit').insertOne({
      timestamp: new Date(),
      userId: session.user.email,
      action: 'settings_update',
      changes: {
        pricing: pricing || null,
        business: business || null
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
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
 * POST /api/admin/settings
 * Update financial settings (no security code required)
 */
export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
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

    // Validate financial inputs (custom-quote formula v2 — see docs §9)
    const {
      cogMarkup,
      centerstoneMarkup,
      designFeeMarkup,
      rushMultiplier,
      commissionPercentage,
      targetMarginFloor,
      defaultDesignerFee
    } = financial;

    const invalidFinancial =
      (cogMarkup != null && (cogMarkup < 1 || cogMarkup > 10)) ||
      // Same bounds as cogMarkup and as assertMarkupsSane on the per-quote value: below 1 prices under
      // cost, above 10 is a stray digit. A shop-wide default is worse to get wrong than a single quote.
      (centerstoneMarkup != null && (centerstoneMarkup < 1 || centerstoneMarkup > 10)) ||
      (designFeeMarkup != null && (designFeeMarkup < 1 || designFeeMarkup > 5)) ||
      (rushMultiplier != null && rushMultiplier < 1) ||
      (commissionPercentage != null && (commissionPercentage < 0 || commissionPercentage > 1)) ||
      (targetMarginFloor != null && (targetMarginFloor < 0 || targetMarginFloor > 1)) ||
      (defaultDesignerFee != null && defaultDesignerFee < 0);

    if (invalidFinancial) {
      return NextResponse.json({ error: 'Invalid financial values' }, { status: 400 });
    }

    // MERGED, not replaced. `financial: financial` deleted every key the caller didn't send, and no
    // caller sends all of them — the Custom Design Pricing tab posts 5 keys, so saving it silently
    // dropped `rushMultiplier` (that has been happening) and would now drop `centerstoneMarkup`, which
    // prices centre stones. The symptom is the worst kind: nothing errors, and the next quote just
    // charges a different number. Same shape as the staffCapabilities wipe.
    const updatedSettings = {
      ...adminSettings,
      financial: { ...(adminSettings.financial || {}), ...financial },
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
