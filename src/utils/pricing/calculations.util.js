/**
 * calculations.util.js - Pricing stats, modifiers, and breakdowns
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

export function roundPrice(price, precision = 2) {
  if (price === null || price === undefined || isNaN(price)) {
    return null;
  }

  return Math.round(price * Math.pow(10, precision)) / Math.pow(10, precision);
}

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
