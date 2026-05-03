import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import { normalizeStullerProductResponse } from '@/services/stuller/stullerMappers';
import { stullerRequest } from '@/services/stuller/stullerClient';

/**
 * Fetch a price field flexibly from a Stuller product response.
 */
function getFetchedPrice(stullerData) {
  return parseFloat(
    stullerData?.Price?.Value ??
    stullerData?.pricing?.retail ??
    stullerData?.price ??
    stullerData?.data?.pricing?.retail ??
    0
  ) || 0;
}

function getItemNumber(product, material) {
  return product?.stullerItemNumber || product?.stuller_item_number || material?.stuller_item_number || null;
}

function getProductLastUpdated(product, material) {
  return product?.lastUpdated || material?.last_price_update || null;
}

/**
 * POST /api/stuller/update-prices
 * Pull fresh stullerPrice values from Stuller API for auto-update materials.
 * Prices are computed at runtime — no cascade to processes or tasks needed.
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

          const stullerPayload = await stullerRequest('/v2/products', {
            method: 'GET',
            query: { SKU: itemNumber },
          });
          const stullerData = normalizeStullerProductResponse(stullerPayload);
          const newPrice = getFetchedPrice(stullerData);
          if (!newPrice) {
            updatedProducts.push(product);
            continue;
          }

          updatedProducts.push({
            stullerItemNumber: product.stullerItemNumber || product.stuller_item_number,
            metalType: product.metalType,
            karat: product.karat,
            stullerPrice: newPrice,
          });
          materialChanged = true;
          variantsUpdated++;

          await new Promise((r) => setTimeout(r, 100));
        }

        if (!materialChanged) {
          continue;
        }

        await materialsCol.updateOne(
          { _id: material._id },
          {
            $set: {
              stullerProducts: updatedProducts,
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

        const stullerPayload = await stullerRequest('/v2/products', {
          method: 'GET',
          query: { SKU: material.stuller_item_number },
        });
        const stullerData = normalizeStullerProductResponse(stullerPayload);
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

    return NextResponse.json({
      success: true,
      message: `Synced ${updated} materials (${variantsUpdated} variants). Prices computed at runtime — no cascade needed.`,
      materialsUpdated: updated,
      variantsUpdated,
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
