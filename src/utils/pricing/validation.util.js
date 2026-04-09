/**
 * validation.util.js - Price parsing and validation utilities
 */

export function parsePrice(priceString) {
  if (typeof priceString !== 'string') {
    return Number(priceString);
  }

  // Remove currency symbols and whitespace
  const cleaned = priceString.replace(/[$£€¥₹,\s]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function validatePrice(price) {
  if (price === null || price === undefined) {
    return { valid: false, error: 'Price is required' };
  }

  const numPrice = Number(price);

  if (isNaN(numPrice)) {
    return { valid: false, error: 'Price must be a valid number' };
  }

  if (numPrice < 0) {
    return { valid: false, error: 'Price cannot be negative' };
  }

  if (numPrice > 999999.99) {
    return { valid: false, error: 'Price is too large' };
  }

  return { valid: true, value: numPrice };
}

export function getPriceTier(price, tiers = []) {
  if (price === null || price === undefined || isNaN(price)) {
    return null;
  }

  if (tiers.length === 0) {
    // Default tiers
    if (price <= 50) return 'low';
    if (price <= 200) return 'medium';
    if (price <= 500) return 'high';
    return 'premium';
  }

  for (let i = 0; i < tiers.length; i++) {
    if (price <= tiers[i].max) {
      return tiers[i].name;
    }
  }

  return tiers[tiers.length - 1].name;
}
