// src/services/pricing/metalPricingAccess.service.js
import { MetalContextService } from '../MetalContextService';
import { PricingFormattingService } from './pricingFormatting.service';

export class MetalPricingAccessService {
  /**
   * Get price for specific metal context from universal pricing
   * @param {Object} universalPricing - Universal pricing object
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @returns {number|null} Price or null if not found
   */
  static getPriceForMetal(universalPricing, metalType, karat) {
    if (!universalPricing || typeof universalPricing !== 'object') {
      return null;
    }

    try {
      const metalKey = MetalContextService.formatMetalKey(metalType, karat);
      const price = universalPricing[metalKey];
      
      return typeof price === 'number' && !isNaN(price) ? price : null;
    } catch {
      return null;
    }
  }

  /**
   * Get formatted price for specific metal context
   * @param {Object} universalPricing - Universal pricing object
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @param {string} currency - Currency symbol
   * @returns {string} Formatted price or 'N/A'
   */
  static getFormattedPriceForMetal(universalPricing, metalType, karat, currency = '$') {
    const price = this.getPriceForMetal(universalPricing, metalType, karat);
    return price !== null ? PricingFormattingService.formatPrice(price, currency) : 'N/A';
  }

  /**
   * Check if pricing is available for metal context
   * @param {Object} universalPricing - Universal pricing object
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @returns {boolean} True if pricing available
   */
  static hasPricingForMetal(universalPricing, metalType, karat) {
    return this.getPriceForMetal(universalPricing, metalType, karat) !== null;
  }
}
