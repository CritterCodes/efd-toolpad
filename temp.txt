/**
 * PricingService.js - Pricing calculation utilities and formatting
 * 
 * Handles pricing calculations, formatting, and analysis for tasks with universal pricing.
 * Provides utilities for working with pricing data across different metal contexts.
 */

import { MetalContextService } from './MetalContextService';

export class PricingService {
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

  /**
   * Calculate pricing statistics from universal pricing object
   * @param {Object} universalPricing - Universal pricing object { gold_14k: 100, silver_sterling: 50 }
   * @returns {Object} Statistics { min, max, average, count, metalBreakdown }
   */
  static calculatePricingStats(universalPricing) {
    if (!universalPricing || typeof universalPricing !== 'object') {
      return {
        min: 0,
        max: 0,
        average: 0,
        count: 0,
        metalBreakdown: []
      };
    }

    const prices = Object.values(universalPricing).filter(price => 
      typeof price === 'number' && !isNaN(price) && price >= 0
    );

    if (prices.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        count: 0,
        metalBreakdown: []
      };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Create metal breakdown with display names
    const metalBreakdown = Object.entries(universalPricing)
      .filter(([, price]) => typeof price === 'number' && !isNaN(price) && price >= 0)
      .map(([metalKey, price]) => {
        try {
          const { metalType, karat } = MetalContextService.parseMetalKey(metalKey);
          return {
            metalKey,
            metalType,
            karat,
            displayName: MetalContextService.getDisplayName(metalType, karat),
            price,
            formattedPrice: this.formatPrice(price)
          };
        } catch (error) {
          console.warn(`Invalid metal key in pricing: ${metalKey}`);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => MetalContextService.sortByPreference([a, b]));

    return {
      min,
      max,
      average,
      count: prices.length,
      metalBreakdown,
      formattedMin: this.formatPrice(min),
      formattedMax: this.formatPrice(max),
      formattedAverage: this.formatPrice(average)
    };
  }

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
    return price !== null ? this.formatPrice(price, currency) : 'N/A';
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

  /**
   * Get supported metals from universal pricing object
   * @param {Object} universalPricing - Universal pricing object
   * @returns {Array} Array of supported metal contexts
   */
  static getSupportedMetalsFromPricing(universalPricing) {
    if (!universalPricing || typeof universalPricing !== 'object') {
      return [];
    }

    return Object.keys(universalPricing)
      .filter(metalKey => {
        const price = universalPricing[metalKey];
        return typeof price === 'number' && !isNaN(price) && price >= 0;
      })
      .map(metalKey => {
        try {
          const { metalType, karat } = MetalContextService.parseMetalKey(metalKey);
          return {
            metalType,
            karat,
            metalKey,
            displayName: MetalContextService.getDisplayName(metalType, karat),
            price: universalPricing[metalKey],
            formattedPrice: this.formatPrice(universalPricing[metalKey])
          };
        } catch (error) {
          console.warn(`Invalid metal key in pricing: ${metalKey}`);
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Calculate price difference between two metal contexts
   * @param {Object} universalPricing - Universal pricing object
   * @param {string} metalType1 - First metal type
   * @param {string} karat1 - First karat
   * @param {string} metalType2 - Second metal type
   * @param {string} karat2 - Second karat
   * @returns {Object} { difference, percentage, formatted }
   */
  static calculatePriceDifference(universalPricing, metalType1, karat1, metalType2, karat2) {
    const price1 = this.getPriceForMetal(universalPricing, metalType1, karat1);
    const price2 = this.getPriceForMetal(universalPricing, metalType2, karat2);

    if (price1 === null || price2 === null) {
      return {
        difference: null,
        percentage: null,
        formatted: 'N/A'
      };
    }

    const difference = price2 - price1;
    const percentage = price1 > 0 ? (difference / price1) * 100 : 0;

    return {
      difference,
      percentage,
      formatted: `${difference >= 0 ? '+' : ''}${this.formatPrice(difference)}`
    };
  }

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

  /**
   * Create price comparison table data
   * @param {Array} tasks - Array of tasks with universal pricing
   * @param {string} metalType - Metal type for comparison
   * @param {string} karat - Karat for comparison
   * @returns {Array} Comparison table data
   */
  static createPriceComparisonTable(tasks, metalType, karat) {
    if (!Array.isArray(tasks)) {
      return [];
    }

    return tasks
      .map(task => {
        const price = this.getPriceForMetal(task.pricing, metalType, karat);
        return {
          taskId: task._id,
          taskName: task.name,
          price,
          formattedPrice: price !== null ? this.formatPrice(price) : 'N/A',
          hasPrice: price !== null
        };
      })
      .sort((a, b) => {
        // Sort by price (available prices first, then by amount)
        if (a.hasPrice && !b.hasPrice) return -1;
        if (!a.hasPrice && b.hasPrice) return 1;
        if (!a.hasPrice && !b.hasPrice) return a.taskName.localeCompare(b.taskName);
        return a.price - b.price;
      });
  }

  /**
   * Calculate total cost for multiple tasks in specific metal context
   * @param {Array} tasks - Array of tasks with universal pricing
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @returns {Object} { total, formattedTotal, breakdown }
   */
  static calculateTotalCost(tasks, metalType, karat) {
    if (!Array.isArray(tasks)) {
      return {
        total: 0,
        formattedTotal: this.formatPrice(0),
        breakdown: []
      };
    }

    let total = 0;
    const breakdown = [];

    for (const task of tasks) {
      const price = this.getPriceForMetal(task.pricing, metalType, karat);
      if (price !== null) {
        total += price;
        breakdown.push({
          taskId: task._id,
          taskName: task.name,
          price,
          formattedPrice: this.formatPrice(price)
        });
      } else {
        breakdown.push({
          taskId: task._id,
          taskName: task.name,
          price: null,
          formattedPrice: 'N/A'
        });
      }
    }

    return {
      total,
      formattedTotal: this.formatPrice(total),
      breakdown
    };
  }
}
