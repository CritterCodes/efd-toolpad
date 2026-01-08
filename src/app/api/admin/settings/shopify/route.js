import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  isDataEncrypted,
  maskSensitiveData,
  createAuditLogEntry 
} from '@/utils/encryption';

/**
 * GET /api/admin/settings/shopify
 * Get Shopify integration settings
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

    // Return safe Shopify settings (no access tokens)
    const shopifySettings = {
      enabled: settings?.shopify?.enabled || false,
      shopUrl: settings?.shopify?.shopUrl || '',
      hasAccessToken: !!settings?.shopify?.accessToken,
      apiVersion: settings?.shopify?.apiVersion || '2025-07',
      webhooksEnabled: settings?.shopify?.webhooksEnabled || false,
      lastUpdate: settings?.shopify?.lastUpdate || null
    };

    return NextResponse.json({
      success: true,
      shopify: shopifySettings
    });

  } catch (error) {
    console.error('Get Shopify settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings/shopify
 * Update Shopify integration settings
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      enabled,
      shopUrl,
      accessToken,
      apiVersion,
      webhooksEnabled
    } = await request.json();

    await db.connect();

    // Get existing settings
    const existingSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    if (!existingSettings) {
      return NextResponse.json({ error: 'Admin settings not found' }, { status: 404 });
    }

    // Build Shopify settings update
    const shopifyUpdate = {
      enabled: enabled || false,
      shopUrl: shopUrl || existingSettings.shopify?.shopUrl || '',
      apiVersion: apiVersion || '2025-07',
      webhooksEnabled: webhooksEnabled || false
    };

    // Handle access token encryption
    if (accessToken && !accessToken.includes('*') && !accessToken.includes('•')) {
      // New access token provided - encrypt it
      shopifyUpdate.accessToken = encryptSensitiveData(accessToken);
    } else {
      // Keep existing encrypted access token
      shopifyUpdate.accessToken = existingSettings.shopify?.accessToken || '';
    }

    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      'shopify_settings_update',
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
            shopify: shopifyUpdate,
            updatedAt: new Date(),
            lastModifiedBy: session.user.email
          }
        }
      );

    // Log the change with enhanced audit trail
    await db._instance.collection('adminSettingsAudit').insertOne({
      ...auditEntry,
      action: 'shopify_settings_update',
      changes: {
        enabled: enabled,
        shopUrl: maskSensitiveData(shopUrl, 10),
        accessTokenChanged: !!(accessToken && !accessToken.includes('*') && !accessToken.includes('•')),
        apiVersion: apiVersion,
        webhooksEnabled: webhooksEnabled
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Shopify settings updated successfully'
    });

  } catch (error) {
    console.error('Update Shopify settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings/shopify
 * Test Shopify connection with provided credentials
 */
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopUrl, accessToken, apiVersion, action } = await request.json();

    if (!shopUrl || !accessToken) {
      return NextResponse.json({ 
        error: 'Shop URL and access token are required for testing' 
      }, { status: 400 });
    }

    // If access token is masked, get the real token from database
    let testAccessToken = accessToken;
    if (accessToken.includes('•') || accessToken.includes('*')) {
      // Get stored access token from database
      await db.connect();
      const adminSettings = await db._instance
        .collection('adminSettings')
        .findOne({ _id: 'repair_task_admin_settings' });
      
      if (!adminSettings?.shopify?.accessToken) {
        return NextResponse.json({ 
          error: 'No stored access token found for testing' 
        }, { status: 400 });
      }
      
      testAccessToken = adminSettings.shopify.accessToken;
    }

    // Decrypt access token if encrypted
    if (isDataEncrypted(testAccessToken)) {
      try {
        testAccessToken = decryptSensitiveData(testAccessToken);
      } catch (error) {
        console.error('Access token decryption failed:', error);
        return NextResponse.json({ 
          error: 'Invalid encrypted access token' 
        }, { status: 400 });
      }
    }

    // Test connection to Shopify API
    const testUrl = `https://${shopUrl}/admin/api/${apiVersion || '2025-07'}/shop.json`;
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': testAccessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const shopData = await response.json();
        return NextResponse.json({
          success: true,
          message: 'Shopify connection test successful',
          shop: {
            name: shopData.shop?.name,
            domain: shopData.shop?.domain,
            email: shopData.shop?.email
          }
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.errors || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (fetchError) {
      console.error('Shopify API test failed:', fetchError);
      return NextResponse.json({ 
        error: `Shopify connection failed: ${fetchError.message}` 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Test Shopify connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
