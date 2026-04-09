// src/services/pricing/metalPricingAnalysis.service.js
import { MetalContextService } from '../MetalContextService';
import { PricingFormattingService } from './pricingFormatting.service';
import { MetalPricingAccessService } from './metalPricingAccess.service';

export class MetalPricingAnalysisService {
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
            formattedPrice: PricingFormattingService.formatPrice(price)
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
      formattedMin: PricingFormattingService.formatPrice(min),
      formattedMax: PricingFormattingService.formatPrice(max),
      formattedAverage: PricingFormattingService.formatPrice(average)
    };
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
            formattedPrice: PricingFormattingService.formatPrice(universalPricing[metalKey])
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
    const price1 = MetalPricingAccessService.getPriceForMetal(universalPricing, metalType1, karat1);
    const price2 = MetalPricingAccessService.getPriceForMetal(universalPricing, metalType2, karat2);

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
      formatted: `${difference >= 0 ? '+' : ''}${PricingFormattingService.formatPrice(difference)}`
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
        const price = MetalPricingAccessService.getPriceForMetal(task.pricing, metalType, karat);
        return {
          taskId: task._id,
          taskName: task.name,
          price,
          formattedPrice: price !== null ? PricingFormattingService.formatPrice(price) : 'N/A',
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
        formattedTotal: PricingFormattingService.formatPrice(0),
        breakdown: []
      };
    }

    let total = 0;
    const breakdown = [];

    for (const task of tasks) {
      const price = MetalPricingAccessService.getPriceForMetal(task.pricing, metalType, karat);
      if (price !== null) {
        total += price;
        breakdown.push({
          taskId: task._id,
          taskName: task.name,
          price,
          formattedPrice: PricingFormattingService.formatPrice(price)
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
      formattedTotal: PricingFormattingService.formatPrice(total),
      breakdown
    };
  }
}
