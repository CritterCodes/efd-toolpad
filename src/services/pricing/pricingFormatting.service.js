// src/services/pricing/pricingFormatting.service.js

export class PricingFormattingService {
  /**
   * Format price for display
   * @param {number} price - Price to format
   * @param {string} currency - Currency symbol (default: '$')
   * @returns {string} Formatted price
   */
  static formatPrice(price, currency = '$') {
    if (price === null || price === undefined || isNaN(price)) {
      return `${currency}0.00`;
    }

    return `${currency}${Number(price).toFixed(2)}`;
  }
}
