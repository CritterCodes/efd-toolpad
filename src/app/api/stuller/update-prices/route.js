import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import pricingEngine from '@/services/PricingEngine';
import { TasksService } from '@/app/api/tasks/service';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';
import { updateStullerProductPricing } from '@/utils/material-pricing.util';

/**
 * Fetch a price field flexibly from a Stuller product response.
 */
function getFetchedPrice(stullerData) {
  return parseFloat(
    stullerData?.pricing?.retail ??
    stullerData?.price ??
    stullerData?.data?.pricing?.retail ??
    0
  ) || 0;
}

function getStullerProduct(stullerPayload) {
  if (Array.isArray(stullerPayload)) {
    return stullerPayload[0] || null;
  }

  if (Array.isArray(stullerPayload?.products)) {
    return stullerPayload.products[0] || null;
  }

  if (Array.isArray(stullerPayload?.Products)) {
    return stullerPayload.Products[0] || null;
  }

  if (Array.isArray(stullerPayload?.items)) {
    return stullerPayload.items[0] || null;
  }

  return stullerPayload || null;
}

function getItemNumber(product, material) {
  return product?.stullerItemNumber || product?.stuller_item_number || material?.stuller_item_number || null;
}

function getProductLastUpdated(product, material) {
  return product?.lastUpdated || material?.last_price_update || null;
}

/**
 * After materials are updated, re-hydrate all processes with the latest
 * material costs and recalculate each process cost via PricingEngine.
 */
async function refreshProcessPricing(adminSettings) {
  const materialsCol = db._instance.collection(Constants.MATERIALS_COLLECTION);
  const processesCol = db._instance.collection(Constants.PROCESSES_COLLECTION);

  const [materials, processes] = await Promise.all([
    materialsCol.find({ isActive: { $ne: false } }).toArray(),
    processesCol.find({ isActive: { $ne: false } }).toArray(),
  ]);

  if (processes.length === 0) {
    return 0;
  }

  const materialsById = new Map(materials.map((m) => [String(m._id), m]));

  const ops = processes.map((process) => {
    const hydratedMaterials = (process.materials || []).map((sel) => {
      const id = sel?.materialId || sel?._id;
      const latest = id ? materialsById.get(String(id)) : null;
      if (!latest) return sel;
      return {
        ...latest,
        ...sel,
        _id: latest._id,
        materialId: id,
        quantity: parseFloat(sel?.quantity ?? latest?.quantity ?? 1) || 1,
        portionsPerUnit: sel?.portionsPerUnit || latest?.portionsPerUnit || 1,
        stullerProducts: latest.stullerProducts || sel.stullerProducts || [],
      };
    });

    const updatedPricing = pricingEngine.calculateProcessCost(
      { ...process, materials: hydratedMaterials },
      adminSettings
    );

    return {
      updateOne: {
        filter: { _id: process._id },
        update: {
          $set: {
            materials: hydratedMaterials,
            pricing: updatedPricing,
            updatedAt: new Date(),
          },
        },
      },
    };
  });

  const result = await processesCol.bulkWrite(ops);
  return result.modifiedCount || 0;
}

