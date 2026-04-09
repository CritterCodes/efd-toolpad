import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import pricingEngine from '@/services/PricingEngine';
import { TasksService } from '@/app/api/tasks/service';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';
import { updateStullerProductPricing } from '@/utils/material-pricing.util';

function getItemNumber(product, material) {
  return product?.stullerItemNumber || product?.stuller_item_number || material?.stuller_item_number || null;
}

function getProductLastUpdated(product, material) {
  return product?.lastUpdated || material?.last_price_update || null;
}

function getFetchedPrice(stullerData) {
  return parseFloat(
    stullerData?.pricing?.retail ??
    stullerData?.price ??
    stullerData?.data?.pricing?.retail ??
    0
  ) || 0;
}

async function refreshProcessesFromCurrentMaterials(adminSettings) {
  const materialsCollection = db._instance.collection(Constants.MATERIALS_COLLECTION);
  const processesCollection = db._instance.collection(Constants.PROCESSES_COLLECTION);

  const [materials, processes] = await Promise.all([
    materialsCollection.find({ isActive: { $ne: false } }).toArray(),
    processesCollection.find({ isActive: { $ne: false } }).toArray()
  ]);

  const materialsById = new Map(materials.map((material) => [String(material._id), material]));
  const updateOperations = [];

  for (const process of processes) {
    const hydratedMaterials = (process.materials || []).map((materialSelection) => {
      const materialId = materialSelection?.materialId || materialSelection?._id;
      const latestMaterial = materialId ? materialsById.get(String(materialId)) : null;

      if (!latestMaterial) {
        return materialSelection;
      }

      return {
        ...latestMaterial,
        ...materialSelection,
        _id: latestMaterial._id,
        materialId: materialId,
        quantity: parseFloat(materialSelection?.quantity || latestMaterial?.quantity || 1) || 1,
        portionsPerUnit: materialSelection?.portionsPerUnit || latestMaterial?.portionsPerUnit || 1,
        stullerProducts: latestMaterial.stullerProducts || materialSelection.stullerProducts || []
      };
    });

    const hydratedProcess = {
      ...process,
      materials: hydratedMaterials
    };

    const updatedPricing = pricingEngine.calculateProcessCost(hydratedProcess, adminSettings);

    updateOperations.push({
      updateOne: {
        filter: { _id: process._id },
        update: {
          $set: {
            materials: hydratedMaterials,
            pricing: updatedPricing,
            updatedAt: new Date()
          }
        }
      }
    });
  }

  if (updateOperations.length === 0) {
    return { updated: 0 };
  }

  const result = await processesCollection.bulkWrite(updateOperations);
  return { updated: result.modifiedCount || 0 };
}

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

    const materialsCollection = db._instance.collection(Constants.MATERIALS_COLLECTION);
    const legacyMaterialsCollection = db._instance.collection(Constants.REPAIRTASKS_COLLECTION.replace('Tasks', 'Materials'));

    const [materials, legacyMaterials] = await Promise.all([
      materialsCollection.find({
        isActive: { $ne: false },
        stullerProducts: { $exists: true, $ne: [] }
      }).toArray(),
      legacyMaterialsCollection.find({
        stuller_item_number: { $exists: true, $ne: null },
        auto_update_pricing: true,
        isActive: true
      }).toArray().catch(() => [])
    ]);

    if (materials.length === 0 && legacyMaterials.length === 0) {
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
            let updated = 0;
            let variantsUpdated = 0;
            'User-Agent': 'EFD-CRM/1.0'
          }
            // Update each current-format material and its Stuller variants

        if (!response.ok) {
          continue;
                let materialChanged = false;
                const updatedProducts = [];

                for (const product of material.stullerProducts || []) {
                  const itemNumber = getItemNumber(product, material);
                  if (!itemNumber) {
                    updatedProducts.push(product);
                    continue;
                  }

                  if (!force && product.autoUpdatePricing === false) {
                    updatedProducts.push(product);
                    continue;
                  }

                  const lastUpdateValue = getProductLastUpdated(product, material);
                  const lastUpdate = lastUpdateValue ? new Date(lastUpdateValue) : null;
                  const hoursSinceUpdate = lastUpdate ? (now - lastUpdate) / (1000 * 60 * 60) : Infinity;

                  if (!force && hoursSinceUpdate < 24) {
                    updatedProducts.push(product);
                    continue;
                  }

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
                    errors.push(`Failed to fetch ${itemNumber}: ${response.status}`);
                    updatedProducts.push(product);
                    continue;
                  }

                  const stullerData = await response.json();
                  const newPrice = getFetchedPrice(stullerData);

                  if (!newPrice) {
                    updatedProducts.push(product);
                    continue;
                  }

                  const normalizedProduct = updateStullerProductPricing(
                    {
                      ...product,
                      stullerPrice: newPrice,
                      markupRate: parseFloat(product.markupRate) || parseFloat(adminSettings?.pricing?.materialMarkup) || 1
                    },
                    material.portionsPerUnit || 1
                  );

                  updatedProducts.push({
                    ...normalizedProduct,
                    unitCost: normalizedProduct.markedUpPrice,
                    lastUpdated: now.toISOString()
                  });
                  materialChanged = true;
                  variantsUpdated++;
                }

                if (!materialChanged) {
        if (newPrice && newPrice !== material.unitCost) {
          // Update material price
          await db._instance
                const primaryProduct = updatedProducts[0] || null;
                await materialsCollection.updateOne(
                  { _id: material._id },
                  {
                    $set: {
                      stullerProducts: updatedProducts,
                      unitCost: primaryProduct?.markedUpPrice || material.unitCost || 0,
                      costPerPortion: primaryProduct?.costPerPortion || material.costPerPortion || 0,
                      last_price_update: now,
                      updatedAt: now,
                      updatedBy: 'stuller_auto_update'
                    }
                  }
                );

                updated++;
      details: error.message 
}
                console.error(`Error updating material ${material.displayName || material.name}:`, error);
                errors.push(`Error updating ${material.displayName || material.name}: ${error.message}`);
 * GET /api/stuller/update-prices
 * Get status of materials with Stuller auto-update enabled

            // Update legacy materials for backward compatibility
            for (const material of legacyMaterials) {
              try {
                const now = new Date();
                const lastUpdate = material.last_price_update ? new Date(material.last_price_update) : null;
                const hoursSinceUpdate = lastUpdate ? (now - lastUpdate) / (1000 * 60 * 60) : Infinity;

                if (!force && hoursSinceUpdate < 24) {
                  continue;
                }

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
                const newPrice = getFetchedPrice(stullerData);

                if (!newPrice) {
                  continue;
                }

                await legacyMaterialsCollection.updateOne(
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
              } catch (error) {
                errors.push(`Error updating legacy ${material.stuller_item_number}: ${error.message}`);
              }
            }

            const processesResult = await refreshProcessesFromCurrentMaterials(adminSettings);
            const tasksResult = await TasksService.recalculateAllTaskPrices();
            const tasksUpdated = tasksResult?.data?.updated || 0;
 */
export async function GET(request) {
  try {
              message: `Updated ${updated} materials, ${processesResult.updated || 0} processes, and ${tasksUpdated} tasks from current pricing data`,
    if (!session || !session.user?.email?.includes('@')) {
              materialsUpdated: updated,
              processesUpdated: processesResult.updated || 0,
              tasksUpdated,
              variantsUpdated,
              total: materials.length + legacyMaterials.length,
    }

    await db.connect();

    const currentMaterials = await db._instance
      .collection(Constants.MATERIALS_COLLECTION)
      .find({
        isActive: { $ne: false },
        stullerProducts: { $exists: true, $ne: [] }
      })
      .project({
        displayName: 1,
        name: 1,
        unitCost: 1,
        last_price_update: 1,
        supplier: 1,
        stullerProducts: 1
      })
      .toArray();

    const legacyMaterials = await db._instance
      .collection(Constants.REPAIRTASKS_COLLECTION.replace('Tasks', 'Materials'))
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
      .toArray()
      .catch(() => []);

    const normalizedCurrentMaterials = currentMaterials.map((material) => {
      const autoUpdateProduct = material.stullerProducts?.find((product) => product.autoUpdatePricing !== false) || material.stullerProducts?.[0];
      return {
        _id: material._id,
        displayName: material.displayName || material.name,
        stuller_item_number: autoUpdateProduct?.stullerItemNumber || 'Multiple Variants',
        unitCost: autoUpdateProduct?.markedUpPrice || material.unitCost || 0,
        last_price_update: autoUpdateProduct?.lastUpdated || material.last_price_update,
        supplier: material.supplier || 'Stuller'
      };
    });

    const materials = [...normalizedCurrentMaterials, ...legacyMaterials];

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
