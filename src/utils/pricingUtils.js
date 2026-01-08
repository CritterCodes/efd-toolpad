/**
 * pricingUtils.js - Price formatting and display utilities
 * 
 * Utility functions for formatting prices, calculating ranges, and handling
 * currency conversion for universal pricing display.
 */

/**
 * Format price for display with currency symbol
 */
export function formatPrice(price, options = {}) {
  const {
    currency = '$',
    decimals = 2,
    showZero = true,
    nullText = 'N/A'
  } = options;

  if (price === null || price === undefined) {
    return nullText;
  }

  if (isNaN(price)) {
    return nullText;
  }

  if (price === 0 && !showZero) {
    return nullText;
  }

  const formattedNumber = Number(price).toFixed(decimals);
  return `${currency}${formattedNumber}`;
}

/**
 * Format price range 
 */
export function formatPriceRange(minPrice, maxPrice, options = {}) {
  const {
    currency = '$',
    decimals = 2,
    separator = ' - ',
    sameText = null
  } = options;

  if (minPrice === null || maxPrice === null || isNaN(minPrice) || isNaN(maxPrice)) {
    return 'N/A';
  }

  const formattedMin = formatPrice(minPrice, { currency, decimals });
  const formattedMax = formatPrice(maxPrice, { currency, decimals });

  if (minPrice === maxPrice && sameText) {
    return formattedMin;
  }

  return `${formattedMin}${separator}${formattedMax}`;
}

/**
 * Calculate percentage difference between prices
 */
export function calculatePricePercentage(price1, price2) {
  if (price1 === null || price2 === null || isNaN(price1) || isNaN(price2)) {
    return null;
  }

  if (price1 === 0) {
    return price2 === 0 ? 0 : Infinity;
  }

  return ((price2 - price1) / price1) * 100;
}

/**
 * Format percentage with sign
 */
export function formatPercentage(percentage, options = {}) {
  const {
    decimals = 1,
    showSign = true,
    nullText = 'N/A'
  } = options;

  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return nullText;
  }

  if (percentage === Infinity) {
    return '∞%';
  }

  const sign = showSign && percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}

/**
 * Parse price from string
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

/**
 * Validate price value
 */
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

/**
 * Calculate pricing statistics from array of prices
 */
export function calculatePriceStats(prices, options = {}) {
  const {
    excludeZero = false,
    excludeNull = true
  } = options;

  let validPrices = prices.filter(price => {
    if (excludeNull && (price === null || price === undefined)) return false;
    if (excludeZero && price === 0) return false;
    return !isNaN(price);
  });

  if (validPrices.length === 0) {
    return {
      min: null,
      max: null,
      average: null,
      median: null,
      count: 0,
      total: null
    };
  }

  validPrices.sort((a, b) => a - b);

  const min = validPrices[0];
  const max = validPrices[validPrices.length - 1];
  const total = validPrices.reduce((sum, price) => sum + price, 0);
  const average = total / validPrices.length;
  
  const median = validPrices.length % 2 === 0
    ? (validPrices[validPrices.length / 2 - 1] + validPrices[validPrices.length / 2]) / 2
    : validPrices[Math.floor(validPrices.length / 2)];

  return {
    min,
    max,
    average,
    median,
    count: validPrices.length,
    total
  };
}

/**
 * Round price to nearest cent
 */
export function roundPrice(price, precision = 2) {
  if (price === null || price === undefined || isNaN(price)) {
    return null;
  }

  return Math.round(price * Math.pow(10, precision)) / Math.pow(10, precision);
}

/**
 * Apply price markup/discount
 */
export function applyPriceModifier(price, modifier, type = 'multiply') {
  if (price === null || price === undefined || isNaN(price)) {
    return null;
  }

  if (modifier === null || modifier === undefined || isNaN(modifier)) {
    return price;
  }

  let result;

  switch (type) {
    case 'multiply':
      result = price * modifier;
      break;
    case 'add':
      result = price + modifier;
      break;
    case 'subtract':
      result = price - modifier;
      break;
    case 'percentage':
      result = price * (1 + modifier / 100);
      break;
    default:
      result = price;
  }

  return roundPrice(result);
}

/**
 * Compare prices with tolerance
 */
export function comparePrices(price1, price2, tolerance = 0.01) {
  if (price1 === null || price2 === null) {
    return price1 === price2 ? 0 : null;
  }

  if (isNaN(price1) || isNaN(price2)) {
    return null;
  }

  const difference = Math.abs(price1 - price2);
  
  if (difference <= tolerance) {
    return 0; // Equal
  }

  return price1 > price2 ? 1 : -1;
}

/**
 * Get price tier/category
 */
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

/**
 * Format compact price (K, M notation)
 */
export function formatCompactPrice(price, options = {}) {
  const {
    currency = '$',
    decimals = 1
  } = options;

  if (price === null || price === undefined || isNaN(price)) {
    return 'N/A';
  }

  if (price < 1000) {
    return formatPrice(price, { currency, decimals: 0 });
  }

  if (price < 1000000) {
    return `${currency}${(price / 1000).toFixed(decimals)}K`;
  }

  return `${currency}${(price / 1000000).toFixed(decimals)}M`;
}

/**
 * Create price breakdown object
 */
export function createPriceBreakdown(basePrice, modifiers = {}) {
  const breakdown = {
    base: basePrice,
    modifiers: {},
    total: basePrice
  };

  let runningTotal = basePrice;

  for (const [name, modifier] of Object.entries(modifiers)) {
    if (modifier.type === 'percentage') {
      const amount = basePrice * (modifier.value / 100);
      breakdown.modifiers[name] = {
        ...modifier,
        amount: roundPrice(amount)
      };
      runningTotal += amount;
    } else if (modifier.type === 'fixed') {
      breakdown.modifiers[name] = {
        ...modifier,
        amount: modifier.value
      };
      runningTotal += modifier.value;
    }
  }

  breakdown.total = roundPrice(runningTotal);
  return breakdown;
}

/**
 * Currency conversion (placeholder for future implementation)
 */
export function convertCurrency(amount, fromCurrency, toCurrency, exchangeRate = null) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Placeholder - would integrate with real exchange rate API
  if (exchangeRate) {
    return roundPrice(amount * exchangeRate);
  }

  // Default: return original amount
  return amount;
}
