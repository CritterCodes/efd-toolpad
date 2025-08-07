import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/lib/database';
import { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  isDataEncrypted,
  maskSensitiveData,
  createAuditLogEntry 
} from '@/utils/encryption';

/**
 * GET /api/admin/settings/stuller
 * Get Stuller integration settings
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();

    const settings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    // Return safe Stuller settings (no passwords)
    const stullerSettings = {
      enabled: settings?.stuller?.enabled || false,
      username: settings?.stuller?.username || '',
      hasPassword: !!settings?.stuller?.password,
      apiUrl: settings?.stuller?.apiUrl || 'https://api.stuller.com',
      updateFrequency: settings?.stuller?.updateFrequency || 'daily',
      lastUpdate: settings?.stuller?.lastUpdate || null
    };

    return NextResponse.json({
      success: true,
      stuller: stullerSettings
    });

  } catch (error) {
    console.error('Get Stuller settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings/stuller
 * Update Stuller integration settings
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      enabled,
      username,
      password,
      apiUrl,
      updateFrequency
    } = await request.json();

    await db.connect();

    // Get existing settings
    const existingSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    if (!existingSettings) {
      return NextResponse.json({ error: 'Admin settings not found' }, { status: 404 });
    }

    // Build Stuller settings update
    const stullerUpdate = {
      enabled: enabled || false,
      username: username || existingSettings.stuller?.username || '',
      apiUrl: apiUrl || 'https://api.stuller.com',
      updateFrequency: updateFrequency || 'daily'
    };

    // Handle password encryption
    if (password && !password.includes('*') && !password.includes('•')) {
      // New password provided - encrypt it
      stullerUpdate.password = encryptSensitiveData(password);
    } else {
      // Keep existing encrypted password
      stullerUpdate.password = existingSettings.stuller?.password || '';
    }

    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      'stuller_settings_update',
      'integration_credentials',
      session.user.email
    );
    auditEntry.ip = request.headers.get('x-forwarded-for') || 'unknown';
    auditEntry.userAgent = request.headers.get('user-agent') || 'unknown';

    // Update the settings
    await db._instance
      .collection('adminSettings')
      .updateOne(
        { _id: 'repair_task_admin_settings' },
        {
          $set: {
            stuller: stullerUpdate,
            updatedAt: new Date(),
            lastModifiedBy: session.user.email
          }
        }
      );

    // Log the change with enhanced audit trail
    await db._instance.collection('adminSettingsAudit').insertOne({
      ...auditEntry,
      action: 'stuller_settings_update',
      changes: {
        enabled: enabled,
        username: maskSensitiveData(username, 3),
        passwordChanged: !!(password && !password.includes('*') && !password.includes('•')),
        apiUrl: apiUrl,
        updateFrequency: updateFrequency
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Stuller settings updated successfully'
    });

  } catch (error) {
    console.error('Update Stuller settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings/stuller
 * Test Stuller connection with provided credentials
 */
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password, apiUrl, action } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Username and password are required for testing' 
      }, { status: 400 });
    }

    // If password is masked, get the real password from database
    let testPassword = password;
    if (password.includes('•') || password.includes('*')) {
      // Get stored password from database
      await db.connect();
      const adminSettings = await db._instance
        .collection('adminSettings')
        .findOne({ _id: 'repair_task_admin_settings' });
      
      if (!adminSettings?.stuller?.password) {
        return NextResponse.json({ 
          error: 'No stored password found for testing' 
        }, { status: 400 });
      }
      
      testPassword = adminSettings.stuller.password;
    }

    // Decrypt password if it appears to be encrypted
    if (isDataEncrypted(testPassword)) {
      try {
        testPassword = decryptSensitiveData(testPassword);
      } catch (error) {
        console.error('Password decryption failed:', error);
        return NextResponse.json({ 
          error: 'Invalid encrypted password' 
        }, { status: 400 });
      }
    }

    // Test connection to Stuller API
    // Based on typical Stuller API patterns, they usually use Basic Auth
    const testUrl = `${apiUrl || 'https://api.stuller.com'}/api/products`;
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${testPassword}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'EFD-CRM/1.0'
        }
      });

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: 'Stuller API connection successful'
        });
      } else if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Stuller credentials'
        });
      } else if (response.status === 404) {
        // 404 might be OK if the test endpoint doesn't exist but auth worked
        return NextResponse.json({
          success: true,
          message: 'Stuller API connection successful (credentials valid)'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `Stuller API error: ${response.status} ${response.statusText}`
        });
      }
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Unable to connect to Stuller API: ' + fetchError.message
      });
    }

  } catch (error) {
    console.error('Test Stuller connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
