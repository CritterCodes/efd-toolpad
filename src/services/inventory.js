export const INVENTORY_TRANSACTION_TYPES = {
  RECEIVE: 'receive',
  CONSUME: 'consume',
  ADJUST: 'adjust',
  RETURN: 'return',
};

export const INVENTORY_SOURCE_TYPES = {
  MANUAL: 'manual',
  REPAIR: 'repair',
  STULLER_INVOICE: 'stuller_invoice',
  STULLER_RECEIVE: 'stuller_receive',
};

export const INVENTORY_REORDER_STATUSES = {
  OPEN: 'open',
  DISMISSED: 'dismissed',
  RESOLVED: 'resolved',
};

export const INVENTORY_DEFAULT_UNIT = 'each';

export function roundInventoryQuantity(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

export function coercePositiveQuantity(value, label = 'Quantity') {
  const quantity = roundInventoryQuantity(value);
  if (!(quantity > 0)) {
    const err = new Error(`${label} must be greater than zero.`);
    err.status = 400;
    throw err;
  }
  return quantity;
}

export function normalizeInventoryTransactionType(type = '') {
  return Object.values(INVENTORY_TRANSACTION_TYPES).includes(type)
    ? type
    : INVENTORY_TRANSACTION_TYPES.ADJUST;
}

export function normalizeInventorySourceType(type = '') {
  return Object.values(INVENTORY_SOURCE_TYPES).includes(type)
    ? type
    : INVENTORY_SOURCE_TYPES.MANUAL;
}

export function normalizeReorderStatus(status = '') {
  return Object.values(INVENTORY_REORDER_STATUSES).includes(status)
    ? status
    : INVENTORY_REORDER_STATUSES.OPEN;
}

export function calculateNextOnHand(currentOnHand = 0, quantityDelta = 0) {
  return roundInventoryQuantity(roundInventoryQuantity(currentOnHand) + roundInventoryQuantity(quantityDelta));
}

export function buildLowStockReason(item = {}) {
  return `On hand ${roundInventoryQuantity(item.onHand)} is at or below reorder point ${roundInventoryQuantity(item.reorderPoint)}.`;
}

export function buildSuggestedReorderQuantity(item = {}) {
  const reorderQuantity = roundInventoryQuantity(item.reorderQuantity || 0);
  const deficit = roundInventoryQuantity((item.reorderPoint || 0) - (item.onHand || 0));
  if (reorderQuantity > 0) {
    return reorderQuantity;
  }
  return deficit > 0 ? deficit : 1;
}

export function isLowStock(item = {}) {
  if (item.active === false) return false;
  return roundInventoryQuantity(item.onHand) <= roundInventoryQuantity(item.reorderPoint);
}
