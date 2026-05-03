import InventoryItemsModel from '@/app/api/inventory-items/model';
import InventoryTransactionsModel from '@/app/api/inventory-transactions/model';
import InventoryReorderSuggestionsModel from '@/app/api/inventory-reorder-suggestions/model';
import StullerInvoicesModel from '@/app/api/stullerInvoices/model';
import {
  buildLowStockReason,
  buildSuggestedReorderQuantity,
  calculateNextOnHand,
  coercePositiveQuantity,
  INVENTORY_SOURCE_TYPES,
  INVENTORY_TRANSACTION_TYPES,
  isLowStock,
  roundInventoryQuantity,
} from '@/services/inventory';

function toDateOrNow(value) {
  return value ? new Date(value) : new Date();
}

function buildItemPatch(base = {}) {
  return Object.fromEntries(
    Object.entries(base).filter(([, value]) => value !== undefined)
  );
}

function validateRequiredText(value, label) {
  if (!String(value || '').trim()) {
    const err = new Error(`${label} is required.`);
    err.status = 400;
    throw err;
  }
  return String(value).trim();
}

async function resolveInventoryItem({ inventoryItemID, createItem, createdBy, defaults = {} }) {
  if (inventoryItemID) {
    const existingItem = await InventoryItemsModel.findByInventoryItemID(inventoryItemID);
    if (!existingItem) {
      const err = new Error('Inventory item not found.');
      err.status = 404;
      throw err;
    }
    return existingItem;
  }

  if (!createItem) {
    const err = new Error('Inventory item selection or creation payload is required.');
    err.status = 400;
    throw err;
  }

  const name = validateRequiredText(createItem.name, 'Inventory item name');
  return await InventoryItemsModel.create({
    name,
    category: createItem.category || defaults.category || 'General',
    unitOfMeasure: createItem.unitOfMeasure || defaults.unitOfMeasure,
    onHand: 0,
    reorderPoint: createItem.reorderPoint || 0,
    reorderQuantity: createItem.reorderQuantity || 0,
    preferredVendor: createItem.preferredVendor || defaults.preferredVendor || '',
    vendorSku: createItem.vendorSku || defaults.vendorSku || '',
    linkedMaterialID: createItem.linkedMaterialID || '',
    active: createItem.active !== false,
    location: createItem.location || '',
    notes: createItem.notes || '',
    stullerItemNumber: createItem.stullerItemNumber || defaults.stullerItemNumber || '',
    stullerDescription: createItem.stullerDescription || defaults.stullerDescription || '',
    lastVendorCost: createItem.lastVendorCost || defaults.lastVendorCost || 0,
    createdBy,
  });
}

export async function listInventoryItems({ includeInactive = true } = {}) {
  const filter = includeInactive ? {} : { active: { $ne: false } };
  return await InventoryItemsModel.list(filter);
}

export async function createInventoryItem(data = {}, createdBy = '') {
  validateRequiredText(data.name, 'Inventory item name');
  return await InventoryItemsModel.create({
    ...data,
    onHand: roundInventoryQuantity(data.onHand || 0),
    lastVendorCost: Number(data.lastVendorCost || 0),
    createdBy,
  });
}

export async function updateInventoryItem(inventoryItemID, updateData = {}) {
  const existing = await InventoryItemsModel.findByInventoryItemID(inventoryItemID);
  if (!existing) {
    const err = new Error('Inventory item not found.');
    err.status = 404;
    throw err;
  }

  const patch = buildItemPatch({
    name: updateData.name != null ? String(updateData.name).trim() : undefined,
    category: updateData.category != null ? String(updateData.category).trim() || 'General' : undefined,
    unitOfMeasure: updateData.unitOfMeasure != null ? String(updateData.unitOfMeasure).trim() : undefined,
    reorderPoint: updateData.reorderPoint,
    reorderQuantity: updateData.reorderQuantity,
    preferredVendor: updateData.preferredVendor != null ? String(updateData.preferredVendor).trim() : undefined,
    vendorSku: updateData.vendorSku != null ? String(updateData.vendorSku).trim() : undefined,
    linkedMaterialID: updateData.linkedMaterialID != null ? updateData.linkedMaterialID : undefined,
    active: updateData.active != null ? Boolean(updateData.active) : undefined,
    location: updateData.location != null ? String(updateData.location).trim() : undefined,
    notes: updateData.notes != null ? String(updateData.notes) : undefined,
    stullerItemNumber: updateData.stullerItemNumber != null ? String(updateData.stullerItemNumber).trim() : undefined,
    stullerDescription: updateData.stullerDescription != null ? String(updateData.stullerDescription) : undefined,
    lastVendorCost: updateData.lastVendorCost != null ? Number(updateData.lastVendorCost || 0) : undefined,
  });

  if (patch.name !== undefined) {
    validateRequiredText(patch.name, 'Inventory item name');
  }

  return await InventoryItemsModel.updateByInventoryItemID(inventoryItemID, patch);
}

