import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
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
      console.log('Missing Stuller credentials:', { 
        hasUsername: !!username, 
        hasPassword: !!password 
      });
      return NextResponse.json({ 
        error: 'Stuller credentials not configured' 
      }, { status: 500 });
    }    // Decrypt password if encrypted
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
    // Use the working endpoint format from Postman test
    const requestUrl = `${stullerApiUrl}/v2/products?SKU=${itemNumber}`;
    
    console.log('Making Stuller API request:', {
      url: requestUrl,
      method: 'GET',
      hasCredentials: !!username && !!decryptedPassword,
      itemNumber: itemNumber,
      username: username ? username.substring(0, 3) + '***' : 'N/A'
    });

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${decryptedPassword}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EFD-CRM/1.0'
      }
    });

    console.log('Stuller API response status:', response.status);
    console.log('Stuller API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Stuller API error response:', errorText);
      
      // Check if we got HTML instead of JSON (indicates wrong endpoint/server)
      if (errorText.includes('<!DOCTYPE html>')) {
        console.error('⚠️  Received HTML response - likely wrong API endpoint or server configuration');
        return NextResponse.json({ 
          error: 'Invalid API endpoint - received HTML instead of JSON. Check Stuller API configuration.' 
        }, { status: 500 });
      }
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Item not found in Stuller catalog' 
        }, { status: 404 });
      }
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid Stuller credentials' 
        }, { status: 401 });
      }
      throw new Error(`Stuller API error: ${response.status} - ${errorText.substring(0, 200)}...`);
    }

    const stullerData = await response.json();

    // 🔍 LOG THE RAW STULLER API RESPONSE
    console.log('\n📦 === STULLER API RESPONSE === 📦');
    console.log('Raw Stuller Data:', JSON.stringify(stullerData, null, 2));
    console.log('Data Type:', typeof stullerData);
    console.log('Is Array:', Array.isArray(stullerData));
    
    // Log specific fields we're interested in for material creation
    console.log('\n🔍 === KEY FIELDS FOR MATERIAL CREATION === 🔍');
    console.log('Item Number:', stullerData.itemNumber || stullerData.ItemNumber || stullerData.sku || stullerData.SKU);
    console.log('Description:', stullerData.description || stullerData.Description || stullerData.shortDescription);
    console.log('Long Description:', stullerData.longDescription || stullerData.LongDescription);
    console.log('Category:', stullerData.category?.name || stullerData.categoryName || stullerData.Category);
    console.log('Price:', stullerData.pricing?.retail || stullerData.price || stullerData.Price || stullerData.RetailPrice);
    console.log('Weight:', stullerData.weight || stullerData.Weight);
    console.log('Material:', stullerData.material || stullerData.Material);
    console.log('Finish:', stullerData.finish || stullerData.Finish);
    console.log('Dimensions:', stullerData.dimensions || stullerData.Dimensions);
    console.log('Images:', (stullerData.images || stullerData.Images || []).length, 'images found');
    console.log('Availability:', stullerData.availability || stullerData.Availability || stullerData.InStock);
    
    // If it's an array (like from the v2/products endpoint), log the first item
    if (Array.isArray(stullerData) && stullerData.length > 0) {
      console.log('\n📋 === FIRST PRODUCT IN ARRAY === 📋');
      console.log('First Product:', JSON.stringify(stullerData[0], null, 2));
    }
    
    // If it has a Products array property, log that
    if (stullerData.Products && Array.isArray(stullerData.Products)) {
      console.log('\n📋 === PRODUCTS ARRAY === 📋');
      console.log('Products Count:', stullerData.Products.length);
      if (stullerData.Products.length > 0) {
        console.log('First Product in Products Array:', JSON.stringify(stullerData.Products[0], null, 2));
      }
    }
    console.log('=== END STULLER DATA LOGGING ===\n');

    // Transform Stuller data to our format
    // Handle both single product and array responses
    let productData = stullerData;
    if (Array.isArray(stullerData) && stullerData.length > 0) {
      productData = stullerData[0];
    } else if (stullerData.Products && Array.isArray(stullerData.Products) && stullerData.Products.length > 0) {
      productData = stullerData.Products[0];
    }

    // Helper function to extract descriptive elements
    const getDescriptiveElement = (elements, name) => {
      const element = elements?.find(el => el.Name === name);
      return element ? { value: element.Value, displayValue: element.DisplayValue } : null;
    };

    const descriptiveElements = productData.DescriptiveElementGroup?.DescriptiveElements || [];

    const transformedData = {
      itemNumber: productData.itemNumber || productData.ItemNumber || productData.sku || productData.SKU || itemNumber,
      description: productData.description || productData.Description || productData.shortDescription || productData.ShortDescription,
      longDescription: productData.longDescription || productData.LongDescription || productData.DetailedDescription || productData.GroupDescription,
      
      // Enhanced category hierarchy from Stuller's merchandising system
      category: {
        primary: productData.MerchandisingCategory3 || productData.GroupDescription,
        secondary: productData.MerchandisingCategory4,
        group: productData.GroupDescription,
        area: productData.MerchandisingArea,
        hierarchy: [
          productData.MerchandisingCategory1,
          productData.MerchandisingCategory2,
          productData.MerchandisingCategory3,
          productData.MerchandisingCategory4
        ].filter(Boolean).join(' → ')
      },
      
      // Better price handling - extract the numeric value from Stuller's Price object
      price: productData.Price?.Value || productData.pricing?.retail || productData.price || 
             productData.Price || productData.RetailPrice || productData.ListPrice,
      showcasePrice: productData.ShowcasePrice?.Value,
      currency: productData.Price?.CurrencyCode || 'USD',
      
      // Enhanced weight and dimensions
      weight: productData.weight || productData.Weight || productData.GramWeight,
      weightUnit: productData.WeightUnitOfMeasure || 'grams',
      gramWeight: productData.GramWeight,
      
      // Enhanced metal information extraction
      metal: {
        type: getDescriptiveElement(descriptiveElements, 'Quality')?.displayValue || productData.QualityCatalogValue,
        quality: getDescriptiveElement(descriptiveElements, 'Quality')?.value || productData.QualityCatalogValue,
        alloyNumber: getDescriptiveElement(descriptiveElements, 'Alloy Number')?.displayValue,
        shape: getDescriptiveElement(descriptiveElements, 'Metal Shape')?.displayValue,
        series: getDescriptiveElement(descriptiveElements, 'Series')?.displayValue
      },
      
      // Extract physical dimensions with proper parsing
      dimensions: {
        width: getDescriptiveElement(descriptiveElements, 'Width')?.displayValue,
        thickness: getDescriptiveElement(descriptiveElements, 'Thickness')?.displayValue,
        length: getDescriptiveElement(descriptiveElements, 'Length')?.displayValue,
        formatted: (() => {
          const width = getDescriptiveElement(descriptiveElements, 'Width')?.displayValue;
          const thickness = getDescriptiveElement(descriptiveElements, 'Thickness')?.displayValue;
          const length = getDescriptiveElement(descriptiveElements, 'Length')?.displayValue;
          
          const dims = [];
          if (width) dims.push(`W: ${width}`);
          if (thickness) dims.push(`T: ${thickness}`);
          if (length) dims.push(`L: ${length}`);
          
          return dims.length > 0 ? dims.join(', ') : null;
        })()
      },
      
      // Legacy fields for backward compatibility
      material: getDescriptiveElement(descriptiveElements, 'Quality')?.displayValue || productData.QualityCatalogValue,
      finish: getDescriptiveElement(descriptiveElements, 'Metal Shape')?.displayValue,
      
      images: productData.images || productData.Images || [],
      
      // Enhanced specifications with better organization
      specifications: (() => {
        const specs = {};
        
        // Add all descriptive elements
        descriptiveElements.forEach(element => {
          specs[element.Name] = {
            value: element.Value,
            displayValue: element.DisplayValue
          };
        });
        
        // Add other useful Stuller fields
        if (productData.UnitOfSale) specs['Unit of Sale'] = { value: productData.UnitOfSale, displayValue: productData.UnitOfSale };
        if (productData.LeadTime) specs['Lead Time'] = { value: productData.LeadTime, displayValue: `${productData.LeadTime} days` };
        if (productData.ProductType) specs['Product Type'] = { value: productData.ProductType, displayValue: productData.ProductType };
        if (productData.CountryOfOrigin) specs['Country of Origin'] = { value: productData.CountryOfOrigin, displayValue: productData.CountryOfOrigin };
        if (productData.OnHand !== undefined) specs['Stock Quantity'] = { value: productData.OnHand, displayValue: `${productData.OnHand} in stock` };
        if (productData.HarmonizedCode) specs['Harmonized Code'] = { value: productData.HarmonizedCode, displayValue: productData.HarmonizedCode };
        
        return specs;
      })(),
      
      // Enhanced availability and stock information
      stock: {
        available: productData.availability || productData.Availability || productData.InStock || 
                  productData.Status || (productData.Orderable ? 'In Stock' : 'unknown'),
        onHand: productData.OnHand,
        orderable: productData.Orderable,
        status: productData.Status,
        leadTime: productData.LeadTime
      },
      
      // Business and catalog information
      business: {
        id: productData.Id,
        productType: productData.ProductType,
        unitOfSale: productData.UnitOfSale,
        isOnPriceList: productData.IsOnPriceList,
        ringSizable: productData.RingSizable,
        readyToWear: productData.ReadyToWear,
        hazardous: productData.Hazardous,
        heavy: productData.Heavy,
        countryOfOrigin: productData.CountryOfOrigin,
        harmonizedCode: productData.HarmonizedCode,
        creationDate: productData.CreationDate
      },
      
      // Merchandising category breakdown
      merchandising: {
        area: productData.MerchandisingArea,
        categories: {
          level1: productData.MerchandisingCategory1,
          level2: productData.MerchandisingCategory2,
          level3: productData.MerchandisingCategory3,
          level4: productData.MerchandisingCategory4
        },
        fullPath: [
          productData.MerchandisingArea,
          productData.MerchandisingCategory1,
          productData.MerchandisingCategory2,
          productData.MerchandisingCategory3,
          productData.MerchandisingCategory4
        ].filter(Boolean).join(' → ')
      },
      
      lastUpdated: new Date().toISOString(),
      source: 'stuller-api-v2'
    };    console.log('\n✨ === TRANSFORMED DATA FOR MATERIAL CREATION === ✨');
    console.log('Transformed Data:', JSON.stringify(transformedData, null, 2));
    console.log('=== END TRANSFORMATION LOGGING ===\n');

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
