/**
 * currency.util.js - Currency conversion utilities
 */

import { roundPrice } from './calculations.util.js';

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
