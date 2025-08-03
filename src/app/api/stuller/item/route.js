import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';

/**
 * POST /api/stuller/item
 * Fetch item data from Stuller API
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemNumber } = await request.json();

    if (!itemNumber) {
      return NextResponse.json({ 
        error: 'Item number is required' 
      }, { status: 400 });
    }

    // Get Stuller credentials from settings
    await db.connect();
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    if (!adminSettings?.stuller?.enabled) {
      return NextResponse.json({ 
        error: 'Stuller integration is not enabled' 
      }, { status: 400 });
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

    // Fetch from Stuller API using Basic Auth
    const stullerApiUrl = apiUrl || 'https://api.stuller.com';
    const response = await fetch(`${stullerApiUrl}/api/products/${itemNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${decryptedPassword}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EFD-CRM/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Item not found in Stuller catalog' 
        }, { status: 404 });
      }
      throw new Error(`Stuller API error: ${response.status}`);
    }

    const stullerData = await response.json();

    // Transform Stuller data to our format
    const transformedData = {
      itemNumber: stullerData.itemNumber || itemNumber,
      description: stullerData.description || stullerData.shortDescription,
      longDescription: stullerData.longDescription,
      category: stullerData.category?.name || stullerData.categoryName,
      price: stullerData.pricing?.retail || stullerData.price,
      weight: stullerData.weight,
      dimensions: stullerData.dimensions,
      material: stullerData.material,
      finish: stullerData.finish,
      images: stullerData.images || [],
      specifications: stullerData.specifications || {},
      availability: stullerData.availability || 'unknown',
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      source: 'stuller'
    });

  } catch (error) {
    console.error('Stuller API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data from Stuller', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/stuller/item
 * Get cached Stuller item data
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemNumber = searchParams.get('itemNumber');

    if (!itemNumber) {
      return NextResponse.json({ 
        error: 'Item number is required' 
      }, { status: 400 });
    }

    // This could be expanded to check our database for cached Stuller data
    // For now, just forward to the POST endpoint
    return NextResponse.json({
      message: 'Use POST method to fetch fresh data from Stuller'
    });

  } catch (error) {
    console.error('Get Stuller item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