export async function deleteInventoryItem(inventoryItemID) {
  const txCount = await InventoryTransactionsModel.countForInventoryItem(inventoryItemID);
  if (txCount > 0) {
    const err = new Error('Inventory item has stock history and cannot be deleted.');
    err.status = 409;
    throw err;
  }

  await InventoryItemsModel.deleteByInventoryItemID(inventoryItemID);
}

export async function receiveInventory({
  inventoryItemID = '',
  createItem = null,
  quantityReceived,
  unitCost = 0,
  effectiveDate = null,
  preferredVendor = '',
  vendorSku = '',
  notes = '',
  sourceType = INVENTORY_SOURCE_TYPES.MANUAL,
  sourceReferenceID = '',
  sourceLineReference = '',
  createdBy = '',
  itemDefaults = {},
}) {
  const quantity = coercePositiveQuantity(quantityReceived, 'Received quantity');
  const item = await resolveInventoryItem({
    inventoryItemID,
    createItem,
    createdBy,
    defaults: itemDefaults,
  });

  if (sourceReferenceID && sourceLineReference) {
    const existingReceive = await InventoryTransactionsModel.findBySourceReference({
      sourceType,
      sourceReferenceID,
      sourceLineReference,
      transactionType: INVENTORY_TRANSACTION_TYPES.RECEIVE,
    });
    if (existingReceive) {
      const err = new Error('This source line has already been received into inventory.');
      err.status = 409;
      throw err;
    }
  }

  const transaction = await InventoryTransactionsModel.create({
    inventoryItemID: item.inventoryItemID,
    quantityDelta: quantity,
    transactionType: INVENTORY_TRANSACTION_TYPES.RECEIVE,
    effectiveDate: toDateOrNow(effectiveDate),
    sourceType,
    sourceReferenceID,
    sourceLineReference,
    notes,
    unitCost: Number(unitCost || 0),
    createdBy,
  });

  const nextOnHand = calculateNextOnHand(item.onHand, quantity);
  const updatedItem = await InventoryItemsModel.updateByInventoryItemID(item.inventoryItemID, buildItemPatch({
    onHand: nextOnHand,
    lastVendorCost: Number(unitCost || item.lastVendorCost || 0),
    lastReceivedAt: transaction.effectiveDate,
    preferredVendor: preferredVendor || item.preferredVendor,
    vendorSku: vendorSku || item.vendorSku,
  }));

  return { item: updatedItem, transaction };
}

export async function consumeInventory({
  inventoryItemID,
  quantityConsumed,
  repairID = '',
  effectiveDate = null,
  notes = '',
  createdBy = '',
}) {
  const quantity = coercePositiveQuantity(quantityConsumed, 'Consumed quantity');
  const item = await InventoryItemsModel.findByInventoryItemID(inventoryItemID);
  if (!item) {
    const err = new Error('Inventory item not found.');
    err.status = 404;
    throw err;
  }

  const nextOnHand = calculateNextOnHand(item.onHand, -quantity);
  if (nextOnHand < 0) {
    const err = new Error('Cannot consume more inventory than is currently on hand.');
    err.status = 409;
    throw err;
  }

  const transaction = await InventoryTransactionsModel.create({
    inventoryItemID,
    quantityDelta: -quantity,
    transactionType: INVENTORY_TRANSACTION_TYPES.CONSUME,
    effectiveDate: toDateOrNow(effectiveDate),
    sourceType: INVENTORY_SOURCE_TYPES.REPAIR,
    sourceReferenceID: repairID || '',
    notes,
    createdBy,
  });

  const updatedItem = await InventoryItemsModel.updateByInventoryItemID(inventoryItemID, {
    onHand: nextOnHand,
  });

  return { item: updatedItem, transaction };
}

export async function recordInventoryTransaction({
  inventoryItemID,
  quantityDelta,
  transactionType,
  effectiveDate = null,
  sourceType = INVENTORY_SOURCE_TYPES.MANUAL,
  sourceReferenceID = '',
  notes = '',
  unitCost = 0,
  createdBy = '',
}) {
  const item = await InventoryItemsModel.findByInventoryItemID(inventoryItemID);
  if (!item) {
    const err = new Error('Inventory item not found.');
    err.status = 404;
    throw err;
  }

  const delta = roundInventoryQuantity(quantityDelta || 0);
  if (delta === 0) {
    const err = new Error('Quantity delta cannot be zero.');
    err.status = 400;
    throw err;
  }

  const nextOnHand = calculateNextOnHand(item.onHand, delta);
  if (nextOnHand < 0) {
    const err = new Error('Inventory transaction would drive on-hand below zero.');
    err.status = 409;
    throw err;
  }

  const transaction = await InventoryTransactionsModel.create({
    inventoryItemID,
    quantityDelta: delta,
    transactionType,
    effectiveDate: toDateOrNow(effectiveDate),
    sourceType,
    sourceReferenceID,
    notes,
    unitCost,
    createdBy,
  });

  const updatedItem = await InventoryItemsModel.updateByInventoryItemID(inventoryItemID, {
    onHand: nextOnHand,
    lastVendorCost: delta > 0 && unitCost ? Number(unitCost) : item.lastVendorCost,
    lastReceivedAt: delta > 0 ? transaction.effectiveDate : item.lastReceivedAt,
  });

  return { item: updatedItem, transaction };
}

