import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/lib/database';
import { 
  hashSecurityCode, 
  verifySecurityCode, 
  createAuditLogEntry 
} from '@/utils/encryption';

/**
 * POST /api/admin/settings/verify-code
 * Verify security PIN for admin settings access
 */
export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { securityCode } = body;

    console.log('PIN Verification Request:', { securityCode, hasCode: !!securityCode });

    if (!securityCode) {
      return NextResponse.json({ error: 'Security PIN required' }, { status: 400 });
    }

    await db.connect();
    const settings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    console.log('Settings found:', { 
      found: !!settings, 
      hasSecurity: !!settings?.security,
      hasCode: !!settings?.security?.securityCode,
      hasExpiration: !!settings?.security?.expiresAt 
    });

    if (!settings) {
      // Initialize admin settings if they don't exist
      const newSettings = {
        _id: 'repair_task_admin_settings',
        pricing: {
          wage: 45.00,
          administrativeFee: 0.15,
          businessFee: 0.25,
          consumablesFee: 0.08
        },
        security: {
          requiresCodeForPricing: true,
          codeExpiresAfter: 3600000 // 1 hour
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db._instance.collection('adminSettings').insertOne(newSettings);
      
      return NextResponse.json({ 
        error: 'No security PIN generated yet. Please generate a PIN first.',
        needsGeneration: true
      }, { status: 400 });
    }

    // Check if security PIN exists
    if (!settings.security?.securityCode) {
      return NextResponse.json({ 
        error: 'No security PIN generated yet. Please generate a PIN first.',
        needsGeneration: true
      }, { status: 400 });
    }

    // Check if code matches and hasn't expired
    const storedCodeHash = settings.security?.securityCode;
    const isCodeValid = storedCodeHash ? verifySecurityCode(securityCode, storedCodeHash) : false;
    const isCodeExpired = settings.security?.expiresAt ? 
      new Date() > new Date(settings.security.expiresAt) : true;

    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      'security_code_verification',
      'admin_settings_access',
      session.user.email
    );
    auditEntry.ip = request.headers.get('x-forwarded-for') || 'unknown';
    auditEntry.userAgent = request.headers.get('user-agent') || 'unknown';

    if (!isCodeValid) {
      auditEntry.success = false;
      auditEntry.reason = 'invalid_code';
      await db._instance.collection('adminSettingsAudit').insertOne(auditEntry);
      
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid security code' 
      }, { status: 403 });
    }

    if (isCodeExpired) {
      auditEntry.success = false;
      auditEntry.reason = 'expired_code';
      await db._instance.collection('adminSettingsAudit').insertOne(auditEntry);
      
      return NextResponse.json({ 
        valid: false, 
        error: 'Security code has expired' 
      }, { status: 403 });
    }

    // Log successful verification
    auditEntry.success = true;
    await db._instance.collection('adminSettingsAudit').insertOne(auditEntry);

    return NextResponse.json({
      valid: true,
      message: 'Security code verified',
      expiresAt: settings.security.expiresAt
    });

  } catch (error) {
    console.error('Code verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings/verify-code
 * Generate new security code
 */
export async function PUT(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();
    
    // Generate new 4-digit security PIN
    const newSecurityCode = Math.floor(Math.random() * 9000 + 1000).toString(); // Generates 1000-9999
    const hashedCode = hashSecurityCode(newSecurityCode);
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + (60 * 60 * 1000));

    console.log('Generating new PIN:', { code: newSecurityCode, expiresAt });

    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      'security_code_generation',
      'admin_settings_security',
      session.user.email
    );
    auditEntry.ip = request.headers.get('x-forwarded-for') || 'unknown';
    auditEntry.userAgent = request.headers.get('user-agent') || 'unknown';

    // Update settings with new hashed code (or create if doesn't exist)
    await db._instance.collection('adminSettings').updateOne(
      { _id: 'repair_task_admin_settings' },
      {
        $set: {
          'security.securityCode': hashedCode,
          'security.expiresAt': expiresAt,
          'security.lastCodeChange': new Date(),
          'security.generatedBy': session.user.email,
          'security.requiresCodeForPricing': true,
          'security.codeExpiresAfter': 3600000,
          updatedAt: new Date()
        },
        $setOnInsert: {
          _id: 'repair_task_admin_settings',
          pricing: {
            wage: 45.00,
            administrativeFee: 0.15,
            businessFee: 0.25,
            consumablesFee: 0.08
          },
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Log code generation
    await db._instance.collection('adminSettingsAudit').insertOne(auditEntry);

    return NextResponse.json({
      success: true,
      securityCode: newSecurityCode,
      expiresAt: expiresAt,
      message: 'New security code generated'
    });

  } catch (error) {
    console.error('Code generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
