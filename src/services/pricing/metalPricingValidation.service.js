// src/services/pricing/metalPricingValidation.service.js
import { MetalContextService } from '../MetalContextService';

export class MetalPricingValidationService {
  /**
   * Validate universal pricing structure
   * @param {Object} universalPricing - Universal pricing object to validate
   * @returns {Object} { isValid, errors, warnings }
   */
  static validateUniversalPricing(universalPricing) {
    const errors = [];
    const warnings = [];

    if (!universalPricing || typeof universalPricing !== 'object') {
      errors.push('Universal pricing must be an object');
      return { isValid: false, errors, warnings };
    }

    const metalKeys = Object.keys(universalPricing);
    if (metalKeys.length === 0) {
      warnings.push('No pricing data found');
    }

    // Validate each metal key and price
    for (const [metalKey, price] of Object.entries(universalPricing)) {
      try {
        MetalContextService.parseMetalKey(metalKey);
      } catch (error) {
        errors.push(`Invalid metal key format: ${metalKey}`);
        continue;
      }

      if (typeof price !== 'number') {
        errors.push(`Price for ${metalKey} must be a number, got ${typeof price}`);
      } else if (isNaN(price)) {
        errors.push(`Price for ${metalKey} is NaN`);
      } else if (price < 0) {
        warnings.push(`Negative price for ${metalKey}: ${price}`);
      } else if (price === 0) {
        warnings.push(`Zero price for ${metalKey}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