export async function listInventoryTransactions(filter = {}) {
  return await InventoryTransactionsModel.list(filter);
}

export async function getLowStockItems() {
  const items = await InventoryItemsModel.list({ active: { $ne: false } });
  return items
    .filter((item) => isLowStock(item))
    .map((item) => ({
      ...item,
      lowStockReason: buildLowStockReason(item),
      suggestedQty: buildSuggestedReorderQuantity(item),
    }));
}

export async function listReorderSuggestions(filter = {}) {
  return await InventoryReorderSuggestionsModel.list(filter);
}

export async function generateReorderSuggestions({ inventoryItemIDs = [], createdBy = '' } = {}) {
  const lowStockItems = await getLowStockItems();
  const targets = inventoryItemIDs.length > 0
    ? lowStockItems.filter((item) => inventoryItemIDs.includes(item.inventoryItemID))
    : lowStockItems;

  const results = [];
  for (const item of targets) {
    const existingOpen = await InventoryReorderSuggestionsModel.findOpenByInventoryItemID(item.inventoryItemID);
    if (existingOpen) {
      results.push(existingOpen);
      continue;
    }

    const suggestion = await InventoryReorderSuggestionsModel.create({
      inventoryItemID: item.inventoryItemID,
      suggestedQty: buildSuggestedReorderQuantity(item),
      reason: buildLowStockReason(item),
      status: 'open',
      vendorSnapshot: {
        preferredVendor: item.preferredVendor || '',
        vendorSku: item.vendorSku || '',
        stullerItemNumber: item.stullerItemNumber || '',
        lastVendorCost: Number(item.lastVendorCost || 0),
      },
      createdBy,
    });
    results.push(suggestion);
  }

  return results;
}

export async function receiveStullerInvoice({
  invoiceId,
  lineReceipts = [],
  createdBy = '',
}) {
  const invoice = await StullerInvoicesModel.findByID(invoiceId);
  if (!invoice) {
    const err = new Error('Stuller invoice not found.');
    err.status = 404;
    throw err;
  }

  if (!Array.isArray(lineReceipts) || lineReceipts.length === 0) {
    const err = new Error('At least one Stuller line receipt is required.');
    err.status = 400;
    throw err;
  }

  const invoiceItems = Array.isArray(invoice.items) ? invoice.items : [];
  const results = [];
  for (const lineReceipt of lineReceipts) {
    const sourceLineReference = String(lineReceipt.sourceLineReference || lineReceipt.lineNumber || '').trim();
    const invoiceItem = invoiceItems.find((item, index) => {
      const lineMatch = String(item.lineNumber || index + 1) === sourceLineReference;
      const itemNumberMatch = lineReceipt.itemNumber && item.itemNumber === lineReceipt.itemNumber;
      return lineMatch || itemNumberMatch;
    });

    if (!invoiceItem) {
      const err = new Error(`Stuller invoice line ${sourceLineReference || lineReceipt.itemNumber || ''} was not found.`);
      err.status = 404;
      throw err;
    }

    const quantityReceived = lineReceipt.quantityReceived ?? lineReceipt.shipQuantity ?? invoiceItem.shipQuantity ?? 0;
    const unitCost = lineReceipt.unitCost ?? invoiceItem.unitPrice ?? 0;

    const receiveResult = await receiveInventory({
      inventoryItemID: lineReceipt.inventoryItemID || '',
      createItem: lineReceipt.createItem || null,
      quantityReceived,
      unitCost,
      effectiveDate: lineReceipt.effectiveDate || invoice.invoiceDate || new Date(),
      preferredVendor: 'Stuller',
      vendorSku: invoiceItem.itemNumber || '',
      notes: lineReceipt.notes || `Received from Stuller invoice ${invoice.invoiceNumber || invoice.stullerInvoiceID}`,
      sourceType: INVENTORY_SOURCE_TYPES.STULLER_INVOICE,
      sourceReferenceID: invoice.stullerInvoiceID,
      sourceLineReference: sourceLineReference || String(invoiceItem.lineNumber || ''),
      createdBy,
      itemDefaults: {
        category: 'Materials / Parts',
        preferredVendor: 'Stuller',
        vendorSku: invoiceItem.itemNumber || '',
        stullerItemNumber: invoiceItem.itemNumber || '',
        stullerDescription: invoiceItem.itemDescription || '',
        lastVendorCost: Number(unitCost || 0),
      },
    });

    results.push({
      ...receiveResult,
      invoiceItem,
    });
  }

  return { invoice, receipts: results };
}
