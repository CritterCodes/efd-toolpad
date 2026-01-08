import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';

/**
 * POST /api/stuller/update-prices
 * Update material prices from Stuller for materials with auto_update_pricing enabled
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { force = false } = await request.json();

    await db.connect();

    // Get Stuller credentials from settings
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    if (!adminSettings?.stuller?.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Stuller integration is disabled',
        updated: 0
      });
    }

    const { username, password, apiUrl } = adminSettings.stuller;
    
    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Stuller credentials not configured' 
      }, { status: 500 });
    }

    // Decrypt password if encrypted
    let decryptedPassword = password;
    if (isDataEncrypted(password)) {
      try {
        decryptedPassword = decryptSensitiveData(password);
      } catch (error) {
        console.error('Failed to decrypt Stuller password:', error);
        return NextResponse.json({ 
          error: 'Failed to decrypt credentials' 
        }, { status: 500 });
      }
    }

    // Get materials that have Stuller item numbers and auto-update enabled
    const materials = await db._instance
      .collection('repairMaterials')
      .find({
        stuller_item_number: { $exists: true, $ne: null },
        auto_update_pricing: true,
        isActive: true
      })
      .toArray();

    if (materials.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No materials found with Stuller auto-update enabled',
        updated: 0
      });
    }

    const stullerApiUrl = apiUrl || 'https://api.stuller.com';

    let updated = 0;
    let errors = [];

    // Update each material
    for (const material of materials) {
      try {
        // Check if we should update (based on last update time)
        const now = new Date();
        const lastUpdate = material.last_price_update ? new Date(material.last_price_update) : null;
        const hoursSinceUpdate = lastUpdate ? (now - lastUpdate) / (1000 * 60 * 60) : Infinity;

        // Skip if updated recently (unless forced)
        if (!force && hoursSinceUpdate < 24) {
          continue;
        }

        // Fetch current price from Stuller
        const response = await fetch(`${stullerApiUrl}/api/products/${material.stuller_item_number}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${decryptedPassword}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'EFD-CRM/1.0'
          }
        });

        if (!response.ok) {
          errors.push(`Failed to fetch ${material.stuller_item_number}: ${response.status}`);
          continue;
        }

        const stullerData = await response.json();
        const newPrice = stullerData.pricing?.retail || stullerData.price;

        if (newPrice && newPrice !== material.unitCost) {
          // Update material price
          await db._instance
            .collection('repairMaterials')
            .updateOne(
              { _id: material._id },
              {
                $set: {
                  unitCost: parseFloat(newPrice),
                  last_price_update: now,
                  updatedAt: now,
                  updatedBy: 'stuller_auto_update'
                }
              }
            );
          
          updated++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error updating material ${material.stuller_item_number}:`, error);
        errors.push(`Error updating ${material.stuller_item_number}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} materials from Stuller`,
      updated,
      total: materials.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Stuller price update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update prices from Stuller', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/stuller/update-prices
 * Get status of materials with Stuller auto-update enabled
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();

    const materials = await db._instance
      .collection('repairMaterials')
      .find({
        stuller_item_number: { $exists: true, $ne: null },
        auto_update_pricing: true,
        isActive: true
      })
      .project({
        displayName: 1,
        stuller_item_number: 1,
        unitCost: 1,
        last_price_update: 1,
        supplier: 1
      })
      .toArray();

    return NextResponse.json({
      success: true,
      materials,
      count: materials.length
    });

  } catch (error) {
    console.error('Get Stuller update status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