/**
 * POST /api/stuller/update-prices
 * 1. Pull fresh prices from Stuller for auto-update materials
 * 2. Cascade: recalculate process costs from updated materials
 * 3. Cascade: recalculate task prices from updated processes
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { force = false } = await request.json();

    await db.connect();

    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    if (!adminSettings?.stuller?.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Stuller integration is disabled',
        updated: 0,
      });
    }

    const { username, password, apiUrl } = adminSettings.stuller;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Stuller credentials not configured' },
        { status: 500 }
      );
    }

    let decryptedPassword = password;
    if (isDataEncrypted(password)) {
      try {
        decryptedPassword = decryptSensitiveData(password);
      } catch (err) {
        console.error('Failed to decrypt Stuller password:', err);
        return NextResponse.json(
          { error: 'Failed to decrypt credentials' },
          { status: 500 }
        );
      }
    }

    const materialsCol = db._instance.collection(Constants.MATERIALS_COLLECTION);
    const legacyMaterialsCol = db._instance.collection('repairMaterials');

    const [materials, legacyMaterials] = await Promise.all([
      materialsCol
        .find({
          isActive: { $ne: false },
          $or: [
            { 'stullerProducts.stullerItemNumber': { $exists: true, $ne: null } },
            { 'stullerProducts.stuller_item_number': { $exists: true, $ne: null } },
            { stuller_item_number: { $exists: true, $ne: null } }
          ]
        })
        .toArray(),
      legacyMaterialsCol
        .find({ stuller_item_number: { $exists: true, $ne: null }, auto_update_pricing: true, isActive: true })
        .toArray()
        .catch(() => []),
    ]);

    if (materials.length === 0 && legacyMaterials.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No materials found with Stuller auto-update enabled',
        updated: 0,
      });
    }

    const stullerApiUrl = apiUrl || 'https://api.stuller.com';
    const authHeader = `Basic ${Buffer.from(`${username}:${decryptedPassword}`).toString('base64')}`;
    const fetchHeaders = {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'EFD-CRM/1.0',
    };

    let updated = 0;
    let variantsUpdated = 0;
    const errors = [];

    // ── Step 1: Update current-format materials ──────────────────────────────
    for (const material of materials) {
      try {
        const now = new Date();
        const products = material.stullerProducts?.length
          ? material.stullerProducts
          : [{
              stullerItemNumber: material.stuller_item_number,
              autoUpdatePricing: material.auto_update_pricing !== false,
              markupRate: parseFloat(adminSettings?.pricing?.materialMarkup) || 1,
            }];

        let materialChanged = false;
        const updatedProducts = [];

        for (const product of products) {
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
          const hoursSince = lastUpdate ? (now - lastUpdate) / (1000 * 60 * 60) : Infinity;
          if (!force && hoursSince < 24) {
            updatedProducts.push(product);
            continue;
          }

          const encodedSku = encodeURIComponent(itemNumber);
          const res = await fetch(
            `${stullerApiUrl}/v2/products?SKU=${encodedSku}`,
            { method: 'GET', headers: fetchHeaders }
          );

          if (!res.ok) {
            errors.push(`Failed to fetch ${itemNumber}: ${res.status}`);
            updatedProducts.push(product);
            continue;
          }

          const stullerPayload = await res.json();
          const stullerData = getStullerProduct(stullerPayload);
          const newPrice = getFetchedPrice(stullerData);
          if (!newPrice) {
            updatedProducts.push(product);
            continue;
          }

          const normalized = updateStullerProductPricing(
            {
              ...product,
              stullerPrice: newPrice,
              markupRate: parseFloat(product.markupRate) || parseFloat(adminSettings?.pricing?.materialMarkup) || 1,
            },
            material.portionsPerUnit || 1
          );

          updatedProducts.push(normalized);
          materialChanged = true;
          variantsUpdated++;

          await new Promise((r) => setTimeout(r, 100));
        }

        if (!materialChanged) {
          continue;
        }

        const primaryProduct = updatedProducts[0] || null;
        await materialsCol.updateOne(
          { _id: material._id },
          {
            $set: {
              stullerProducts: updatedProducts,
              unitCost: primaryProduct?.markedUpPrice || material.unitCost || 0,
              costPerPortion: primaryProduct?.costPerPortion || material.costPerPortion || 0,
              last_price_update: now,
              updatedAt: now,
              updatedBy: 'stuller_auto_update',
            },
          }
        );

        updated++;
      } catch (err) {
        console.error(`Error updating material ${material.displayName || material.name}:`, err);
        errors.push(`Error updating ${material.displayName || material.name}: ${err.message}`);
      }
    }

    // ── Step 2: Update legacy-format materials ───────────────────────────────
    for (const material of legacyMaterials) {
      try {
        const now = new Date();
        const lastUpdate = material.last_price_update ? new Date(material.last_price_update) : null;
        const hoursSince = lastUpdate ? (now - lastUpdate) / (1000 * 60 * 60) : Infinity;

        if (!force && hoursSince < 24) continue;

        const encodedSku = encodeURIComponent(material.stuller_item_number);
        const res = await fetch(
          `${stullerApiUrl}/v2/products?SKU=${encodedSku}`,
          { method: 'GET', headers: fetchHeaders }
        );

        if (!res.ok) {
          errors.push(`Failed to fetch legacy ${material.stuller_item_number}: ${res.status}`);
          continue;
        }

        const stullerPayload = await res.json();
        const stullerData = getStullerProduct(stullerPayload);
        const newPrice = getFetchedPrice(stullerData);

        if (!newPrice) continue;

        await legacyMaterialsCol.updateOne(
          { _id: material._id },
          {
            $set: {
              unitCost: newPrice,
              last_price_update: now,
              updatedAt: now,
              updatedBy: 'stuller_auto_update',
            },
          }
        );

        updated++;
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(`Error updating legacy material ${material.stuller_item_number}:`, err);
        errors.push(`Error updating legacy ${material.stuller_item_number}: ${err.message}`);
      }
    }

    // ── Step 3: Cascade → recalculate processes ──────────────────────────────
    let processesUpdated = 0;
    try {
      processesUpdated = await refreshProcessPricing(adminSettings);
    } catch (err) {
      console.error('Process cascade failed:', err);
      errors.push(`Process cascade error: ${err.message}`);
    }

    // ── Step 4: Cascade → recalculate tasks ──────────────────────────────────
    let tasksUpdated = 0;
    try {
      const tasksResult = await TasksService.recalculateAllTaskPrices();
      tasksUpdated = tasksResult?.data?.updated ?? tasksResult?.updated ?? 0;
    } catch (err) {
      console.error('Task cascade failed:', err);
      errors.push(`Task cascade error: ${err.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} materials, ${processesUpdated} processes, and ${tasksUpdated} tasks`,
      materialsUpdated: updated,
      variantsUpdated,
      processesUpdated,
      tasksUpdated,
      total: materials.length + legacyMaterials.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Stuller price update error:', error);
    return NextResponse.json(
      { error: 'Failed to update prices from Stuller', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stuller/update-prices
 * Return status of materials with Stuller auto-update enabled
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();

    const materials = await db._instance
      .collection(Constants.MATERIALS_COLLECTION)
      .find({
        isActive: { $ne: false },
        $or: [
          {
            stullerProducts: {
              $elemMatch: {
                autoUpdatePricing: true,
                stullerItemNumber: { $exists: true, $ne: null }
              }
            }
          },
          {
            stullerProducts: {
              $elemMatch: {
                autoUpdatePricing: true,
                stuller_item_number: { $exists: true, $ne: null }
              }
            }
          },
          {
            stuller_item_number: { $exists: true, $ne: null },
            auto_update_pricing: true
          }
        ]
      })
      .project({
        displayName: 1,
        stullerProducts: 1,
        stuller_item_number: 1,
        unitCost: 1,
        last_price_update: 1,
        supplier: 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      materials,
      count: materials.length,
    });
  } catch (error) {
    console.error('Get Stuller update status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
