import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';
import { cascadeProcessAndTaskUpdates } from './cascade.service';

function normalizeSku(value) {
  return String(value || '').trim();
}

function parsePriceValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectMatchingProduct(stullerResponse, requestedSku) {
  const normalizedRequested = normalizeSku(requestedSku).toLowerCase();
  const candidates = [];

  if (Array.isArray(stullerResponse)) {
    candidates.push(...stullerResponse);
  } else if (Array.isArray(stullerResponse?.Products)) {
    candidates.push(...stullerResponse.Products);
  } else if (stullerResponse && typeof stullerResponse === 'object') {
    candidates.push(stullerResponse);
  }

  if (candidates.length === 0) return null;

  const getSku = (product) => normalizeSku(
    product?.SKU || product?.sku || product?.ItemNumber || product?.itemNumber
  ).toLowerCase();

  return (
    candidates.find((item) => getSku(item) === normalizedRequested) ||
    candidates.find((item) => getSku(item).includes(normalizedRequested)) ||
    candidates[0]
  );
}

async function fetchStullerPriceBySku(sku, stullerConfig) {
  const itemNumber = normalizeSku(sku);
  if (!itemNumber) {
    throw new Error('Missing SKU/item number for Stuller lookup');
  }

  const requestUrl = `${stullerConfig.apiUrl}/v2/products?SKU=${encodeURIComponent(itemNumber)}`;

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${stullerConfig.username}:${stullerConfig.password}`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'EFD-CRM/1.0'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stuller lookup failed for ${itemNumber}: HTTP ${response.status} ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const product = selectMatchingProduct(payload, itemNumber);

  if (!product) {
    throw new Error(`No product match found for ${itemNumber}`);
  }

  const price =
    parsePriceValue(product?.Price?.Value) ||
    parsePriceValue(product?.price) ||
    parsePriceValue(product?.RetailPrice) ||
    parsePriceValue(product?.ShowcasePrice?.Value);

  if (!price || price <= 0) {
    throw new Error(`No valid Stuller price found for ${itemNumber}`);
  }

  return {
    sku: itemNumber,
    price,
    showcasePrice: parsePriceValue(product?.ShowcasePrice?.Value) || null
  };
}

export async function runMaterialPriceSync(adminSettings = null, options = {}) {
  await db.connect();
  const materialsCollection = await db.dbMaterials();
  const adminCollection = await db.dbAdminSettings();

  const dbSettings =
    (await adminCollection.findOne({ _id: 'repair_task_admin_settings' })) ||
    (await adminCollection.findOne({}));

  if (!dbSettings?.stuller?.enabled) {
    return { status: 400, payload: { error: 'Stuller integration is not enabled' } };
  }

  let stullerPassword = dbSettings.stuller.password;
  if (isDataEncrypted(stullerPassword)) {
    stullerPassword = decryptSensitiveData(stullerPassword);
  }

  const stullerConfig = {
    username: dbSettings.stuller.username,
    password: stullerPassword,
    apiUrl: dbSettings.stuller.apiUrl || 'https://api.stuller.com'
  };

  if (!stullerConfig.username || !stullerConfig.password) {
    return { status: 500, payload: { error: 'Stuller credentials not configured' } };
  }

  const materialMarkup =
    adminSettings?.pricing?.materialMarkup ||
    adminSettings?.materialMarkup ||
    dbSettings?.pricing?.materialMarkup ||
    1.3;
  const forceTaskRecalculation = Boolean(options?.forceTaskRecalculation);

  const materials = await materialsCollection.find({
    isActive: { $ne: false },
    $or: [
      { stuller_item_number: { $exists: true, $nin: [null, ''] } },
      { 'stullerProducts.0': { $exists: true } }
    ]
  }).toArray();

  const priceCache = new Map();
  const failures = [];
  const updateOperations = [];
  const now = new Date();

  const getPrice = async (sku) => {
    const key = normalizeSku(sku);
    if (!key) return null;
    if (priceCache.has(key)) return priceCache.get(key);
    const result = await fetchStullerPriceBySku(key, stullerConfig);
    priceCache.set(key, result);
    return result;
  };

  for (const material of materials) {
    try {
      const setUpdates = { updatedAt: now };
      let anyPriceUpdated = false;

      const portionsPerUnit = Number(material.portionsPerUnit) > 0 ? Number(material.portionsPerUnit) : 1;

      const topLevelSku = normalizeSku(material.stuller_item_number);
      if (topLevelSku) {
        const topLevelPrice = await getPrice(topLevelSku);
        if (topLevelPrice?.price > 0) {
          const baseUnitCost = topLevelPrice.price;
          const markedUpUnitCost = baseUnitCost * materialMarkup;
          setUpdates.stullerPrice = baseUnitCost;
          setUpdates.unitCost = markedUpUnitCost;
          setUpdates.costPerPortion = markedUpUnitCost / portionsPerUnit;
          setUpdates.last_price_update = now;
          setUpdates.auto_update_pricing = true;
          anyPriceUpdated = true;
        }
      }

      if (Array.isArray(material.stullerProducts) && material.stullerProducts.length > 0) {
        const updatedProducts = [];

        for (const product of material.stullerProducts) {
          const sku = normalizeSku(product?.stullerItemNumber || product?.sku);
          if (!sku) {
            updatedProducts.push(product);
            continue;
          }

          const live = await getPrice(sku);
          if (!live?.price || live.price <= 0) {
            updatedProducts.push(product);
            continue;
          }

          const markupRate = Number(product?.markupRate) > 0 ? Number(product.markupRate) : materialMarkup;
          const markedUpPrice = live.price * markupRate;

          updatedProducts.push({
            ...product,
            stullerPrice: live.price,
            markedUpPrice,
            unitCost: markedUpPrice,
            costPerPortion: markedUpPrice / portionsPerUnit,
            lastUpdated: now.toISOString(),
            autoUpdatePricing: true
          });
          anyPriceUpdated = true;
        }

        if (anyPriceUpdated) {
          setUpdates.stullerProducts = updatedProducts;
          setUpdates.last_price_update = now;
          setUpdates.auto_update_pricing = true;
        }
      }

      if (anyPriceUpdated) {
        updateOperations.push({
          updateOne: {
            filter: { _id: material._id },
            update: { $set: setUpdates }
          }
        });
      }
    } catch (materialError) {
      failures.push({
        materialId: String(material._id),
        name: material.displayName || material.name || 'Unknown Material',
        error: materialError.message
      });
    }
  }

  let modifiedCount = 0;
  if (updateOperations.length > 0) {
    const result = await materialsCollection.bulkWrite(updateOperations);
    modifiedCount = result.modifiedCount || 0;
  }

  const { processesUpdated, tasksCascade } = await cascadeProcessAndTaskUpdates({
    materialsCollection,
    dbSettings,
    adminSettings,
    now,
    failures,
    materialSyncUpdated: modifiedCount,
    forceTaskRecalculation
  });

  const noCandidates = materials.length === 0;
  return {
    status: 200,
    payload: {
      success: true,
      candidates: materials.length,
      updated: modifiedCount,
      processesUpdated,
      tasksUpdated: tasksCascade.updated,
      tasksSkipped: tasksCascade.skipped,
      tasksErrors: tasksCascade.errors,
      taskCascadeRan: tasksCascade.ran,
      failed: failures.length,
      failures,
      message: noCandidates
        ? 'No active materials with Stuller SKUs were found to sync.'
        : `Synced ${modifiedCount} materials, cascaded ${processesUpdated} processes, and updated ${tasksCascade.updated} tasks (${failures.length} failed).`
    }
  };
}
